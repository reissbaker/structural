import { Type, KeyTrackingType, KeyTrackResult } from "../type";
import { Struct, optional, OptionalKey, TypeStruct, UnwrappedTypeStruct } from "./struct";
import { undef } from "./primitives";
import { Dict } from "./dict";


type MakeOptional<T extends Type<any> | OptionalKey<any>> = T extends Type<any> ? OptionalKey<T> : T;

type DeepPartialTypeStruct<T extends TypeStruct> = {
  [K in keyof T]: T[K] extends Struct<infer T2> ? OptionalKey<Struct<DeepPartialTypeStruct<T2>>> :
    MakeOptional<T[K]>
}

type PartialTypeStruct<T extends TypeStruct> = {
  [K in keyof T]: MakeOptional<T[K]>
};

export class PartialStruct<T extends TypeStruct> extends KeyTrackingType<UnwrappedTypeStruct<PartialTypeStruct<T>>> {
  private readonly hiddenStruct: Struct<PartialTypeStruct<T>>;
  constructor(readonly struct: Struct<T>) {
    super();
    const partialDef: Partial<PartialTypeStruct<T>> = {};
    for(const k in struct.definition) {
      const v = struct.definition[k];
      if(v instanceof OptionalKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type.or(undef));
      }
      else {
        //@ts-ignore
        partialDef[k] = optional(v.or(undef));
      }
    }
    this.hiddenStruct = new Struct(partialDef as PartialTypeStruct<T>, struct.exact);
  }
  checkTrackKeys(val: any): KeyTrackResult<UnwrappedTypeStruct<PartialTypeStruct<T>>> {
    return this.hiddenStruct.checkTrackKeys(val);
  }
}

export class DeepPartial<T extends TypeStruct> extends KeyTrackingType<UnwrappedTypeStruct<DeepPartialTypeStruct<T>>> {
  readonly struct: Struct<DeepPartialTypeStruct<T>>;
  readonly hasNested: boolean;
  constructor(readonly ogstruct: Struct<T>) {
    super();
    this.hasNested = hasNested(ogstruct);
    const partialDef: Partial<DeepPartialTypeStruct<T>> = {};
    for(const k in ogstruct.definition) {
      const v = ogstruct.definition[k];
      if(v instanceof OptionalKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type.or(undef));
      }
      else if(v instanceof Struct) {
        if(hasNested(v)) {
          //@ts-ignore
          partialDef[k] = optional(new DeepPartial(v).or(undef));
        }
        else {
          //@ts-ignore
          partialDef[k] = optional(new PartialStruct(v).or(undef));
        }
      }
      else if(v instanceof PartialStruct) {
        // @ts-ignore
        partialDef[k] = optional(new DeepPartial(v.struct).or(undef));
      }
      else if(v instanceof Dict) {
        //@ts-ignore
        partialDef[k] = optional(deepPartialDict(v, v.namedKey).or(undef));
      }
      else {
        //@ts-ignore
        partialDef[k] = optional(v.or(undef));
      }
    }
    this.struct = new Struct(partialDef as DeepPartialTypeStruct<T>, ogstruct.exact);
  }

  checkTrackKeys(val: any): KeyTrackResult<UnwrappedTypeStruct<DeepPartialTypeStruct<T>>> {
    return this.struct.checkTrackKeys(val);
  }
}

function deepPartialDict(d: Dict<any>): Dict<any> {
  const innerV = d.valueType;
  if(innerV instanceof Struct) {
    return new Dict(new DeepPartial(innerV), d.namedKey);
  }
  if(innerV instanceof PartialStruct) {
    return new Dict(new DeepPartial(innerV.struct));
  }
  else if(innerV instanceof Dict) {
    return new Dict(deepPartialDict(innerV), d.namedKey);
  }
  return d;
}

function hasNested(struct: Struct<any>) {
  for(const k in struct.definition) {
    if(struct.definition[k] instanceof Struct) return true;
  }
  return false;
}

export function partial<T extends TypeStruct>(struct: Struct<T>): PartialStruct<T> {
  return new PartialStruct(struct);
}
export function deepPartial<T extends TypeStruct>(struct: Struct<T>): DeepPartial<T> {
  return new DeepPartial(struct);
}
