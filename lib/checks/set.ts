import { Err, Result } from "../result";
import { Type } from "../type";

export class SetType<V> extends Type<Set<V>> {
  readonly valueType: Type<V>;

  constructor(v: Type<V>) {
    super();
    this.valueType = v;
  }

  check(val: any): Result<Set<V>> {
    if(!(val instanceof Set)) return new Err(`${val} is not an instance of Set`);
    for(const v of val) {
      const result = this.valueType.check(v);
      if(result instanceof Err) return new Err(`{val} failed set check on value ${v}: ${result.message}`);
    }
    return val as Set<V>;
  }

  toString() {
    return `Set<${this.valueType}>`
  }
}

export function set<V>(v: Type<V>): SetType<V> {
  return new SetType(v);
}
