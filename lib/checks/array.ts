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

  toString() {
    return `Array<${this.elementType}>`
  }
}

export function array<T>(t: Type<T>): Arr<T> {
  return new Arr(t);
}
