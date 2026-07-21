import { Comment, Either, Intersection, Validation } from "./type";
import { TypeOf } from "./checks/type-of";
import { InstanceOf } from "./checks/instance-of";
import { Value } from "./checks/value";
import { Arr } from "./checks/array";
import { PartialStruct, Struct, MissingKey, OptionalKey, Dict, MergeIntersect } from "./checks/struct";
import { MapType } from "./checks/map";
import { SetType } from "./checks/set";
import { Any } from "./checks/any";
import { Is } from "./checks/is";
import { Never } from "./checks/never";
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
                          additionalProperties?: false | JSONSchema,
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
  if(type instanceof Intersection) return fromIntersection(type, options);
  if(type instanceof MergeIntersect) return fromMergeIntersect(type, options);
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

  return fromPartial(type, options);
}

function areSerializableValues(types: Array<Kind>): types is Array<Value<JSONValue>> {
  for(const type of types) {
    if(!(type instanceof Value)) return false;
    if(!isSerializable(type.val)) return false;
  }
  return true;
}

function isSerializable(value: any): value is JSONValue {
  if(value === null) return true;
  if(typeof value === "string" || typeof value === "boolean") return true;
  if(typeof value === "number") return Number.isFinite(value);
  if(typeof value !== "object") return false;
  if(Array.isArray(value)) return value.every(isSerializable);

  const prototype = Object.getPrototypeOf(value);
  if(prototype !== Object.prototype && prototype !== null) return false;

  const keys = Reflect.ownKeys(value);
  if(keys.some(key => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key))) {
    return false;
  }
  return keys.every(key => isSerializable(value[key]));
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

function fromIntersection(
  type: Intersection<any>,
  options: Required<Options>,
): JSONSchema {
  const validations = type.operands.filter(
    (operand): operand is Validation<any> => operand instanceof Validation
  );
  if(validations.length > 0 && options.errorOnValidations) {
    throw `Structural type contains a validation, but errorOnValidations was set to true`;
  }

  const operands = type.operands.filter(operand => !(operand instanceof Validation));
  const schema: JSONSchema = operands.length === 1
    ? typeToSchema(operands[0], options)
    : { allOf: operands.map(operand => typeToSchema(operand, options)) };

  if(validations.length === 0) return schema;
  return {
    description: validations.map(validation => validation.desc).join("\n"),
    ...schema,
  };
}

function fromMergeIntersect(
  type: MergeIntersect<any>,
  options: Required<Options>,
): JSONSchema {
  const containsExact = type.operands.some(operand => {
    if(operand instanceof Struct) return operand.exact;
    if(operand instanceof PartialStruct) return operand.struct.exact;
    return false;
  });
  if(!containsExact) {
    return {
      allOf: type.operands.map(operand => typeToSchema(operand, options)),
    };
  }

  const propertySchemas: { [key: string]: JSONSchema[] } = {};
  const required = new Set<string>();
  const restSchemas: JSONSchema[] = [];
  let exact = true;

  for(const operand of type.operands) {
    if(operand instanceof Dict) {
      exact = false;
      restSchemas.push(typeToSchema(operand.valueType, options));
      continue;
    }

    const struct = operand instanceof PartialStruct ? operand.reify() : operand;
    if(Object.getOwnPropertySymbols(struct.definition).length > 0) {
      throw `Symbol properties can't be represented in JSON Schema`;
    }
    exact = exact && struct.exact;

    for(const key of Object.keys(struct.definition)) {
      const field = struct.definition[key];
      if(!(field instanceof MissingKey || field instanceof OptionalKey)) required.add(key);
      const schema = typeToSchema(
        field instanceof MissingKey || field instanceof OptionalKey ? field.type : field,
        options,
      );
      if(propertySchemas[key]) propertySchemas[key].push(schema);
      else propertySchemas[key] = [ schema ];
    }
  }

  const properties: { [key: string]: JSONSchema } = {};
  for(const key of Object.keys(propertySchemas)) {
    properties[key] = combineSchemas(propertySchemas[key].concat(restSchemas));
  }

  const schema: {
    type: "object",
    required: string[],
    properties: { [key: string]: JSONSchema },
    additionalProperties?: false | JSONSchema,
  } = {
    type: "object",
    required: Array.from(required),
    properties,
  };
  if(restSchemas.length > 0) schema.additionalProperties = combineSchemas(restSchemas);
  else if(exact) schema.additionalProperties = false;
  return schema;
}

function combineSchemas(schemas: JSONSchema[]): JSONSchema {
  if(schemas.length === 1) return schemas[0];
  return { allOf: schemas };
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
    case "object": return {
      anyOf: [
        { type: "object", properties: {} },
        { type: "array" },
      ],
    };
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
  if(Object.getOwnPropertySymbols(type.definition).length > 0) {
    throw `Symbol properties can't be represented in JSON Schema`;
  }

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

  const schema: JSONSchema = {
    type: 'object',
    required, properties,
  };
  if(type.exact) schema.additionalProperties = false;
  return schema;
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

function fromPartial(type: PartialStruct<any>, options: Required<Options>): JSONSchema {
  // Since Partial<T> only makes top-level keys optional, we just modify the required array
  const schema = fromStruct(type.struct, options);
  if('required' in schema) schema.required = [];
  return schema;
}

function flatTypes(
  klass: { new(...args: any): Either<any, any> },
  node: Kind
): Array<Kind> {
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
