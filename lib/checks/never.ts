import { Result, Err } from "../result";
import { Type } from "../type";

export class Never extends Type<never> {
  check(val: any): Result<never> {
    return new Err('never')
  }
}

export const never = new Never();
