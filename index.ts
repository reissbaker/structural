import { Err, Result } from "./lib/result";
import { Check } from "./lib/check";
import GetType from "./lib/get-type";

import typeOf from "./lib/checks/type-of";
import instanceOf from "./lib/checks/instance-of";
import value from "./lib/checks/value";
import arr from "./lib/checks/arr";
import { subtype } from "./lib/checks/struct";
import dict from "./lib/checks/dict";
import map from "./lib/checks/map";
import set from "./lib/checks/set";
import { num, str, bool, fn, sym, undef, nil, obj } from "./lib/checks/primitives";

// TODO: make these more robust tests
// TODO: test type inference. one way to do this: build up a struktural type, get the inner type
// with GetType, and assign it something that should fail the type checker. assert the type checker
// fails. also have vice-versa tests. unknown: can you ignore directories in the main tsconfig?
// otherwise your whole build will fail. maybe just have different root dirs.

const five = num.assert(5);
const isnull = nil.assert(null);
const strOrNum = str.or(num).assert("hi");
const struct = subtype({
  hi: str,
  age: num,
  nested: subtype({
    cool: bool,
  }),
}).assert({
  hi: "world",
  age: 5000,
  nested: {
    cool: false,
  }
});

const maybeBool = nil.or(bool).assert(null);

const dictionary = dict(str.or(num)).assert([ 1, 2, 3 ]);
