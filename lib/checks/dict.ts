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
    if(typeof val !== 'object') return this.err(`not an object`, val);
    if(Array.isArray(val)) return this.err(`is an array`, val);
    if(val === null) return this.err(`is null`, val);

    for(const prop in val) {
      const result = this.valueType.check(val[prop]);
      if(result instanceof Err) return Err.lift(result, prop)
    }

    return val as Result<RawDict<V>>;
  }

  toString() {
    return `{ [key: string]: ${this.valueType} }`
  }
}

export function dict<V>(v: Type<V>): Dict<V> {
  return new Dict(v);
}
