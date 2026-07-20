import { Err, Result } from "../result";
import { RuntimeType, runtimeTypeOf } from "../issues/shared";
import { OpaqueType } from "../type";

export type InstanceOfIssue = {
  readonly kind: "instance-of";
  readonly expectedClass: string | undefined;
  readonly subject: RuntimeType;
};

export type Constructor<T> = Function & { prototype: T }

export class InstanceOf<T> extends OpaqueType<T> {
  readonly klass: Constructor<T>;

  constructor(klass: Constructor<T>) {
    super();
    this.klass = klass;
  }

  check(val: any): Result<T> {
    if(val instanceof this.klass) return val as Result<T>;
    return new Err({
      kind: "instance-of",
      expectedClass: this.klass.name || undefined,
      subject: runtimeTypeOf(val),
    });
  }
}

export function instanceOf<T>(klass: Constructor<T>): InstanceOf<T> {
  return new InstanceOf(klass);
}
