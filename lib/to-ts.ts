import { Type, Comment, Either, Intersect, Validation } from "./type";
import { TypeOf } from "./checks/type-of";
import { InstanceOf } from "./checks/instance-of";
import { Value } from "./checks/value";
import { Arr } from "./checks/array";
import { Struct, OptionalKey } from "./checks/struct";
import { Dict } from "./checks/dict";
import { MapType } from "./checks/map";
import { SetType } from "./checks/set";
import { Any } from "./checks/any";
import { Is } from "./checks/is";
import { Never } from "./checks/never";
import { Kind } from "./kind";

type ToTypescriptOpts = {
  useReference?: {
    [ref: string]: Type<any>,
  },

  indent: string,
  indentLevel: number,
};

export type TypescriptUserOpts = Partial<ToTypescriptOpts> & {
  assignToType?: string,
};

type SingleConversionWithOpts = [ type: Kind, userOpts: TypescriptUserOpts ];
type SingleConversion = [ type: Kind ];
type MultipleConversion = [ types: { [name: string]: Kind } ];

export function toTypescript(...args: SingleConversion | SingleConversionWithOpts | MultipleConversion): string {
  if(args.length === 2) {
    const [ type, userOpts ] = args;
    const opts = Object.assign({ indent: "  ", indentLevel: 0 }, userOpts);
    // assignToType is only valid at the top level, so delete it if it exists
    delete opts.assignToType;

    const ts = toTS(type, opts);

    if(userOpts.assignToType) return `type ${userOpts.assignToType} = ${ts};`;
    return ts;
  }

  const arg = args[0]
  if(arg instanceof Type) return toTypescript(arg, {});

  const keys = Object.keys(arg);
  if(keys.length === 0) return "";
  const output: string[] = [];
  for(const key of keys) {
    const refs = Object.assign({}, arg);
    delete refs[key];
    output.push(toTypescript(arg[key], {
      useReference: refs,
      assignToType: key,
    }));
  }
  return output.join("\n\n");
}

function toTS(type: Kind, opts: ToTypescriptOpts): string {
  if(opts.useReference) {
    for(const key in opts.useReference) {
      const val = opts.useReference[key];
      if(val === type) return key;
    }
  }

  if(type instanceof Comment) return fromComment(type, opts);
  if(type instanceof Either) return fromEither(type, opts);
  if(type instanceof Intersect) return fromIntersect(type, opts);
  if(type instanceof Validation) return fromValidation();
  if(type instanceof TypeOf) return fromTypeof(type);
  if(type instanceof InstanceOf) return fromInstanceOf(type);
  if(type instanceof Value) return fromValue(type);
  if(type instanceof Arr) return fromArr(type, opts);
  if(type instanceof Struct) return fromStruct(type, opts);
  if(type instanceof Dict) return fromDict(type, opts);
  if(type instanceof MapType) return fromMap(type, opts);
  if(type instanceof SetType) return fromSet(type, opts);
  if(type instanceof Any) return fromAny();
  if(type instanceof Is) return fromIs(type);
  return fromNever(type);
}

function fromComment(c: Comment<any>, opts: ToTypescriptOpts) {
  const i = indent(opts);
  const commentLines = formatCommentString(c.commentStr, opts);
  return `${commentLines}\n${i}${toTS(c.wrapped, opts)}`;
}

function formatCommentString(commentStr: string, opts: ToTypescriptOpts) {
  const i = indent(opts);

  const commentLines = commentStr.split("\n").map(line => {
    return line.trim();
  }).filter(line => line !== "");

  if(commentLines.length === 0) return "";
  if(commentLines.length === 1) {
    return `// ${commentLines[0]}`;
  }

  const lines = [ '/*' ]
  for(const line of commentLines) {
    lines.push(`${i} * ${line.trim()}`);
  }
  lines.push(`${i} */`);
  return lines.join("\n");
}

// TODO: Should either strip immediate-child comments?
function fromEither(e: Either<any, any>, opts: ToTypescriptOpts) {
  const i = indent(opts);
  return [
    toTS(e.l, opts),
    `${i}${opts.indent}| ${toTS(e.r, {...opts, indentLevel: opts.indentLevel + 1})}`,
  ].join("\n");
}

// TODO: Should intersect strip immediate-child comments?
function fromIntersect(i: Intersect<any, any>, opts: ToTypescriptOpts) {
  // Handle validations chained with actual TS types, converting them to comments
  if(i.left instanceof Validation) return toTS(new Comment(i.left.desc, i.r), opts);
  if(i.r instanceof Validation) return toTS(new Comment(i.r.desc, i.left), opts);

  const indentation = indent(opts);
  return [
    toTS(i.left, opts),
    `${indentation}${opts.indent}& ${toTS(i.r, {...opts, indentLevel: opts.indentLevel + 1})}`,
  ].join("\n");
}

function fromValidation(): string {
  throw new Error(
    "Can't convert arbitrary validation functions to TypeScript types; make sure to .and() it " +
      "with a valid type, and it will be converted into a comment above the type"
  );
}

function fromTypeof(t: TypeOf<any>): string {
  switch(t.typestring) {
    case "undefined": return t.typestring;
    case "object": return "Object";
    case "boolean": return t.typestring;
    case "number": return t.typestring;
    case "bigint": return "BigInt";
    case "string": return t.typestring;
    case "symbol": return "Symbol";
    case "function": return "Function";
  }
}

function fromInstanceOf(i: InstanceOf<any>) {
  if(!i.klass.name) throw new Error("Can't convert anonymous classes to TypeScript");
  return `${i.klass.name}`;
}

function fromValue(v: Value<any>) {
  const vType = typeof v.val;
  if(vType !== "string" && vType !== "number" && vType !== "boolean" && v.val !== null && v.val !== undefined) {
    throw new Error(
      "Only string, numeric, undefined, boolean, and null value types can be auto-converted to TypeScript"
    );
  }
  if(vType === "string") return JSON.stringify(v.val);

  return `${v.val}`;
}

function fromArr(a: Arr<any>, opts: ToTypescriptOpts) {
  return `Array<${toTS(a.elementType, opts)}>`;
}

function fromStruct(s: Struct<any>, opts: ToTypescriptOpts) {
  const lines = [ "{" ];
  const keyOpts = {
    ...opts,
    indentLevel: opts.indentLevel + 1,
  };
  const keyIndent = indent(keyOpts);
  const keys = Object.keys(s.definition);

  for(let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyType = [ key ];
    const val = s.definition[key];
    if(val instanceof OptionalKey) keyType.push("?");
    keyType.push(": ");
    const stripped = stripOuterComments(val);
    if(stripped.comments.length > 0) {
      // Visually separate the start of a commented field unless it's the first field
      if(i !== 0) lines.push("");
      // Put the comment on the line above the key
      lines.push(keyIndent + formatCommentString(stripped.comments.join("\n"), keyOpts));
    }
    keyType.push(toTS(stripped.inner, keyOpts));
    keyType.push(",");
    lines.push(keyIndent + keyType.join(""));
    // Visually separate the end of a commented field, unless it's the last field
    if(stripped.comments.length > 0 && i !== keys.length - 1) lines.push("");
  }
  lines.push(indent(opts) + "}");

  return lines.join("\n");
}

type StrippedComments = {
  comments: string[],
  inner: Kind,
};

function stripOuterComments(t: Kind | OptionalKey<any>): StrippedComments {
  if(t instanceof OptionalKey) return stripOuterComments(t.type);
  if(t instanceof Comment) {
    const inner = stripOuterComments(t.wrapped);
    return {
      comments: [ t.commentStr, ...inner.comments ],
      inner: inner.inner,
    }
  }

  if(t instanceof Intersect) {
    if(t.left instanceof Validation) return stripOuterComments(new Comment(t.left.desc, t.r));
    if(t.r instanceof Validation) return stripOuterComments(new Comment(t.r.desc, t.left));
  }

  return {
    comments: [],
    inner: t,
  };
}

function fromDict(d: Dict<any>, opts: ToTypescriptOpts) {
  const i = indent(opts);
  const valString = toTS(d.valueType, {...opts, indentLevel: opts.indentLevel + 1});

  // For single-line values, return a single-line dict
  if(valString.indexOf("\n") < 0) return `{[${d.namedKey}: string]: ${valString}}`;

  // For multiline values, return a multiline dict
  return [
    "{",
    `${i}${opts.indent}[key: string]: ${valString}`,
    `${i}}`,
  ].join("\n");
}

function fromMap(m: MapType<any, any>, opts: ToTypescriptOpts) {
  const keyString = toTS(m.keyType, opts);
  const valString = toTS(m.valueType, opts);
  return `Map<${keyString}, ${valString}>`;
}

function fromSet(s: SetType<any>, opts: ToTypescriptOpts) {
  const valString = toTS(s.valueType, opts);
  return `Set<${valString}>`;
}

function fromAny() {
  return "any";
}

function fromIs(i: Is<any>) {
  return i.name;
}

// Despite not using the type, we take it to help ensure exhaustiveness checking in the toTS fn
function fromNever(_: Never) {
  return "never";
}

function indent(opts: ToTypescriptOpts) {
  return opts.indent.repeat(opts.indentLevel);
}
