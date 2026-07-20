import { Err, Result } from "../result";
import {
  LiteralExpectation,
  literalExpectation,
  RuntimeType,
  runtimeTypeOf,
} from "../issues/shared";
import { Projection, UnmergeableType } from "../type";

export type LiteralIssue = {
  readonly kind: "literal";
  readonly expected: LiteralExpectation;
  readonly subject: RuntimeType;
};

export class Value<const T> extends UnmergeableType<T> {
  readonly val: T;
  constructor(v: T) {
    super();
    this.val = v;
  }

  check(val: any): Result<T> {
    if(val === this.val || (Number.isNaN(val) && Number.isNaN(this.val))) return val;
    return new Err({
      kind: "literal",
      expected: literalExpectation(this.val),
      subject: runtimeTypeOf(val),
    });
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
