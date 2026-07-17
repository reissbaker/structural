import { Result, Err } from "../result";
import { ConstraintType } from "../type";

export class Never extends ConstraintType<never> {
  check(_: any): Result<never> {
    return new Err('never')
  }
}

export const never = new Never();
