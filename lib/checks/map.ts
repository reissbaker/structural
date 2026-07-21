import { Err, Result } from "../result";
import { at } from "../issue";
import { typeMismatch } from "../issues/shared";
import { asKind } from "../as-kind";
import { TypedKind } from "../kind";
import { Projection, Type } from "../type";

export class MapType<K, V> extends Type<Map<K, V>> {
  readonly keyType: TypedKind<K>;
  readonly valueType: TypedKind<V>;

  constructor(k: Type<K>, v: Type<V>) {
    super();
    this.keyType = asKind(k);
    this.valueType = asKind(v);
  }

  check(val: any): Result<Map<K, V>> {
    if(!(val instanceof Map)) return new Err(typeMismatch("map", val));

    let index = 0;
    for(const [key, value] of val) {
      const keyResult = this.keyType.check(key);
      if(keyResult instanceof Err) {
        return new Err(at({ kind: "map-key", index }, keyResult.issue, "map"));
      }
      const valueResult = this.valueType.check(value);
      if(valueResult instanceof Err) {
        return new Err(at({ kind: "map-value", index }, valueResult.issue, "map"));
      }
      index += 1;
    }

    return val as Map<K, V>;
  }

  /*
   * Slice each captured entry in one pass so nested child sliceResult overrides are preserved.
   */
  sliceResult(val: any): Result<Map<K, V>> {
    if(!(val instanceof Map)) return new Err(typeMismatch("map", val));

    const result = new Map<K, V>();
    let index = 0;
    for(const [key, value] of val) {
      const slicedKey = this.keyType.sliceResult(key);
      if(slicedKey instanceof Err) {
        return new Err(at({ kind: "map-key", index }, slicedKey.issue, "map"));
      }
      const slicedValue = this.valueType.sliceResult(value);
      if(slicedValue instanceof Err) {
        return new Err(at({ kind: "map-value", index }, slicedValue.issue, "map"));
      }
      result.set(slicedKey, slicedValue);
      index += 1;
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

export function map<K, V>(k: Type<K>, v: Type<V>): MapType<K, V> {
  return new MapType(k, v);
}
