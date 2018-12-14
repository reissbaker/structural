import { Err, Result } from "../result";
import { Type } from "../type";

type RawDict<V> = {
  [key: string]: V;
};

export class Dict<V> extends Type<RawDict<V>> {
  readonly valueType: Type<V>;
  constructor(v: Type<V>) {
    super();
    this.valueType = v;
  }

  check(val: any): Result<RawDict<V>> {
    if(typeof val !== 'object') return new Err(`${val} is not an object`);
    if(Array.isArray(val)) return new Err(`${val} is an array`);
    if(val === null) return new Err(`${val} is null`);

    for(const prop in val) {
      const result = this.valueType.check(val[prop]);
      if(result instanceof Err) return new Err(`[${prop}]: ${result.message}`);
    }

    return val as Result<RawDict<V>>;
  }
}

export function dict<V>(v: Type<V>): Dict<V> {
  return new Dict(v);
}
