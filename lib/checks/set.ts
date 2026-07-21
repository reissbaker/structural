import { Err, Result } from "../result";
import { at } from "../issue";
import { typeMismatch } from "../issues/shared";
import { asKind } from "../as-kind";
import { TypedKind } from "../kind";
import { Projection, Type } from "../type";

export class SetType<V> extends Type<Set<V>> {
  readonly valueType: TypedKind<V>;

  constructor(v: Type<V>) {
    super();
    this.valueType = asKind(v);
  }

  check(val: any): Result<Set<V>> {
    if(!(val instanceof Set)) return new Err(typeMismatch("set", val));

    let index = 0;
    for(const value of val) {
      const result = this.valueType.check(value);
      if(result instanceof Err) {
        return new Err(at({ kind: "set-value", index }, result.issue, "set"));
      }
      index += 1;
    }
    return val as Set<V>;
  }

  /*
   * Slice each captured value in one pass so nested child sliceResult overrides are preserved.
   */
  sliceResult(val: any): Result<Set<V>> {
    if(!(val instanceof Set)) return new Err(typeMismatch("set", val));

    const result = new Set<V>();
    let index = 0;
    for(const value of val) {
      const sliced = this.valueType.sliceResult(value);
      if(sliced instanceof Err) {
        return new Err(at({ kind: "set-value", index }, sliced.issue, "set"));
      }
      result.add(sliced);
      index += 1;
    }
    return result;
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

export function set<V>(v: Type<V>): SetType<V> {
  return new SetType(v);
}
