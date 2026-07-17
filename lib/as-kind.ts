import type { TypedKind } from "./kind";
import type { TypeImpl } from "./type";

export function asKind<T, U extends TypeImpl<T>>(type: U): U & TypedKind<T>;
export function asKind<T>(type: TypeImpl<any>): TypedKind<T>;
export function asKind<T>(type: TypeImpl<any>): TypedKind<T> {
  return type as unknown as TypedKind<T>;
}
