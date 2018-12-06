import { Err, Result } from "../result";
import { Type } from "../type";

export class Any extends Type<any> {
  check(val: any): Result<any> {
    return val;
  }
}

export const any = new Any();
