import { Err, Result } from "../result";
import { asKind } from "../as-kind";
import { TypedKind } from "../kind";
import { Projection, TypeImpl } from "../type";

export class SetType<V> extends TypeImpl<Set<V>> {
  readonly valueType: TypedKind<V>;

  constructor(v: TypedKind<V>) {
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

  protected merge<R>(type: TypedKind<R>): TypedKind<Set<V> & R> | undefined {
    if(!(type instanceof SetType)) return undefined;

    return asKind<Set<V> & R>(new SetType(
      this.valueType.and(type.valueType),
    ));
  }

  protected project(val: any): Projection<Set<V>> {
    const result = new Set<V>();
    for(const value of val) {
      const projection = this.projectionOf(this.valueType, value);
      result.add(projection.kind === "none" ? value : projection.value);
    }
    return { kind: "structural", value: result };
  }
}

export function set<V>(v: TypedKind<V>): SetType<V> {
  return new SetType(v);
}
