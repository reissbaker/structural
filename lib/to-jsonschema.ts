import { Type, Comment, Either, Intersect, Validation } from "./type";
import { TypeOf } from "./checks/type-of";
import { InstanceOf } from "./checks/instance-of";
import { Value } from "./checks/value";
import { Arr } from "./checks/array";
import { Struct, MissingKey, OptionalKey } from "./checks/struct";
import { Dict } from "./checks/dict";
import { MapType } from "./checks/map";
import { SetType } from "./checks/set";
import { Any } from "./checks/any";
import { Is } from "./checks/is";
import { Never } from "./checks/never";
import { PartialStruct, DeepPartial } from "./checks/partial";
import { Kind } from "./kind";

export const JSON_SCHEMA_VERSION = "https://json-schema.org/draft/2020-12/schema" as const;
type TopLevel<T> = T & {
  $schema: typeof JSON_SCHEMA_VERSION,
  title: string,
};

// TODO: a title annotation built into structural. description can be transformed from comments.
// you should also have a variant of toJSONSchema that mandates top-level titles by insisting that
// the type passed in is a Title type instead of a Kind type.
type Annotated<T> = T & {
  description?: string,
};

export type JSONValue = null
                      | string
                      | number
                      | boolean
                      | Array<JSONValue>
                      | { [key: string]: JSONValue }
                      ;

export type JSONSchema = Annotated<{ type: "string" }>
                       | Annotated<{ type: "number" }>
                       | Annotated<{ type: "boolean" }>
                       | Annotated<{ type: "null" }>
                       | Annotated<{}> // {} is JSON schema's any type
                       | Annotated<{
                         type: "object",
                         required: string[],
                         properties: {
                           [key: string]: JSONSchema,
                         },
                       }>
                       | Annotated<{
                         type: "object",
                         // Dict<T> type is { properties: {}, additionalProperties: T }
                         properties: {},
                         additionalProperties?: JSONSchema,
                       }>
                       | Annotated<{
                         type: "array",
                         items?: JSONSchema,
                       }>
                       | Annotated<{
                         // intersection
                         allOf: JSONSchema[],
                       }>
                       | Annotated<{
                         // union
                         anyOf: JSONSchema[],
                       }>
                       | Annotated<{
                         // technically this can be represented as anyOf([ ...consts ]), but for
                         // readability if all of a union is const values imo you should output an
                         // enum rather than the more complex type
                         enum: Array<JSONValue>
                       }>
                       | Annotated<{
                         const: JSONValue,
                       }>
                       ;

type Options = {
  errorOnValidations?: boolean,
  errorOnIs?: boolean,
  errorOnNever?: boolean,
};
const defaultOpts: Required<Options> = {
  errorOnValidations: true,
  errorOnIs: true,
  errorOnNever: true,
};

export function toJSONSchema(title: string, type: Kind, opts?: Options): TopLevel<JSONSchema> {
  const options = {
    ...defaultOpts,
    ...opts,
  };

  return addMetadata(title, typeToSchema(type, options));
}

function typeToSchema(type: Kind, options: Required<Options>): JSONSchema {
  if(type instanceof Comment) {
    return {
      description: formatCommentString(type.commentStr),
      ...typeToSchema(type.wrapped, options)
    };
  }
  if(type instanceof Either) return fromEither(type, options);
  if(type instanceof Intersect) return fromIntersect(type, options);
  if(type instanceof Validation) return fromValidation(type, options);
  if(type instanceof TypeOf) return fromTypeof(type);
  if(type instanceof InstanceOf) {
    throw `Structural instanceOf types can't be converted to JSON Schema`;
  }
  if(type instanceof Value) return fromValue(type);
  if(type instanceof Arr) return fromArray(type, options);
  if(type instanceof Struct) return fromStruct(type, options);
  if(type instanceof Dict) return fromDict(type, options);
  if(type instanceof MapType) {
    throw `Structural Map types can't be converted to JSON Schema; consider using a dict`;
  }
  if(type instanceof SetType) {
    throw `Structural Set types can't be converted to JSON Schema; consider using an array`;
  }
  if(type instanceof Any) {
    return {};
  }
  if(type instanceof Is) return fromIs(type, options);
  if(type instanceof Never) return fromNever(type, options);
  if(type instanceof DeepPartial) return fromDeepPartial(type, options);

  return fromPartial(type, options);
}

function areSerializableValues(types: Array<Type<any>>): types is Array<Value<JSONValue>> {
  for(const type of types) {
    if(!(type instanceof Value)) return false;
    if(!isSerializable(type.val)) return false;
  }
  return true;
}

function isSerializable(value: any): value is JSONValue {
  try {
    JSON.parse(JSON.stringify(value));
  } catch {
    return false;
  }
  return true;
}

function fromEither(type: Either<any, any>, options: Required<Options>): JSONSchema {
  // While the Either type could theoretically just map to recursive anyOf schemas, in practice it's
  // much more readable to have it attempt to generate an enum list of all values (if it's a bunch
  // of values unioned together, AND the values are all serializable to JSON), or a flat anyOf list
  // otherwise. So, we walk the tree and collect all the types, and do that.
  const allTypes = flatTypes(Either, type);

  if(areSerializableValues(allTypes)) {
    return {
      enum: allTypes.map(t => t.val),
    };
  }

  return {
    anyOf: allTypes.map(type => typeToSchema(type, options)),
  };
}

function fromIntersect(type: Intersect<any, any>, options: Required<Options>): JSONSchema {
  if(type.r instanceof Validation) {
    if(options.errorOnValidations) {
      throw `Structural type contains a validation, but errorOnValidations was set to true`;
    }
    return {
      description: type.r.desc,
      ...typeToSchema(type.l, options),
    };
  }
  return {
    allOf: flatTypes(Intersect, type).map(t => typeToSchema(t, options)),
  };
}

function fromValidation(type: Validation<any>, options: Required<Options>): JSONSchema {
  if(options.errorOnValidations) {
    throw `Structural type contains a validation, but errorOnValidations was set to true`;
  }

  return {
    description: type.desc
  };
}

function fromTypeof(type: TypeOf<any>): JSONSchema {
  switch(type.typestring) {
    case "string": return { type: "string" };
    case "number": return { type: "number" };
    case "boolean": return { type: "boolean" };
    case "object": return { type: "object", properties: {} };
  }
  throw `Can't convert Structural TypeOf<${type.typestring}> checks into JSON Schema`
}

function fromValue(type: Value<any>): JSONSchema {
  if(!isSerializable(type.val)) {
    throw `Value type expects ${type.val}, but it isn't serializable to JSON`;
  }

  if(type.val === null) return { type: "null" };

  return {
    const: type.val,
  };
}

function fromArray(type: Arr<any>, options: Required<Options>): JSONSchema {
  return {
    type: 'array',
    items: typeToSchema(type.elementType, options),
  };
}

function fromStruct(type: Struct<any>, options: Required<Options>): JSONSchema {
  const properties: { [key: string]: JSONSchema } = {};
  const required: string[] = [];
  const keys = Object.keys(type.definition);
  for(const key of keys) {
    const val = type.definition[key];
    if(val instanceof MissingKey || val instanceof OptionalKey) {
      properties[key] = typeToSchema(val.type, options);
    }
    else {
      required.push(key);
      properties[key] = typeToSchema(val, options);
    }
  }

  return {
    type: 'object',
    required, properties,
  };
}

function fromDict(type: Dict<any>, options: Required<Options>): JSONSchema {
  return {
    type: 'object',
    properties: {},
    additionalProperties: typeToSchema(type.valueType, options),
  };
}

function fromIs(type: Is<any>, options: Required<Options>) {
  if(options.errorOnIs) {
    throw `Structural type contains an Is check, but errorOnIs was set to true`;
  }

  return {
    description: type.name,
  };
}

function fromNever(_: Never, options: Required<Options>): JSONSchema {
  if(options.errorOnNever) {
    throw `Structural type contains a Never check, but errorOnNever was set to true`;
  }

  return {
    allOf: [ { type: "string" }, { type: "number" } ],
  };
}

function fromDeepPartial(type: DeepPartial<any>, options: Required<Options>): JSONSchema {
  // DeepPartial's .struct accessor is actually a rewritten struct with all keys made deeply
  // optional
  return fromStruct(type.struct, options);
}

function fromPartial(type: PartialStruct<any>, options: Required<Options>): JSONSchema {
  // Since Partial<T> only makes top-level keys optional, we just modify the required array
  const schema = fromStruct(type.struct, options);
  if('required' in schema) schema.required = [];
  return schema;
}

function flatTypes(
  klass: { new(...args: any): Either<any, any> | Intersect<any, any> },
  node: Type<any>
): Array<Type<any>> {
  if(node instanceof klass) {
    return flatTypes(klass, node.l).concat(flatTypes(klass, node.r));
  }
  return [ node ];
}

function formatCommentString(commentStr: string) {
  const commentLines = commentStr.split("\n").map(line => {
    return line.trim();
  }).filter(line => line !== "");
  return commentLines.join("\n");
}

function addMetadata(title: string, schema: JSONSchema): TopLevel<JSONSchema> {
  return {
    $schema: JSON_SCHEMA_VERSION,
    title,
    ...schema,
  };
}
