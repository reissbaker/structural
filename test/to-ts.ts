import * as t from "..";

test("assigns to a type if the option is given", () => {
  expect(
    t.toTypescript(t.subtype({
      orders: t.num,
    }), { assignToType: "Customer" })
  ).toEqual("type Customer = {\n  orders: number,\n};");
});

test("overwrites types with references if given the option", () => {
  const Customer = t.subtype({
    orders: t.num,
  });
  const Business = t.subtype({
    users: t.array(Customer),
  });

  expect(t.toTypescript(Business, {
    useReference: {
      Customer,
    }
  })).toEqual("{\n  users: Array<Customer>,\n}");
});

test("converts a whole bunch of types into a single readable TS output", () => {
  const Customer = t.subtype({
    orders: t.num,
  });
  const Business = t.subtype({
    users: t.array(Customer),
  });

  expect(t.toTypescript({ Customer, Business })).toEqual(
    "type Customer = {\n  orders: number,\n};\n\ntype Business = {\n  users: Array<Customer>,\n};"
  );
});
