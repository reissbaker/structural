import { Type } from "./type";

export type GetType<T> = T extends Type<infer U> ? U : never;
