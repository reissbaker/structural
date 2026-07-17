import { Result } from "../result";
import { ConstraintType } from "../type";

export class Any extends ConstraintType<any> {
  check(val: any): Result<any> {
    return val;
  }
}

export const any = new Any();
