import { Err, Result } from "./result";
import { unionIssue } from "./issue";
import { RuntimeType, runtimeTypeOf } from "./issues/shared";
import { asKind } from "./as-kind";
import type { Kind, TypedKind } from "./kind";

export type Projection<T> =
  | { readonly kind: "none" }
  | { readonly kind: "structural", readonly value: T }
  | { readonly kind: "opaque", readonly value: T };

export type ProjectionKind = Projection<any>["kind"];

export abstract class Type<T> {
  declare readonly _type: T;

  abstract check(val: any): Result<T>;
  abstract sliceResult(val: any): Result<T>;

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
   * Type algebra
   * -----------------------------------------------------------------------------------------------
   */

  and<R>(r: Type<R>): Type<T & R> {
    return new Intersection<T & R>([
      asKind<T>(this),
      asKind<R>(r),
    ]);
  }

  or<R>(r: Type<R>): Either<T, R> {
    return new Either(asKind<T>(this), asKind<R>(r));
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

  comment(comment: string): Comment<T> {
    return new Comment(comment, asKind<T>(this));
  }
}

export abstract class TypeImpl<T> extends Type<T> {
  protected abstract merge<R>(type: TypedKind<R>): TypedKind<T & R> | undefined;
  protected abstract project(val: any): Projection<T>;

  protected projectionOf<R>(type: TypeImpl<R>, val: any): Projection<R> {
    return type.project(val);
  }

  and<R>(r: Type<R>): Type<T & R> {
    const rightKind = asKind<R>(r);
    return intersect(asKind<T>(this), rightKind, (l, r) => {
      const left = l as TypeImpl<any>;
      const right = r as TypeImpl<any>;
      return left.merge(r) || right.merge(l);
    });
  }
}

type Merge = (l: Kind, r: Kind) => Kind | undefined;

function intersect<L, R>(l: TypedKind<L>, r: TypedKind<R>, merge: Merge): TypedKind<L & R> {
  return normalizeIntersection([
    ...flattenIntersection(l),
    ...flattenIntersection(r),
  ], merge) as TypedKind<L & R>;
}

function flattenIntersection(type: Kind): Kind[] {
  if(type instanceof Intersection) {
    let operands: Kind[] = [];
    for(const operand of type.operands) {
      operands = operands.concat(flattenIntersection(operand));
    }
    return operands;
  }
  return [ type ];
}

function normalizeIntersection(operands: Kind[], merge: Merge): Kind {
  for(let l = 0; l < operands.length; l++) {
    for(let r = l + 1; r < operands.length; r++) {
      const merged = merge(operands[l], operands[r]);
      if(!merged) continue;

      const normalized = operands.slice();
      normalized.splice(r, 1);
      normalized.splice(l, 1, ...flattenIntersection(merged));
      return normalizeIntersection(normalized, merge);
    }
  }

  if(operands.length === 1) return operands[0];
  return new Intersection(operands);
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

export abstract class UnmergeableType<T> extends TypeImpl<T> {
  sliceResult(val: any): Result<T> {
    const checked = this.check(val);
    if(checked instanceof Err) return checked;

    const projection = this.project(val);
    if(projection.kind === "none") return checked;
    return projection.value;
  }

  protected merge<R>(_: TypedKind<R>): TypedKind<T & R> | undefined {
    return undefined;
  }
}

export abstract class ConstraintType<T> extends UnmergeableType<T> {
  protected project(_: any): Projection<T> {
    return { kind: "none" };
  }
}

export abstract class OpaqueType<T> extends UnmergeableType<T> {
  protected project(val: any): Projection<T> {
    return { kind: "opaque", value: val as T };
  }
}

/*
 * ### Comment
 *
 * A type that delegates to the given type, but adds a comment when converted to TypeScript
 */

export class Comment<T> extends TypeImpl<T> {
  readonly wrapped: TypedKind<T>;

  constructor(readonly commentStr: string, wrapped: Type<T>) {
    super();
    this.wrapped = asKind(wrapped);
  }

  check(val: any): Result<T> {
    return this.wrapped.check(val);
  }

  sliceResult(val: any): Result<T> {
    return this.wrapped.sliceResult(val);
  }

  protected merge<R>(type: TypedKind<R>): TypedKind<T & R> {
    return new Comment(
      this.commentStr,
      this.wrapped.and(type),
    );
  }

  protected project(val: any): Projection<T> {
    return this.projectionOf(this.wrapped, val);
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

export type ValidationIssue = {
  readonly kind: "validation";
  readonly description: string;
  readonly threw: boolean;
  readonly subject: RuntimeType;
};

export class Validation<T> extends ConstraintType<T> {
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
    } catch {
      return new Err({
        kind: "validation",
        description: this.desc,
        threw: true,
        subject: runtimeTypeOf(val),
      });
    }

    return new Err({
      kind: "validation",
      description: this.desc,
      threw: false,
      subject: runtimeTypeOf(val),
    });
  }
}


/*
 * Either
 * -------------------------------------------------------------------------------------------------
 *
 * A union type. Extends the KeyTrackingType since it may need to track its children's keys, if the
 * children are themselves doing key tracking.
 */

export class Either<L, R> extends TypeImpl<L|R> {
  readonly l: TypedKind<L>;
  readonly r: TypedKind<R>;

  constructor(l: Type<L>, r: Type<R>) {
    super();
    this.l = asKind(l);
    this.r = asKind(r);
  }

  check(val: any): Result<L|R> {
    const l = this.l.check(val);
    if(!(l instanceof Err)) return l;
    const r = this.r.check(val);
    if(!(r instanceof Err)) return r;
    return new Err(unionIssue([ l.issue, r.issue ], runtimeTypeOf(val)));
  }

  /*
   * Delegate slicing to each branch so a successful branch validates and projects captured values
   * in one pass instead of being rechecked by project().
   */
  sliceResult(val: any): Result<L|R> {
    const l = this.l.sliceResult(val);
    if(!(l instanceof Err)) return l;
    const r = this.r.sliceResult(val);
    if(!(r instanceof Err)) return r;
    return new Err(unionIssue([ l.issue, r.issue ], runtimeTypeOf(val)));
  }

  protected merge<Incoming>(type: TypedKind<Incoming>): TypedKind<(L|R) & Incoming> {
    return new Either(
      this.l.and(type),
      this.r.and(type),
    );
  }

  protected project(val: any): Projection<L|R> {
    const l = this.l.check(val);
    if(!(l instanceof Err)) return this.projectionOf(this.l, val);
    return this.projectionOf(this.r, val);
  }
}

/*
 * Intersect
 * -------------------------------------------------------------------------------------------------
 */

export class Intersection<T> extends TypeImpl<T> {
  constructor(readonly operands: ReadonlyArray<Kind>) {
    super();
  }

  check(val: any): Result<T> {
    for(const operand of this.operands) {
      const result = operand.check(val);
      if(result instanceof Err) return result;
    }
    return val as T;
  }

  sliceResult(val: any): Result<T> {
    const checked = this.check(val);
    if(checked instanceof Err) return checked;

    const projection = this.project(val);
    if(projection.kind === "none") return checked;
    return projection.value;
  }

  protected merge<R>(type: TypedKind<R>): TypedKind<T & R> {
    return asKind(this.and(type));
  }

  protected project(val: any): Projection<T> {
    const projections = this.operands.map(type => this.projectionOf(type, val));
    if(projections.some(projection => projection.kind === "opaque")) {
      return { kind: "opaque", value: val as T };
    }

    const structural = projections.filter(
      (projection): projection is Extract<Projection<any>, { kind: "structural" }> => {
        return projection.kind === "structural";
      }
    );
    if(structural.length === 0) return { kind: "none" };
    if(structural.length === 1) return structural[0];

    return { kind: "opaque", value: val as T };
  }
}
