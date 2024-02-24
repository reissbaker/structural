import { Result } from "../result";
import { Type, DefaultIntersect, Either, Comment } from "../type";
import { Struct, optional, MissingKey, TypeStruct, UnwrappedTypeStruct, FieldDef, OptionalKey, MergeIntersect } from "./struct";
import { Dict } from "./struct";
import { SetType } from "./set";
import { Arr } from "./array";
import { MapType } from "./map";

type MakeOptional<T extends FieldDef> = T extends Type<any> ? OptionalKey<T> :
  T extends MissingKey<infer K> ? OptionalKey<K> : T;

type DeepPartialTypeStruct<T extends TypeStruct> = {
  [K in keyof T]: T[K] extends Struct<infer T2> ? OptionalKey<Struct<DeepPartialTypeStruct<T2>>> :
    MakeOptional<T[K]>
}

type PartialTypeStruct<T extends TypeStruct> = {
  [K in keyof T]: MakeOptional<T[K]>
};

export class PartialStruct<T extends TypeStruct> extends Type<UnwrappedTypeStruct<PartialTypeStruct<T>>> {
  private readonly hiddenStruct: Struct<PartialTypeStruct<T>>;
  constructor(readonly struct: Struct<T>) {
    super();
    const partialDef: Partial<PartialTypeStruct<T>> = {};
    for(const k in struct.definition) {
      const v = struct.definition[k];
      if(v instanceof MissingKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type);
      }
      else if(v instanceof OptionalKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type);
      }
      else {
        //@ts-ignore
        partialDef[k] = optional(v);
      }
    }
    this.hiddenStruct = new Struct(partialDef as PartialTypeStruct<T>, struct.exact);
  }
  check(val: any): Result<UnwrappedTypeStruct<PartialTypeStruct<T>>> {
    return this.hiddenStruct.check(val);
  }
  sliceResult(val: any): Result<UnwrappedTypeStruct<PartialTypeStruct<T>>> {
    return this.hiddenStruct.sliceResult(val);
  }
}

export class DeepPartial<T extends TypeStruct> extends Type<UnwrappedTypeStruct<DeepPartialTypeStruct<T>>> {
  readonly struct: Struct<DeepPartialTypeStruct<T>>;
  readonly hasNested: boolean;
  constructor(readonly ogstruct: Struct<T>) {
    super();
    this.hasNested = hasNested(ogstruct);
    const partialDef: Partial<DeepPartialTypeStruct<T>> = {};
    for(const k in ogstruct.definition) {
      const v = ogstruct.definition[k];
      if(v instanceof MissingKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type);
      }
      else if(v instanceof OptionalKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type);
      }
      else {
        const deepKind = deepPartialKind(v);
        // @ts-ignore
        partialDef[k] = optional(deepKind);
      }
    }
    this.struct = new Struct(partialDef as DeepPartialTypeStruct<T>, ogstruct.exact);
  }

  check(val: any) {
    return this.struct.check(val);
  }

  sliceResult(val: any) {
    return this.struct.sliceResult(val);
  }
}

export const Nested = [
  Struct,
  PartialStruct,
  Dict,
  SetType,
  MapType,
  Arr,
  Either,
  DefaultIntersect,
  MergeIntersect,
  Comment,
] as const;
export type NestedType = InstanceType<(typeof Nested)[number]>;

function deepPartialKind(kind: Type<any>): Type<any> {
  if(isNested(kind)) return handleNested(kind);
  return kind;
}

function handleNested(kind: NestedType): Type<any> {
  if(kind instanceof Struct) {
    if(hasNested(kind)) {
      return new DeepPartial(kind);
    }
    return new PartialStruct(kind);
  }
  if(kind instanceof PartialStruct) return new DeepPartial(kind.struct);
  if(kind instanceof Comment) return new Comment(kind.commentStr, deepPartialKind(kind.wrapped));
  if(kind instanceof Dict) return new Dict(deepPartialKind(kind.valueType), kind.namedKey);
  if(kind instanceof SetType) return new SetType(deepPartialKind(kind.valueType));
  if(kind instanceof MapType) return new MapType(deepPartialKind(kind.keyType), deepPartialKind(kind.valueType));
  if(kind instanceof Arr) return new Arr(deepPartialKind(kind.elementType));
  if(kind instanceof Either) return new Either(deepPartialKind(kind.l), deepPartialKind(kind.r));
  if(kind instanceof MergeIntersect) return new DefaultIntersect(deepPartialKind(kind.l), deepPartialKind(kind.r));
  return new DefaultIntersect(deepPartialKind(kind.l), deepPartialKind(kind.r));
}

function isNested(kind: Type<any> | NestedType): kind is NestedType {
  for(const t of Nested) {
    if(kind instanceof t) return true;
  }
  return false;
}

function hasNested(struct: Struct<any>) {
  for(const k in struct.definition) {
    if(isNested(struct.definition[k])) return true;
  }
  return false;
}

export function partial<T extends TypeStruct>(struct: Struct<T>): PartialStruct<T> {
  return new PartialStruct(struct);
}
export function deepPartial<T extends TypeStruct>(struct: Struct<T>): DeepPartial<T> {
  return new DeepPartial(struct);
}
