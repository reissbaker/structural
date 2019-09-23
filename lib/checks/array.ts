import { Err, Result } from "../result";
import { Type } from "../type";

export class Arr<T> extends Type<Array<T>> {
  readonly elementType: Type<T>;

  constructor(t: Type<T>) {
    super();
    this.elementType = t;
  }

  check(val: any): Result<Array<T>> {
    if(!Array.isArray(val)) return this.err(`not an array`, val)


    // use traditional iteration so we know the index
    for (let i = 0; i<val.length; i++) {
      if (i in val) { // support sparse arrays
        const el = val[i]
        const result = this.elementType.check(el);
        if (result instanceof Err) {
          return Err.lift(result, i)
        }
      }
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
