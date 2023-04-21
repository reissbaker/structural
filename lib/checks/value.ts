import { Err, Result } from "../result";
import { Type } from "../type";

export class Value<const T> extends Type<T> {
  readonly val: T;
  constructor(v: T) {
    super();
    this.val = v;
  }

  check(val: any): Result<T> {
    if(val === this.val) return val;
    return new Err(`${val} is not equal to ${this.val}`);
  }
}

export function value<const T>(v: T): Value<T> {
  return new Value(v);
}
