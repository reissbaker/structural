# Structural

[![npm version](https://badge.fury.io/js/structural.svg)](https://www.npmjs.com/package/structural)
[![Maintainability](https://api.codeclimate.com/v1/badges/2e3709dce0e6e5e44217/maintainability)](https://codeclimate.com/github/reissbaker/structural/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/2e3709dce0e6e5e44217/test_coverage)](https://codeclimate.com/github/reissbaker/structural/test_coverage)
[![CircleCI](https://img.shields.io/circleci/project/github/reissbaker/structural/master.svg)](https://circleci.com/gh/reissbaker/structural)

Structural is a __runtime type checker__ for JavaScript and TypeScript that
allows you to execute type-checking code on data you only have access to at
runtime, like JSON data from network requests, YAML files from disk, or the
results of SQL queries. Structural is written in TypeScript and has deep
integration with its type system, allow TypeScript users to automatically get
compile-time type inference for their Structural types in addition to runtime
type checking. Structural types can also be automatically converted to actual,
executable TypeScript automatically, for generating documentation or
integrating with tools that understand TS type syntax.

### Table of contents

* [Why?](#why)
* [TypeScript integration](#typescript-integration)
* [Comparisons](#comparisons)
  * [Structural](#structural-1)
  * [JSON Schema](#json-schema)
* [Advanced type system features](#advanced-type-system-features)
* [Custom validations](#custom-validations)
* [Slicing keys](#slicing-keys)
* [Generating TypeScript](#generating-typescript)

## Why?

Typically with data received at runtime, you're forced to do one of the
following:

1. Write a bunch of `if` statements to validate each piece of data;
2. Write piles of schema validation code in various verbose languages (e.g.
   JSON schema, XML DTDs / Relax-NG / Schema / etc.);
3. Or skip validating the data and pray.

Structural allows you to skip writing validation code and instead encode
validation logic into types defined in TypeScript or JavaScript; types are less
verbose to write and can live inside the same source files as the rest of your
code.

Here's a simple example:

```typescript
import * as t from "structural";

// Define a User type
const User = t.subtype({
  id: t.num,
  name: t.str,
});

// Grab some data...
const json = await fetch(...);
const data = JSON.parse(data);

// Assert the data matches the User type.
try {
  const user = User.assert(data);
} catch(e) {
  console.log(`Data ${data} did not match the User type`);
  console.log(`It failed with the following error: ${e}`);
}
```

Structural's type system strives to support every feature of TypeScript's
compile-time type system, but at runtime. This includes support for the
following advanced features:

* __Generics.__
* __Null safety:__ if you say something is a string, it will never be `null` or
  `undefined`.
* __Structural subtyping:__ if `Person` records are defined by having a `name`,
  an object with both a `name` and an `eyeColor` is a valid `Person`.
* __Algebraic data types:__ use `.and` and `.or` on types to compose them via
  type intersections or unions.


## TypeScript integration

Structural is written in TypeScript and supports simple, transparent
compile-time type inference. You'll never have to write both a TypeScript type
and a Structural type: any Structural type will get automatically inferred into
a TypeScript type. For example:

```typescript
const User = t.subtype({
  id: t.num,
  name: t.str,
});

/*
In the following code, the `user` variable is automatically inferred to have
the following TypeScript type:

    {
      id: number,
      name: string,
    }

*/
const user = User.assert(data);

/*
 * You can get a reference to the inferred type for Users using the following
 * type helper:
 */
type UserType = t.GetType<typeof User>;

// This allows you to write typed function that operate on users like so:
function update(user: UserType) {
  // ...
}
```

You can even generate TypeScript types as source code from Structural types,
[as explained later in the docs](#generating-typescript).

## Comparisons with other frameworks

Let's compare a longer, more realistic sample of user validation code to the
equivalent JSON Schema:

#### Structural:
```typescript
const User = t.subtype({
  id: t.num,
  name: t.str,
  login: t.str,
  hireable: t.bool,
});
```

And in six lines, you're done. And for TypeScript users, you'll never need to
write the type out again in the rest of your code: it's automatically inferred.

#### JSON Schema:
```
{
  "$id": "https://example.com/user.schema.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "id": {
      "type": "number",
      "description": "The user ID"
    },
    "name": {
      "type": "string",
      "description": "The name of the user",
    },
    "login": {
      "type": "string",
      "description": "The login username",
    },
    "hireable": {
      "type": "boolean",
      "description": "Is the user hireable",
    }
  }
}
```

Clocking in at 23 lines of code, it's nearly 4x more verbose than the
equivalent Structural validation. And for TypeScript users, JSON Schema is even
worse! You'll also need the following redundant type declaration somewhere in
your source files:

```typescript
type UserType = {
  id: number,
  name: string,
  login: string,
  hirable: boolean,
}
```

And every time you update the JSON Schema, you'll need to keep the type in
sync, since it can't be inferred at compile time.

## Advanced type system features

Here's a more advanced example, showing how to compose types using type algebra
(`or` and `and`):

```typescript
import * as t from "structural";

const Person = t.subtype({
  name: t.str,
});

const HasJob = t.subtype({
  employer: t.str,
  job: t.subtype({
    role: t.str,
  }),
});

const HasSchool = t.subtype({
  school: t.str,
});

const Intern = Person.and(HasJob).and(HasSchool);

// Grab some data...
const json = await fetch(...);
const data = JSON.parse(json);

/*
Assert the data matches the Intern type. For TypeScript users,
the resulting `intern` variable is automatically inferred to
have the type:

    {
      name: string,
      employer: string,
      job: {
        role: string,
      },
      school: string,
    }

If the asssertion fails, an error is thrown.
*/
try {
  const intern = Intern.assert(data);
} catch(e) {
  console.log(`Data ${data} did not match the Intern type`);
}
```

## Custom validations

Structural supports writing custom validation functions that check values at
runtime. Functions should return true if the check passes, and false otherwise.

```typescript
import * as t;

const NonZeroNumber = t.num.validate(num => num !== 0);

// Passes:
NonZeroNumber.assert(1);

// Raises an error:
NonZeroNumber.assert(0);
```

## Slicing keys

By default, `assert` is zero-copy: the data you give it is the data that gets
returned. This means, for example, if you have the type:

```typescript
const Person = t.subtype({
  name: t.str,
});
```

And you give it the following data:

```typescript
const validated = Person.assert({
  name: "Matt",
  eyeColor: "green",
});
```

Then `validated` will be exactly the data you passed in:

```typescript
{
  name: "Matt",
  eyeColor: "green",
}
```

(Although if you're using TypeScript, the type system will rightfully prevent
you from accessing `eyeColor`, because you didn't declare it as part of the
type.)

This behavior is useful when you want to preserve the original data that was
passed in, or if you don't care about preserving it but want to avoid
unnecessary allocations. If you want to make sure `validated` only contains
exactly the data described in `Person`, though -- and you don't want to use an
`exact` type, because you don't want to fail on unknown keys -- Structural also
provides a `slice` method that is equivalent to `assert`, but makes sure to
only return data with the known keys described by the type. For example:

```typescript
const sliced = Person.slice({
  name: "Matt",
  eyeColor: "green",
});

/*
The contents of `sliced` are:

    {
      name: "Matt",
    }

because `eyeColor` was not defined in the Person type
*/
```

The `slice` call can be useful when you're calling third-party APIs and only
care about a few fields, and then intend to store the returned data. With
`assert`, you'd store the entire returned object, which would waste space in
your data store; with `slice`, you'll only end up storing the data you care
about.

The `slice` method exists on all types, even ones without keys, so you can
safely drop it in to replace `assert` calls. For types that don't have keys,
like `t.num`, `slice` is an alias to `assert`; similarly, for types that may
have keys but don't track them in the type, like `t.obj` (which accepts any
object), `slice` is also an alias to `assert` since we don't know which keys to
slice out.

Call to `slice` work even through the algebraic types created with `.and` and
`.or`; for example:

```typescript
import * as t from "structural";

const Person = t.subtype({
  name: t.str,
});

const HasJob = t.subtype({
  employer: t.str,
  job: t.subtype({
    role: t.str,
  }),
});

const HasSchool = t.subtype({
  school: t.str,
});

const Intern = Person.and(HasJob).and(HasSchool);

const sliced = Intern.slice({
  name: "Jenkins",
  employer: "Mr. Walburn",
  job: {
    role: "Coffee fetcher",
  },
  alive: false,
});

/*
The contents of `sliced` are:

    {
      name: "Jenkins",
      employer: "Mr. Walburn",
      job: {
        role: "Coffee fetcher",
      },
    }

because `alive` wasn't defined in the Intern type.
*/
```

## Generating TypeScript

You can automatically convert Structural types to TypeScript types with the
`toTypescript` function. For example:

```typescript
const ts = t.toTypescript(t.subtype({
  id: t.num,
}));
```

The `ts` string would be:

```typescript
{
  id: number,
}
```

You can also generate TypeScript type definitions with type names by passing the
Structral types in as a hash; for example:

```typescript
const User = t.subtype({
  id: t.num,
});

t.toTypescript({ User });
```

Which generates:

```typescript
type User = {
  id: number,
};
```

### Comments

Structural provides some convenience methods for generating good TypeScript
code, allowing you to add comments to the code you generate. The comment
methods are no-ops at runtime, but help readability for your generated
TypeScript. Here's an example of a comment:

```typescript
t.subtype({
  name: t.str.comment("The user's full name"),
});
```

Running `t.toTypescript` on that struct would generate:

```typescript
{
  // The user's full name
  name: string,
}
```

Multiline comments are also supported and have generally-sensible output
formatting:

```typescript
t.subtype({
  bar: t.str.comment(`
    A multi-line comment.
    It documents the bar field.
  `),
});
```

Which would be generated as:

```typescript
{
  /*
   * A multi-line comment.
   * It documents the bar field.
   */
  bar: string,
}
```

### Renaming keys in dictionaries

By default, the `dict` type will name its keys `key`, like so:

```typescript
t.toTypescript(t.dict(t.num), { assignToType: "NumericDict" });

// Generates:
type NumericDict = {[key: string]: number};
```

Depending on your dictionary, you may want to use a more meaningful name than
just `key`. For example, if you're mapping customer names to order counts, it
might be useful to have the key be named `customer` for readability:

```typescript
t.toTypescript(
  t.dict(t.num).keyName("customer"),
  { assignToType: "OrderCount" },
);

// Generates:
type OrderCount = {[customer: string]: number};
```

### Readability for nested types

If you have a few nested types, you'll quickly realize that the generated
TypeScript is less than ideal in terms of readability: while it's technically
syntactically correct, it duplicates the structural type definitions in each
type; for example:

```typescript
const Customer = t.subtype({
  orders: t.num,
});
const Business = t.subtype({
  customers: t.array(Customer),
});

const customerTs = t.toTypescript(Customer, { assignToType: "Customer" });
const businessTs = t.toTypescript(Business, { assignToType: "Business" });
```

This would generate the following two type definitions:

```typescript
type Customer = {
  orders: number,
};
type Business = {
  customers: Array<{
    orders: number,
  }>,
};
```

While that's technically *correct*, it's pretty ugly from a readability
perspective. We'd much rather generate something like:

```typescript
type Customer = {
  orders: number,
};

type Business = {
  customers: Array<Customer>,
};
```

With `toTypescript`, that's pretty easy to do. Instead of passing in a single
type and assigning it to a type name, you can instead just pass in all the
types in a hash, and it'll de-duplicate everything for you and assign them type
names:

```typescript
toTypescript({ Customer, Business });
```

And it'll generate exactly what we wanted. It generates the types in the order
that they're specified in the hash, so make sure the ones you want to appear
first in the output are first in the hash, and so on and so forth.

This is a wrapper over some options you can pass into `toTypescript`. You
probably won't ever need to use these, but if you want more granular control:


#### `assignToType`

The `assignToType` option auto-generates the syntax to assign a type a name,
and inserting a semicolon after the type definition. For example:

```typescript
const ts = t.toTypescript(t.either(t.num, t.str), {
  assignToType: "id",
});
```

This would result in `ts` having the following value:

```typescript
type id = number
  | string;
```

#### `useReference`

The `useReference` option helps readability of deeply-nested types. Using the
example of `Customer` and `Business` Structral types from above, we can use
`useReference` to ensure that when we generate the `Business` type, it replaces
references to `Customer` with the id `Customer`, rather than re-generating the
entire structural type for `Customer` inline. For example:

```typescript
const Customer = t.subtype({
  orders: t.num,
});
const Business = t.subtype({
  customers: t.array(Customer),
});

const businessTs = t.toTypescript(Business, {
  assignToType: "Business"
  useReference: {
    Customer,
  },
});
```

Any value in the `useReference` hash will be replaced in the TypeScript output
with the key name. In this case, we're replacing `Customer` with `"Customer"`
(and using object shorthand syntax to make that relatively ergonomic). The
`businessTs` string would be:

```typescript
type Business = {
  customers: Array<Customer>,
};
```
