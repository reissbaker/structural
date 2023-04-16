import * as t from "..";

test("comments delegate checking to their wrapped values", () => {
  const commentedNumber = t.num.comment("A number");
  const num = commentedNumber.assert(5);
  expect(num + 1).toEqual(6);
});
