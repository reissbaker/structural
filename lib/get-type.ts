import { Check } from "./check";

export type GetType<T> = T extends Check<infer U> ? U : never;
