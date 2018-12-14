import { Err, Result } from "../result";
import { Type } from "../type";

export class TypeOf<T> extends Type<T> {
  readonly typestring: string;
  constructor(t: string) {
    super();
    this.typestring = t;
  }

  check(val: any): Result<T> {
    if(typeof val === this.typestring) return val as T;
    return new Err(`${val} is not a ${this.typestring}`);
  }
}

export function typeOf<T>(t: string): TypeOf<T> {
  return new TypeOf<T>(t);
}
