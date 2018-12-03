## structural

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
your code. Structural supports advanced type system features like generics and
algebraic data types to keep your code extremely concise, and is null-safe: if
you say something is a string, it will never be `null` or `undefined`.

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
// type for Interns using the following type helper:
type UserType = t.GetType<typeof User>;
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

And you're done. And for TypeScript users, you'll never need to write the type
out again in the rest of your code: it's automatically inferred.

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

And for TypeScript users, JSON Schema is even worse! You'll also need the
following redundant type declaration somewhere in your source files:

```typescript
type UserType = {
  id: number,
  name: string,
  login: string,
  hirable: boolean,
}
```

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
