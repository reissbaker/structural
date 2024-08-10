import * as t from "..";

test(".toError converts to a special TypeError type", () => {
  const type = t.value("hello");
  const result = type.check("world");
  const resultType = t.instanceOf(t.Err);
  const err = resultType.check(result);
  expect(err.toError()).toBeInstanceOf(t.TypeError);
});
