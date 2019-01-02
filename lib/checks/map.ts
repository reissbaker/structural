import { Err, MapKey, MapKeyIndex, Result } from "../result";
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
    if(!(val instanceof Map)) return this.err(`not a Map`, val);

    let i = 0
    for(const [k, v] of val) {
      const kResult = this.keyType.check(k);
      if(kResult instanceof Err) return Err.lift(kResult, new MapKeyIndex(i))
      const vResult = this.valueType.check(v);
      if(vResult instanceof Err) return Err.lift(vResult, new MapKey(k))
      i++
    }

    return val as Map<K, V>;
  }

  toString() {
    return `Map<${this.keyType}, ${this.valueType}>`
  }
}

export function map<K, V>(k: Type<K>, v: Type<V>): MapType<K, V> {
  return new MapType(k, v);
}
