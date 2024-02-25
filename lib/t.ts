/*
 * This is a smaller import, `t`, that only contains the basic matchers and code that would either
 * necessarily be loaded to run them, or that takes 0 runtime space (e.g. type-only files).
 * It exists to make it easy to import everything you would typically use to define schemas, but
 * leave out optional stuff like converting to TypeScript, JSON Schema, etc from bundles, assuming
 * you use a tree-shaking compiler. This effectively means that adding more conversion utilities
 * doesn't bloat imports, and still provides reasonable import DX so that you don't need to have
 * individual import statements for every single type. Instead of the old style:
 *
 *     import * as t from "structural";
 *
 * You can instead do:
 *
 *     import { t } from "structural";
 *
 * And save a little bundle space.
 */

export * from "./result";
export * from "./type";
export * from "./get-type";

export * from "./checks/type-of";
export * from "./checks/instance-of";
export * from "./checks/value";
export * from "./checks/array";
export * from "./checks/struct";
export * from "./checks/map";
export * from "./checks/set";
export * from "./checks/primitives";
export * from "./checks/any";
export * from "./checks/is";
export * from "./checks/never";

export * from "./kind";
