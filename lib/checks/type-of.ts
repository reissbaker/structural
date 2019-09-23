import { Result } from "../result";
import { Type } from "../type";

export class TypeOf<T> extends Type<T> {
  readonly typestring: string;
  constructor(t: string) {
    super();
    this.typestring = t;
  }

  check(val: any): Result<T> {
    if(typeof val === this.typestring) return val as T;
    return this.err(`not a ${this.typestring}`, val)
  }

  toString() {
    return this.typestring
  }
}

export function typeOf<T>(t: string): TypeOf<T> {
  return new TypeOf<T>(t);
}
