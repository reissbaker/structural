import * as t from "..";

test("comments delegate checking to their wrapped values", () => {
  const commentedNumber = t.num.comment("A number");
  const num = commentedNumber.assert(5);
  expect(num + 1).toEqual(6);
});

test("multiline comments don't generate extra lines for pure whitespace", () => {
  const commented = t.num.comment(`
    A test multiline comment.
    The preceding and trailing newlines should be ignored.
  `);
  expect(t.toTypescript(commented)).toEqual(
    "/*\n * A test multiline comment.\n * The preceding and trailing newlines should be ignored.\n */\nnumber"
  );
});
