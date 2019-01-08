import { Err, Result, indent, indentNext } from "./result";

export abstract class Type<T> {
  abstract check(val: any): Result<T>;

  assert(val: any): T {
    return assert(this.check(val), this, val);
  }

  slice(val: any): T {
    return assert(this.sliceResult(val), this, val);
  }

  /**
   * Use as a type guard.
   *
   * @example
   *   const FooChecker: t.Type<T> = ...
   *   if (FooChecker.guard(val)) {
   *     // in this scope, val has type T
   *   }
   */
  guard(val: any): val is T {
    const result = this.sliceResult(val);
    return !(result instanceof Err)
  }

  /**
   * Typescript helper that enforces the correct declaration of a value with no
   * overhead.
   *
   * @example
   * const User = t.subtype({ name: t.str, email: t.str })
   * const myUser = User.({ dog: 'cow' }) // Typescript compile error
   */
  literal(val: T): T {
    return val;
  }

  abstract toString(): string

  /*
   * Default slice implementation just calls `check`. Override this as necessary.
   */
  sliceResult(val: any): Result<T> {
    return this.check(val);
  }

  /*
   * Type algebra
   * -----------------------------------------------------------------------------------------------
   */

  and<R>(r: Type<R>): Type<T&R> {
    return new Intersect(this, r);
  }

  or<R>(r: Type<R>): Type<T|R> {
    return new Either(this, r);
  }

  /*
   * Custom validators
   * -----------------------------------------------------------------------------------------------
   */

  validate(desc: string, fn: Validator<T>): Type<T> {
    return this.and(new Validation(desc, fn));
  }

  protected err<_>(msg: string | tostr, value: any): Err<_> {
    return new Err<_>(msg, {
      value,
      type: this,
    })
  }
}
type tostr = () => string

function assert<T>(result: Result<T>, type: Type<T>, value: any): T {
  if(result instanceof Err) {
    if (result.path.length) {
      const final = Err.combine([result], { type, value })
      throw final.toError();
    }
    throw result.toError();
  }
  return result;
}

/*
 * Type operators
 * -------------------------------------------------------------------------------------------------
 *
 * These are types that operate on types, and are exposed in a fluent-style API on all Type objects.
 * To avoid circular dependency issues with module resolution, we keep them in this file, because
 * the Type class needs access to them in able to return them, but they also need access to the Type
 * class in order to extend it (since they themselves are Types).
 */


/*
 * ### Validation
 *
 * A type that runs validation functions and errors if they return false, or passes if they return
 * true.
 */

export type Validator<T> = (val: T) => boolean;

export class Validation<T> extends Type<T> {
  readonly desc: string;
  readonly validator: Validator<T>;

  constructor(desc: string, fn: Validator<T>) {
    super();
    this.desc = desc;
    this.validator = fn;
  }

  check(val: any): Result<T> {
    try {
      if(this.validator(val)) return val;
    } catch(e) {
      return this.err(`validation error: ${e}`, val);
    }

    return this.err(`failed validation`, val);
  }

  toString() {
    return `validate(${this.desc}, ${this.validator})`
  }
}

/*
 * Base key tracking type
 * -------------------------------------------------------------------------------------------------
 *
 * Types that operate on and track specific keys in objects have shared functionality surrounding
 * keeping track of those keys, making sure that exactness checks are run correctly, and that the
 * keys are sliced when `.slice` is called. This base class implements that behavior, and provides
 * an abstract `checkTrackKeys` method as an extension point for subclasses to implement, as opposed
 * to implementing `check` directly from the base Type class.
 */

export type KeyTrack<T> = {
  // The value being checked
  val: T;

  /*
   * The set of known keys discovered so far. For example, for a struct defined as:
   *
   *     t.subtype({ hello: t.str })
   *
   * The known keys would be `[ "hello" ]`.
   *
   * For non-record types, the known keys will be null, since they don't have a known set of keys.
   */
  knownKeys: string[] | null;

  // Whether or not the keys should be an exhaustive list of all possible keys ("exact"), or whether
  // they're a subset of keys ("subtype"). If true, it's exhaustive; otherwise, it's a subset.
  exact: boolean;
}

export type KeyTrackResult<T> = Err<T> | KeyTrack<T>;

export abstract class KeyTrackingType<T> extends Type<T> {
  // Extension point for subclasses
  abstract checkTrackKeys(val: any): KeyTrackResult<T>;

  /*
   * Default implementation of `check` for this class. Do not reimplement this! Instead, implement
   * `checkTrackKeys`, so that algebraic data types correctly understand how to slice and intersect
   * your keys.
   */
  check(val: any): Result<T> {
    const result = this.checkTrackKeys(val);
    if(result instanceof Err) return result;

    return exactError(val, result, this) || result.val;
  }

  /*
   * Default implementation of `sliceResult` for this class. Do not reimplement this! Instead,
   * implement `checkTrackKeys`, so that algebraic data types correctly understand how to slice and
   * intersect your keys.
   */
  sliceResult(val: any): Result<T> {
    const result = this.checkTrackKeys(val);
    if(result instanceof Err) return result;

    const err = exactError(val, result, this);
    if(err) return err;

    if(result.knownKeys == null) return result.val;

    // If we got this far, it's satisfying a type that explicitly tracks keys. Slice the object to
    // just the known set of keys.
    const sliced: { [key: string]: any } = {};
    for(const key of result.knownKeys) {
      // only copy keys that exist.
      // our type-checking already disallows {} fitting { foo: t.undef }
      // because foo is missing, so this can't produce invalid results.
      if (key in val) {
        sliced[key] = val[key];
      }
    }

    return sliced as T;
  }
}

/*
 * Either
 * -------------------------------------------------------------------------------------------------
 *
 * A union type. Extends the KeyTrackingType since it may need to track its children's keys, if the
 * children are themselves doing key tracking.
 */

export class Either<L, R> extends KeyTrackingType<L|R> {
  readonly l: Type<L>;
  readonly r: Type<R>;

  constructor(l: Type<L>, r: Type<R>) {
    super();
    this.l = l;
    this.r = r;
  }

  checkTrackKeys(val: any): KeyTrackResult<L|R> {
    const l = checkTrackKeys(this.l, val);
    if(!(l instanceof Err)) return l;
    const r = checkTrackKeys(this.r, val);
    if(!(r instanceof Err)) return r;

    let causes: Err<L|R>[] = []
    if (this.l instanceof Either) {
      causes = causes.concat(l.causes)
    } else {
      causes.push(this.rebase(l, this.l, val))
    }
    if (this.r instanceof Either) {
      causes = causes.concat(r.causes)
    } else {
      causes.push(this.rebase(r, this.r, val))
    }

    const msg = () => {
      let lines = [`matched none of ${causes.length} types:`]
      causes.forEach(err => {
        lines.push(`| ${indentNext('   ', err.type.toString())}`)
        lines.push(indent('    ', err.message))
      })
      return lines.join("\n")
    }

    const err = this.err(msg, val)
    err.causes = causes
    return err
  }

  toString(): string {
    const l = this.l instanceof Intersect ?
     `(${this.l})` : this.l
    const r = this.r instanceof Intersect ?
      `(${this.r})` : this.r
    return `${l} | ${r}`
  }

  // "rebase" an error to have the given type. If the error does not have that
  // type currently, produce a new one with the original error type displayed
  // in the string and as a cause.
  //
  // The messages here will never be converted to a StructuralError. Instead they're
  // going to be nested into the error returned from this Either.
  private rebase<_>(err: Err<_>, type: Type<any>, value: any): Err<_> {
    if (err.type === type && err.path.length === 0) {
      return err
    }
    return new Err<_>(() => err.toString(), {
      type,
      value,
      causes: [err],
    })
  }
}

/*
 * Intersect
 * -------------------------------------------------------------------------------------------------
 *
 * An intersection type. Extends the KeyTrackingType since it may need to track its children's keys,
 * if the children are themselves doing key tracking.
 */

export class Intersect<L, R> extends KeyTrackingType<L&R> {
  readonly left: Type<L>;
  readonly r: Type<R>;

  constructor(l: Type<L>, r: Type<R>) {
    super();

    this.left = l;
    this.r = r;
  }

  checkTrackKeys(val: any): KeyTrackResult<L&R> {
    const l = checkTrackKeys(this.left, val);
    const r = checkTrackKeys(this.r, val);

    if((l instanceof Err) && (r instanceof Err)) {
      let causes: Err<L&R>[] = []
      if (this.left instanceof Intersect) {
        causes = causes.concat(l.causes)
      } else {
        causes.push(l)
      }
      if (this.r instanceof Intersect) {
        causes = causes.concat(r.causes)
      } else {
        causes.push(r)
      }
      const err = this.err(() => `failed checks:\n${causes.join("\n")}`, val)
      err.causes = causes
      return err
    }
    if(l instanceof Err) return l;
    if(r instanceof Err) return r;

    let knownKeys = null;
    if(l.knownKeys && r.knownKeys) {
      knownKeys = l.knownKeys.concat(r.knownKeys);
    }

    return {
      knownKeys,
      val: val as L&R,
      exact: l.exact && r.exact,
    }
  }

  toString() {
    const l = this.left instanceof Either ?
     `(${this.left})` : this.left
    const r = this.r instanceof Either ?
      `(${this.r})` : this.r
    return `${l} & ${r}`
  }
}

/*
 * ### Key tracking helpers
 */

/*
 * Given a type and a value, safely check it, returning a KeyTrackResult for it. This function works
 * regardless of whether or not the underlying type is a KeyTrackingType.
 */
function checkTrackKeys<T>(check: Type<T>, val: any): KeyTrackResult<T> {
  if(check instanceof KeyTrackingType) {
    return check.checkTrackKeys(val);
  }

  const result = check.check(val);
  if(result instanceof Err) return result;

  return {
    val: result,
    knownKeys: null,
    exact: false,
  };
}

export class Never extends Type<never> {
  check(val: any): Result<never> {
    return this.err('never values cannot occur', val)
  }

  toString() {
    return 'never'
  }
}

export const never = new Never();

/*
 * Given a value and a KeyTrack result, either return a nice error message if it fails exactness
 * checking, or return undefined if there is no error.
 */
export function exactError<T>(val: any, result: KeyTrack<T>, t: Type<any>): Err<T> | undefined {
  if(result.exact) {
    const errs: Err<any>[] = [];
    const allowed = new Set(result.knownKeys);
    for(const prop in val) {
      if(!allowed.has(prop)) {
        errs.push(
          new Err(() => `unknown key \`${prop}\` should not exist`, {
            value: val[prop],
            // this lie so we don't have a circular import
            // from checks.
            type: never,
            path: [prop]
          })
        )
      }
    }

    if (errs.length === 1) {
      return errs[0]
    }

    if(errs.length > 1) {
      return Err.combine(errs, {
        value: val,
        type: t,
      })
    }
  }
  return undefined
}
