import { Err, Result } from "../result";
import { Type } from "../type";

type Constructor<T> = Function & { prototype: T }

export class InstanceOf<T> extends Type<T> {
  readonly klass: Constructor<T>;

  constructor(klass: Constructor<T>) {
    super();
    this.klass = klass;
  }

  check(val: any): Result<T> {
    if(val instanceof this.klass) return val as Result<T>;
    return new Err(`${val} is not an instance of ${this.klass}`);
  }
}

export function instanceOf<T>(klass: Constructor<T>): InstanceOf<T> {
  return new InstanceOf(klass);
}
