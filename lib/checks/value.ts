import { Result } from "../result";
import { Type } from "../type";

export class Value<T> extends Type<T> {
  readonly val: T;
  constructor(v: T) {
    super();
    this.val = v;
  }

  check(val: any): Result<T> {
    if(val === this.val) return val;
    return this.err('not equal', val)
  }

  toString() {
    if (typeof this.val === 'string' ||
        typeof this.val === 'number' ||
        this.val === null
       ) {
      return JSON.stringify(this.val)
    }
    return `=== ${this.val}`
  }
}

export function value<T>(v: T): Value<T> {
  return new Value(v);
}
