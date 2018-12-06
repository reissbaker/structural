import { Type } from "../type";
import { typeOf } from "./type-of";
import { value } from "./value";

export const num = typeOf<number>('number');
export const str = typeOf<string>('string');
export const bool = typeOf<boolean>('boolean');
export const fn = typeOf<Function>('function');
export const sym = typeOf<Symbol>('symbol');
export const undef = typeOf<undefined>('undefined');
export const nil = value<null>(null);
export const obj = typeOf<Object>('object');

export function maybe<T>(check: Type<T>): Type<T|null> {
  return check.or(nil);
}

export function optional<T>(check: Type<T>): Type<T|undefined> {
  return check.or(undef);
}
