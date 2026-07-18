import { Err, Result } from "../result";
import { asKind } from "../as-kind";
import { TypedKind } from "../kind";
import { Projection, TypeImpl } from "../type";

export class MapType<K, V> extends TypeImpl<Map<K, V>> {
  readonly keyType: TypedKind<K>;
  readonly valueType: TypedKind<V>;

  constructor(k: TypedKind<K>, v: TypedKind<V>) {
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

  /*
   * Slice each captured entry in one pass so nested child sliceResult overrides are preserved.
   */
  sliceResult(val: any): Result<Map<K, V>> {
    if(!(val instanceof Map)) return new Err(`${val} is not an instance of Map`);

    const result = new Map<K, V>();
    for(const [key, value] of val) {
      const slicedKey = this.keyType.sliceResult(key);
      if(slicedKey instanceof Err) return new Err(`{val} key error: ${slicedKey.message}`);
      const slicedValue = this.valueType.sliceResult(value);
      if(slicedValue instanceof Err) return new Err(`{val} value error: ${slicedValue.message}`);
      result.set(slicedKey, slicedValue);
    }
    return result;
  }

  protected merge<R>(type: TypedKind<R>): TypedKind<Map<K, V> & R> | undefined {
    if(!(type instanceof MapType)) return undefined;

    return asKind<Map<K, V> & R>(new MapType(
      this.keyType.and(type.keyType),
      this.valueType.and(type.valueType),
    ));
  }

  protected project(val: any): Projection<Map<K, V>> {
    const result = new Map<K, V>();
    for(const [key, value] of val) {
      const keyProjection = this.projectionOf(this.keyType, key);
      const valueProjection = this.projectionOf(this.valueType, value);
      result.set(
        keyProjection.kind === "none" ? key : keyProjection.value,
        valueProjection.kind === "none" ? value : valueProjection.value,
      );
    }
    return { kind: "structural", value: result };
  }
}

export function map<K, V>(k: TypedKind<K>, v: TypedKind<V>): MapType<K, V> {
  return new MapType(k, v);
}
