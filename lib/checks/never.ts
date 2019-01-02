import { Result } from "../result";
import { Type } from "../type";

export class Never extends Type<never> {
  check(val: any): Result<never> {
    return this.err('never values cannot occur', val)
  }

  toString() {
    return 'never'
  }
}

export const never = new Never();
