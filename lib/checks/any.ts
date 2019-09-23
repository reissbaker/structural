import { Result } from "../result";
import { Type } from "../type";

export class Any extends Type<any> {
  check(val: any): Result<any> {
    return val;
  }

  toString() {
    return 'any'
  }
}

export const any = new Any();
