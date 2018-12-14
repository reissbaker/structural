import { Type } from "./type";

type GenericFn<T, R extends Type<T>> = (...a: any[]) => R;
export type GetType<T> = T extends Type<infer U> ? U :
                         (T extends GenericFn<any, infer R> ?
                           (R extends Type<infer U> ? U : never) : never);
