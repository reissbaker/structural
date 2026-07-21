import type { TypedKind } from "./kind";
import type { Type } from "./type";

export function asKind<T, U extends Type<T>>(type: U): U & TypedKind<T>;
export function asKind<T>(type: Type<any>): TypedKind<T>;
export function asKind<T>(type: Type<any>): TypedKind<T> {
  return type as unknown as TypedKind<T>;
}
