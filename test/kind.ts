import * as t from "..";

test("allows type narrowing for exhaustiveness checking", () => {
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
    else {
      // this should compile, because we've narrowed the type to just Validation.
      // this also allows us to do exhaustiveness checking: if we haven't enumerated every possible
      // option before this, this will fail compilation, since `u` could be one of the classes we
      // haven't enumerated.
      const v: t.Validation<any> = u;
      return `validation: ${v}`;
    }
  };

  expect(fn(t.any)).toEqual("any");
});