import { Err, Result } from "../result";
import { Check } from "../check";

export class Arr<T> extends Check<Array<T>> {
  private elementCheck: Check<T>;

  constructor(check: Check<T>) {
    super();
    this.elementCheck = check;
  }

  check(val: any): Result<Array<T>> {
    if(!Array.isArray(val)) return new Err(`${val} is not an array`);

    for(const el of val) {
      const result = this.elementCheck.check(el);
      // Don't bother collecting all errors in an array: for long arrays this is very obnoxious
      if(result instanceof Err) return new Err(result.message);
    }

    // If we got this far, there were no errors; it's an Array<T>
    return val as Array<T>;
  }
}

export function array<T>(check: Check<T>): Arr<T> {
  return new Arr(check);
}
