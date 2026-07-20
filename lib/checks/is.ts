import { Err, Result } from "../result";
import { RuntimeType, runtimeTypeOf } from "../issues/shared";
import { OpaqueType } from "../type";

export type GuardIssue = {
  readonly kind: "guard";
  readonly name: string;
  readonly threw: boolean;
  readonly subject: RuntimeType;
};

type Guard<T> = (val: any) => val is T

export class Is<T> extends OpaqueType<T> {
  readonly name: string
  readonly isT: Guard<T>

  constructor(name: string, guard: Guard<T>) {
    super()
    this.name = name
    this.isT = guard
  }

  check(val: any): Result<T> {
    try {
      if(this.isT(val)) return val;
    } catch {
      return new Err({
        kind: "guard",
        name: this.name,
        threw: true,
        subject: runtimeTypeOf(val),
      });
    }
    return new Err({
      kind: "guard",
      name: this.name,
      threw: false,
      subject: runtimeTypeOf(val),
    });
  }
}

export function is<T>(name: string, guard: Guard<T>) {
  return new Is<T>(name, guard)
}
