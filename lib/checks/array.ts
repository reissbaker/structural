import { Err, Result } from "../result";
import { asKind } from "../as-kind";
import { TypedKind } from "../kind";
import { Projection, TypeImpl } from "../type";

export class Arr<T> extends TypeImpl<Array<T>> {
  readonly elementType: TypedKind<T>;

  constructor(t: TypedKind<T>) {
    super();
    this.elementType = t;
  }

  check(val: any): Result<Array<T>> {
    if(!Array.isArray(val)) return new Err(`${val} is not an array`);

    for(const el of val) {
      const result = this.elementType.check(el);
      // Don't bother collecting all errors in an array: for long arrays this is very obnoxious
      if(result instanceof Err) return new Err(result.message);
    }

    // If we got this far, there were no errors; it's an Array<T>
    return val as Array<T>;
  }

  /*
   * Slice each element in one pass so nested structural checkers can preserve the exact values they
   * validated. The default check-then-project flow would bypass a child's sliceResult override.
   */
  sliceResult(val: any): Result<Array<T>> {
    if(!Array.isArray(val)) return new Err(`${val} is not an array`);

    const result: T[] = [];
    for(const element of val) {
      const sliced = this.elementType.sliceResult(element);
      if(sliced instanceof Err) return sliced;
      result.push(sliced);
    }
    return result;
  }

  protected merge<R>(type: TypedKind<R>): TypedKind<Array<T> & R> | undefined {
    if(!(type instanceof Arr)) return undefined;

    return asKind<Array<T> & R>(new Arr(
      this.elementType.and(type.elementType),
    ));
  }

  protected project(val: any): Projection<Array<T>> {
    return {
      kind: "structural",
      value: val.map((element: any) => {
        const projection = this.projectionOf(this.elementType, element);
        return projection.kind === "none" ? element : projection.value;
      }),
    };
  }
}

export function array<T>(t: TypedKind<T>): Arr<T> {
  return new Arr(t);
}
