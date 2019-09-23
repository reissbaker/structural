export {
  // Because lib/result has a bunch of pretty-printing helpers and such,
  // we only export specific thigns  publically
  Result,
  Err,
  StructuralError,
} from "./lib/result";
export * from "./lib/type";
export * from "./lib/get-type";
export * from "./lib/match"

export * from "./lib/checks/type-of";
export * from "./lib/checks/instance-of";
export * from "./lib/checks/value";
export * from "./lib/checks/array";
export * from "./lib/checks/struct";
export * from "./lib/checks/dict";
export * from "./lib/checks/map";
export * from "./lib/checks/set";
export * from "./lib/checks/primitives";
export * from "./lib/checks/any";
export * from "./lib/checks/is";
export * from "./lib/checks/never";

export * from "./lib/kind";

// TODO: test type inference. one way to do this: build up a struktural type, get the inner type
// with GetType, and assign it something that should fail the type checker. assert the type checker
// fails. also have vice-versa tests. unknown: can you ignore directories in the main tsconfig?
// otherwise your whole build will fail. maybe just have different root dirs.
