import { Err, Result } from "../result";
import { Check } from "../check";

interface Constructor<T> {
  new (...args: Array<any>): T;
}

export class InstanceOf<T> extends Check<T> {
  private klass: Constructor<T>;

  constructor(klass: Constructor<T>) {
    super();
    this.klass = klass;
  }

  check(val: any): Result<T> {
    if(val instanceof this.klass) return val;
    return new Err(`${val} is not an instance of ${this.klass}`);
  }
}

export default function instanceOf<T>(klass: Constructor<T>): InstanceOf<T> {
  return new InstanceOf(klass);
}
