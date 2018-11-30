import { Check } from "../check";
import { typeOf } from "./type-of";
import { instanceOf } from "./instance-of";
import { value } from "./value";

export const num = typeOf<number>('number');
export const str = typeOf<string>('string');
export const bool = typeOf<boolean>('boolean');
export const fn = typeOf<Function>('function');
export const sym = typeOf<Symbol>('symbol');
export const undef = typeOf<undefined>('undefined');
export const nil = value<null>(null);
export const obj = instanceOf(Object);

export function maybe<T>(check: Check<T>): Check<T|null> {
  return check.or(nil);
}
