import { Err, Result } from "../result";
import { Type } from "../type";

export class MapType<K, V> extends Type<Map<K, V>> {
  readonly keyType: Type<K>;
  readonly valueType: Type<V>;

  constructor(k: Type<K>, v: Type<V>) {
    super();
    this.keyType = k;
    this.valueType = v;
  }

  check(val: any): Result<Map<K, V>> {
    if(!(val instanceof Map)) return new Err(`${val} is not an instance of Map`);

    for(const [k, v] of val) {
      const kResult = this.keyType.check(k);
      if(kResult instanceof Err) return new Err(`{val} key error: ${kResult.message}`);
      const vResult = this.valueType.check(v);
      if(vResult instanceof Err) return new Err(`{val} value error: ${vResult.message}`);
    }

    return val as Map<K, V>;
  }

  sliceResult(val: any): Result<Map<K, V>> {
    if(!(val instanceof Map)) return new Err(`${val} is not an instance of Map`);

    const result: Map<K, V> = new Map();

    for(const [k, v] of val) {
      const kResult = this.keyType.slice(k);
      if(kResult instanceof Err) return new Err(`{val} key error: ${kResult.message}`);
      const vResult = this.valueType.slice(v);
      if(vResult instanceof Err) return new Err(`{val} value error: ${vResult.message}`);
      result.set(kResult, vResult);
    }

    return result;
  }
}

export function map<K, V>(k: Type<K>, v: Type<V>): MapType<K, V> {
  return new MapType(k, v);
}
