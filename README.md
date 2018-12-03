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
much less verbose to write and can live inside the same source files as the
rest of your code. Structural supports advanced type system features like
generics and algebraic data types to keep your code extremely concise, and is
null-safe: if you say something is a string, it will never be `null` or
`undefined`.

Structural is written in TypeScript and uses its type system to provide
automatic type inference for TypeScript consumers; you won't need to write your
types twice, once for static data and once for the runtime type checks. Here's
a quick example:

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
const data = await fetch(...);

// Assert the data matches the Intern type. For TypeScript users,
// the resulting `intern` variable is automatically inferred to
// have the type:
//
//     {
//       name: string,
//       employer: string,
//       job: {
//         role: string,
//       },
//       school: string,
//     }
//
// If the asssertion fails, an error is thrown.
try {
  const intern = Intern.assert(data);
} catch(e) {
  console.log(`Data ${data} did not match the Intern type`);
}

// For TypeScript users, you can get a reference to the Intern type
// using the following type helper:
type InternType = t.GetType<typeof Intern>;
```
