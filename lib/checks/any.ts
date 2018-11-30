import { Err, Result } from "../result";
import { Check } from "../check";

export class Any extends Check<any> {
  check(val: any): Result<any> {
    return val;
  }
}

export const any = new Any();
