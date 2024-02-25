import { Err, Result } from "./result";

export abstract class Type<T> {
  abstract check(val: any): Result<T>;

  assert(val: any): T {
    return assert(this.check(val));
  }

  slice(val: any): T {
    return assert(this.sliceResult(val));
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

  // The default intersection. Override this for mergeable types.
  and<R>(r: Type<R>): Type<T&R> {
    if(r instanceof CustomCommutativeAndType) return r.and(this);
    return new DefaultIntersect(this, r);
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

  /*
   * Comments, for nice TypeScript exporting
   * -----------------------------------------------------------------------------------------------
   */

  comment(comment: string): Type<T> {
    return new Comment(comment, this);
  }
}


function assert<T>(result: Result<T>): T {
  if(result instanceof Err) throw result.toError();
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
 * Class to extend for custom .and functions -- other classes are aware of this class and will use
 * it as an indication to switch to the custom .and
 */

export abstract class CustomCommutativeAndType<T> extends Type<T> {
}

/*
 * ### Comment
 *
 * A type that delegates to the given type, but adds a comment when converted to TypeScript
 */

export class Comment<T> extends CustomCommutativeAndType<T> {
  constructor(readonly commentStr: string, readonly wrapped: Type<T>) {
    super();
  }

  check(val: any): Result<T> {
    return this.wrapped.check(val);
  }

  sliceResult(val: any): Result<T> {
    return this.wrapped.sliceResult(val);
  }

  and<R>(t: Type<R>): Type<T & R> {
    return new Comment(
      this.commentStr,
      this.wrapped.and(t),
    );
  }
}

/*
 * ### Validation
 *
 * A type that runs validation functions and errors if they return false, or passes if they return
 * true.
 *
 * This class is the sole operator that doesn't extend CustomCommutativeAndType, since there's no
 * way to automatically intersect validation types with anything else -- they don't wrap a real
 * type, they wrap arbitrary functions.
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
      return new Err(`Validation \`${this.desc}\` threw an error: ${e}`);
    }

    return new Err(`Failed validation: ${this.desc}`);
  }
}


/*
 * Either
 * -------------------------------------------------------------------------------------------------
 *
 * A union type. Extends the KeyTrackingType since it may need to track its children's keys, if the
 * children are themselves doing key tracking.
 */

export class Either<L, R> extends CustomCommutativeAndType<L|R> {
  readonly l: Type<L>;
  readonly r: Type<R>;

  constructor(l: Type<L>, r: Type<R>) {
    super();
    this.l = l;
    this.r = r;
  }

  check(val: any): Result<L|R> {
    const l = this.l.check(val);
    if(!(l instanceof Err)) return l;
    const r = this.r.check(val);
    if(!(r instanceof Err)) return r;
    return new Err(`${val} failed the following checks:\n${l.message}\n${r.message}`);
  }

  sliceResult(val: any): Result<L|R> {
    const l = this.l.sliceResult(val);
    if(!(l instanceof Err)) return l;
    const r = this.r.sliceResult(val);
    if(!(r instanceof Err)) return r;
    return new Err(`${val} failed the following checks:\n${l.message}\n${r.message}`);
  }

  and<T>(type: Type<T>): Type<(L|R) & T> {
    return new Either(
      this.l.and(type),
      this.r.and(type),
    );
  }
}

/*
 * Intersect
 * -------------------------------------------------------------------------------------------------
 *
 * The default intersection type for types. Note that this isn't used for mergeable types, which
 * need to provide their own definition for .and
 */

export class DefaultIntersect<L, R> extends CustomCommutativeAndType<L&R> {
  constructor(readonly l: Type<L>, readonly r: Type<R>) {
    super();
  }

  check(val: any): Result<L&R> {
    const l = this.l.check(val);
    if(l instanceof Err) return l;
    const r = this.r.check(val);
    if(r instanceof Err) return r;
    return val as L&R;
  }

  sliceResult(val: any): Result<L&R> {
    const l = this.l.sliceResult(val);
    if(l instanceof Err) return l;
    const r = this.r.sliceResult(l);
    if(r instanceof Err) return r;
    return r as L&R;
  }

  and<T>(type: Type<T>): Type<L & R & T> {
    return new DefaultIntersect(
      this.l.and(type),
      this.r.and(type),
    );
  }
}
