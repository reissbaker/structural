import { Result, Err } from "../result";
import { Type } from "../type";

export class Never extends Type<never> {
  check(_: any): Result<never> {
    return new Err('never')
  }

  toString() {
    return 'never'
  }
}

export const never = new Never();
