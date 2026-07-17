import { Err, Result } from "../result";
import { Projection, UnmergeableType } from "../type";

export class Value<const T> extends UnmergeableType<T> {
  readonly val: T;
  constructor(v: T) {
    super();
    this.val = v;
  }

  check(val: any): Result<T> {
    if(val === this.val) return val;
    return new Err(`${val} is not equal to ${this.val}`);
  }

  protected project(val: any): Projection<T> {
    if((typeof this.val === "object" && this.val !== null) || typeof this.val === "function") {
      return { kind: "opaque", value: val as T };
    }
    return { kind: "none" };
  }
}

export function value<const T>(v: T): Value<T> {
  return new Value(v);
}
