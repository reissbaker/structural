import { expect, expectTypeOf, test } from "vitest";
import * as t from "../index";

export function unionAll<T extends t.Type<any>>(array: readonly T[]): t.Type<t.GetType<T>> {
  if(array.length === 1) return array[0];
  return array[0].or(unionAll(array.slice(1)));
}

test("client-defined recursive union helpers compile and work", () => {
  const type = unionAll([ t.str, t.num, t.bool ]);

  expect(type.guard("hello")).toBe(true);
  expect(type.guard(5)).toBe(true);
  expect(type.guard(false)).toBe(true);
  expect(type.guard(null)).toBe(false);
});

test("union accepts variadic types and preserves their union", () => {
  const type = t.union(t.value("alpha"), t.value(1), t.value(true));

  expectTypeOf(type).toEqualTypeOf<t.Type<"alpha" | 1 | true>>();
  expect(type.guard("alpha")).toBe(true);
  expect(type.guard(1)).toBe(true);
  expect(type.guard(true)).toBe(true);
  expect(type.guard("other")).toBe(false);
});

test("union accepts a readonly tuple and preserves its union", () => {
  const types = [ t.value("alpha"), t.value(1), t.value(true) ] as const;
  const type = t.union(types);

  expectTypeOf(type).toEqualTypeOf<t.Type<"alpha" | 1 | true>>();
  expect(type.guard("alpha")).toBe(true);
  expect(type.guard(1)).toBe(true);
  expect(type.guard(true)).toBe(true);
});

test("union accepts generic readonly arrays", () => {
  function unionWithBuiltin<T extends t.Type<any>>(
    array: readonly T[],
  ): t.Type<t.GetType<T>> {
    return t.union(array);
  }

  const type = unionWithBuiltin([ t.str, t.num, t.bool ]);
  expect(type.guard("hello")).toBe(true);
  expect(type.guard(5)).toBe(true);
  expect(type.guard(false)).toBe(true);
});

test("union returns a single type unchanged", () => {
  expect(t.union(t.str)).toBe(t.str);
  expect(t.union([ t.str ] as const)).toBe(t.str);
});

test("an empty union is never", () => {
  const variadic = t.union();
  const tuple = t.union([] as const);

  expectTypeOf(variadic).toEqualTypeOf<t.Type<never>>();
  expectTypeOf(tuple).toEqualTypeOf<t.Type<never>>();
  expect(variadic).toBe(t.never);
  expect(tuple).toBe(t.never);
  expect(variadic.guard("anything")).toBe(false);
});

test("generic Type values work with public combinators", () => {
  function compose<T>(type: t.Type<T>) {
    return {
      array: t.array(type),
      map: t.map(type, type),
      set: t.set(type),
      dict: t.dict(type),
      maybe: t.maybe(type),
      struct: t.subtype({
        value: type,
        optional: t.optional(type),
        missing: t.allowMissing(type),
      }),
      either: type.or(type),
      intersection: type.and(type),
      comment: type.comment("generic"),
      matcher: t.when(type, value => value),
    };
  }

  const checks = compose(t.str);
  expect(checks.array.guard([ "hello" ])).toBe(true);
  expect(checks.map.guard(new Map([[ "key", "value" ]]))).toBe(true);
  expect(checks.set.guard(new Set([ "value" ]))).toBe(true);
  expect(checks.dict.guard({ key: "value" })).toBe(true);
  expect(checks.maybe.guard(null)).toBe(true);
  expect(checks.struct.guard({ value: "hello" })).toBe(true);
  expect(checks.either.guard("hello")).toBe(true);
  expect(checks.intersection.guard("hello")).toBe(true);
  expect(checks.comment.guard("hello")).toBe(true);
  expect(checks.matcher.run("hello")).toBe("hello");
});
