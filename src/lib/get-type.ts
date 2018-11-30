import { Check } from "./check";

type GetType<T> = T extends Check<infer U> ? U : never;

export default GetType;
