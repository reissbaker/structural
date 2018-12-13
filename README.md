## Structural

Structural is a runtime type checker for JavaScript and TypeScript that allows
you to run type-checking code on data you only have access to at runtime, such
as JSON read from network requests, YAML read from the filesystem, or the
results of SQL queries. Typically with data received at runtime, you're forced
to do one of the following:

1. Write extensive `if` statements to validate each piece of data;
2. Write lengthy schema validation code in a variety of different verbose
   languages (e.g. JSON schema, XML DTDs / Relax-NG / Schema / etc.);
3. Or skip validating the data and pray.

Structural allows you to skip writing out lengthy validation code, instead
encoding validation into types defined in TypeScript or JavaScript, which are
less verbose to write and can live inside the same source files as the rest of
your code. Structural supports advanced type system features like generics,
structural subtyping, and algebraic data types to keep your code extremely
concise, and is null-safe: if you say something is a string, it will never be
`null` or `undefined`.

Here's a simple example:

```typescript
import * as t from "structural";

const User = t.subtype({
  id: t.num,
  name: t.str,
  login: t.str,
  hireable: t.bool,
});

// Grab some data...
const json = await fetch(...);
const data = JSON.parse(data);

/*
Assert the data matches the User type.
For TypeScript users, the `user` variable is automatically inferred
to have the following type:

    {
      id: number,
      name: string,
      login: string,
      hireable: boolean
    }

If the data fails to validate, an error will be thrown.
*/

try {
  const user = User.assert(data);
} catch(e) {
  console.log(`Data ${data} did not match the User type`);
}

// For TypeScript users, you can get a reference to the inferred
// type for Users using the following type helper:
type UserType = t.GetType<typeof User>;

// This allows you to write typed function that operate on users
// like so:
function update(user: UserType) {
  // ...
}
```

Let's compare the User validation code to the equivalent JSON Schema:

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
