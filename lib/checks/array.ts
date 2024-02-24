import { Err, Result } from "../result";
import { Type } from "../type";

export class Arr<T> extends Type<Array<T>> {
  readonly elementType: Type<T>;

  constructor(t: Type<T>) {
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

  sliceResult(val: any): Result<Array<T>> {
    if(!Array.isArray(val)) return new Err(`${val} is not an array`);

    const result: T[] = [];
    for(const el of val) {
      const sliced = this.elementType.sliceResult(el);
      // Don't bother collecting all errors in an array: for long arrays this is very obnoxious
      if(sliced instanceof Err) return new Err(sliced.message);
      result.push(sliced);
    }

    return result;
  }

  and<R>(t: Type<R>): Type<Array<T>&R> {
    // Oddly, TypeScript merges arrays together by simply taking the left hand side
    if(t instanceof Arr<any>) return this as unknown as Type<Array<T> & R>;
    return super.and(t);
  }
}

export function array<T>(t: Type<T>): Arr<T> {
  return new Arr(t);
}
