import { Err, Result } from "../result";
import { Check } from "../check";

export class SetCheck<V> extends Check<Set<V>> {
  private valueCheck: Check<V>;

  constructor(v: Check<V>) {
    super();
    this.valueCheck = v;
  }

  check(val: any): Result<Set<V>> {
    if(!(val instanceof Set)) return new Err(`${val} is not an instance of Set`);
    for(const v of val) {
      const result = this.valueCheck.check(v);
      if(result instanceof Err) return new Err(`{val} failed set check on value ${v}: ${result.message}`);
    }
    return val as Set<V>;
  }
}

export function set<V>(v: Check<V>): SetCheck<V> {
  return new SetCheck(v);
}
