export type RuntimeType =
  | "undefined"
  | "null"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "function"
  | "array"
  | "map"
  | "set"
  | "object";

export type ExpectedType = RuntimeType | "dictionary";

export type TypeMismatchIssue = {
  readonly kind: "type";
  readonly expected: ExpectedType;
  readonly subject: RuntimeType;
};

export type LiteralExpectation =
  | { readonly kind: "undefined" }
  | { readonly kind: "null" }
  | { readonly kind: "boolean", readonly value: boolean }
  | { readonly kind: "number", readonly value: number }
  | { readonly kind: "bigint", readonly value: string }
  | { readonly kind: "string", readonly value: string }
  | { readonly kind: "opaque", readonly type: RuntimeType };

export function runtimeTypeOf(value: unknown): RuntimeType {
  if(value === null) return "null";
  if(Array.isArray(value)) return "array";
  if(value instanceof Map) return "map";
  if(value instanceof Set) return "set";
  return typeof value;
}

export function typeMismatch(expected: ExpectedType, value: unknown): TypeMismatchIssue {
  return {
    kind: "type",
    expected,
    subject: runtimeTypeOf(value),
  };
}

export function literalExpectation(value: unknown): LiteralExpectation {
  if(value === null) return { kind: "null" };

  switch(typeof value) {
    case "undefined":
      return { kind: "undefined" };
    case "boolean":
      return { kind: "boolean", value };
    case "number":
      return { kind: "number", value };
    case "bigint":
      return { kind: "bigint", value: value.toString() };
    case "string":
      return { kind: "string", value };
    default:
      return { kind: "opaque", type: runtimeTypeOf(value) };
  }
}
