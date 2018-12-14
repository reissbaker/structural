import * as t from "..";

test("allows type narrowing for exhaustiveness checking", () => {
  // Let's write a function that takes a validation, and see if we can use type narrowing with
  // successive `if` statements to get ourselves to be able to call this function on a `t.Kind`.
  const takesValidation = (v: t.Validation<any>) => {
    return v;
  };

  // Now let's write a function that takes a t.Kind, and see if we can narrow it with `if`
  // statements to a t.Validation, without ever directly checking for `if(u instanceof
  // t.Validation)`
  const fn = (u: t.Kind) => {
    if(u instanceof t.Any) {
      return "any";
    }
    if(u instanceof t.SetType) {
      return "set";
    }
    if(u instanceof t.MapType) {
      return "map";
    }
    if(u instanceof t.Dict) {
      return "dict";
    }
    if(u instanceof t.Struct) {
      return "struct";
    }
    if(u instanceof t.Arr) {
      return "array";
    }
    if(u instanceof t.Value) {
      return "value";
    }
    if(u instanceof t.InstanceOf) {
      return "instanceof";
    }
    if(u instanceof t.TypeOf) {
      return "typeof";
    }
    if(u instanceof t.Either) {
      return "either";
    }
    if(u instanceof t.Intersect) {
      return "intersect";
    }
    if(u instanceof t.Is) {
      return "is"
    }

    // This should compile even though we never ran `if(u instanceof Validation)`, because we've
    // narrowed the type to just Validation by checking for everything else that `Kind` could be.
    //
    // This also allows us to do exhaustiveness checking: if we haven't enumerated every possible
    // option before this, this will fail compilation, since `u` could be one of the classes we
    // haven't enumerated.
    takesValidation(u);
    return "validation";
  };

  expect(fn(t.any)).toEqual("any");
});
