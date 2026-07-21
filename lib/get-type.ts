import { Type } from "./type";

export type GetType<T extends Type<any>> = T["_type"];
