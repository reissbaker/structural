import { Err, Result } from "../result";
import { Type } from "../type";

type RawDict<V> = {
  [key: string]: V;
};

export class Dict<V> extends Type<RawDict<V>> {
  readonly valueType: Type<V>;
  constructor(v: Type<V>, readonly namedKey: string = "key") {
    super();
    this.valueType = v;
  }

  keyName(key: string): Dict<V> {
    return new Dict(this.valueType, key);
  }

  check(val: any): Result<RawDict<V>> {
    const err = basicErrs(val);
    if(err) return err;

    for(const prop in val) {
      const result = this.valueType.check(val[prop]);
      if(result instanceof Err) return new Err(`[${prop}]: ${result.message}`);
    }

    return val as Result<RawDict<V>>;
  }

  sliceResult(val: any): Result<RawDict<V>> {
    const err = basicErrs(val);
    if(err) return err;

    const result: { [key: string]: any } = {};
    for(const prop in val) {
      const sliced = this.valueType.slice(val[prop]);
      if(sliced instanceof Err) return new Err(`[${prop}]: ${result.message}`);
      result[prop] = sliced;
    }

    return result as Result<RawDict<V>>;
  }
}

function basicErrs<V>(val: any): Err<V> | null {
  if(typeof val !== 'object') return new Err(`${val} is not an object`);
  if(Array.isArray(val)) return new Err(`${val} is an array`);
  if(val === null) return new Err(`${val} is null`);
  return null;
}

export function dict<V>(v: Type<V>): Dict<V> {
  return new Dict(v);
}
