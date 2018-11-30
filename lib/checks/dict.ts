import { Err, Result } from "../result";
import { Check } from "../check";

type RawDict<V> = {
  [key: string]: V;
};

export class Dict<V> extends Check<RawDict<V>> {
  private valueCheck: Check<V>;
  constructor(v: Check<V>) {
    super();
    this.valueCheck = v;
  }

  check(val: any): Result<RawDict<V>> {
    if(typeof val !== 'object') return new Err(`${val} is not an object`);
    if(Array.isArray(val)) return new Err(`${val} is an array`);
    if(val === null) return new Err(`${val} is null`);

    for(const prop in val) {
      const result = this.valueCheck.check(val[prop]);
      if(result instanceof Err) return new Err(`[${prop}]: ${result.message}`);
    }

    return val as Result<RawDict<V>>;
  }
}

export function dict<V>(v: Check<V>): Dict<V> {
  return new Dict(v);
}
