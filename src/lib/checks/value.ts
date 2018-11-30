import { Err, Result } from "../result";
import { Check } from "../check";

export class Value<T> extends Check<T> {
  private val: T;
  constructor(v: T) {
    super();
    this.val = v;
  }

  check(val: any): Result<T> {
    if(val === this.val) return val;
    return new Err(`${val} is not equal to ${this.val}`);
  }
}

export default function value<T>(v: T): Value<T> {
  return new Value(v);
}
