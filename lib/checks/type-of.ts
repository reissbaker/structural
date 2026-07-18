import { Err, Result } from "../result";
import { ConstraintType } from "../type";

export type ValidTypeString = "undefined"
                            | "object"
                            | "boolean"
                            | "number"
                            | "bigint"
                            | "string"
                            | "symbol"
                            | "function"
                            ;

export class TypeOf<T> extends ConstraintType<T> {
  readonly typestring: ValidTypeString;

  constructor(t: ValidTypeString) {
    super();
    this.typestring = t;
  }

  check(val: any): Result<T> {
    if(typeof val === this.typestring && (this.typestring !== "object" || val !== null)) {
      return val as T;
    }
    return new Err(`${val} is not a ${this.typestring}`);
  }
}

export function typeOf<T>(t: ValidTypeString): TypeOf<T> {
  return new TypeOf<T>(t);
}
