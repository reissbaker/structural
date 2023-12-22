export * from "./lib/match"

export * from "./lib/t";
export * as t from "./lib/t";

export * from "./lib/to-ts";
export * from "./lib/to-jsonschema";

// TODO: test type inference. one way to do this: build up a struktural type, get the inner type
// with GetType, and assign it something that should fail the type checker. assert the type checker
// fails. also have vice-versa tests. unknown: can you ignore directories in the main tsconfig?
// otherwise your whole build will fail. maybe just have different root dirs.
