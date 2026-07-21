import { never } from "./checks/never";
import type { GetType } from "./get-type";
import type { Type } from "./type";

export function union<const Types extends ReadonlyArray<Type<any>>>(
  ...types: Types
): Type<GetType<Types[number]>>;
export function union<const Types extends ReadonlyArray<Type<any>>>(
  types: Types
): Type<GetType<Types[number]>>;
export function union(
  ...args: Type<any>[] | [ ReadonlyArray<Type<any>> ]
): Type<any> {
  const types: ReadonlyArray<Type<any>> = args.length === 1 && Array.isArray(args[0])
    ? args[0]
    : args as Type<any>[];

  if(types.length === 0) return never;

  let result = types[0];
  for(const type of types.slice(1)) {
    result = result.or(type);
  }
  return result;
}
