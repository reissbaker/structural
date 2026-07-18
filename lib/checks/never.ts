import { Result, Err } from "../result";
import { RuntimeType, runtimeTypeOf } from "../issues/shared";
import { ConstraintType } from "../type";

export type NeverIssue = {
  readonly kind: "never";
  readonly subject: RuntimeType;
};

export class Never extends ConstraintType<never> {
  check(val: any): Result<never> {
    return new Err({ kind: "never", subject: runtimeTypeOf(val) });
  }
}

export const never = new Never();
