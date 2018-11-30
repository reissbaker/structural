import { Err, Result } from "../result";
import { Check } from "../check";

export class MapCheck<K, V> extends Check<Map<K, V>> {
  private keyCheck: Check<K>;
  private valueCheck: Check<V>;

  constructor(k: Check<K>, v: Check<V>) {
    super();
    this.keyCheck = k;
    this.valueCheck = v;
  }

  check(val: any): Result<Map<K, V>> {
    if(!(val instanceof Map)) return new Err(`${val} is not an instance of Map`);

    for(const [k, v] of val) {
      const kResult = this.keyCheck.check(k);
      if(kResult instanceof Err) return new Err(`{val} key error: ${kResult.message}`);
      const vResult = this.valueCheck.check(v);
      if(vResult instanceof Err) return new Err(`{val} value error: ${vResult.message}`);
    }

    return val as Map<K, V>;
  }
}

export default function map<K, V>(k: Check<K>, v: Check<V>): MapCheck<K, V> {
  return new MapCheck(k, v);
}
