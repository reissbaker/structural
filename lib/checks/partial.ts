import { Type, KeyTrackingType, KeyTrackResult } from "../type";
import { Struct, optional, OptionalKey, TypeStruct, UnwrappedTypeStruct } from "./struct";
import { undef } from "./primitives";


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
  constructor(struct: Struct<T>) {
    super();
    const partialDef: Partial<DeepPartialTypeStruct<T>> = {};
    for(const k in struct.definition) {
      const v = struct.definition[k];
      if(v instanceof OptionalKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type.or(undef));
      }
      else if(v instanceof Struct) {
        //@ts-ignore
        partialDef[k] = optional(new DeepPartial(v.definition, v.exact).or(undef));
      }
      else {
        //@ts-ignore
        partialDef[k] = optional(v.or(undef));
      }
    }
    this.struct = new Struct(partialDef as DeepPartialTypeStruct<T>, struct.exact);
  }

  checkTrackKeys(val: any): KeyTrackResult<UnwrappedTypeStruct<DeepPartialTypeStruct<T>>> {
    return this.struct.checkTrackKeys(val);
  }
}

export function partial<T extends TypeStruct>(struct: Struct<T>): PartialStruct<T> {
  return new PartialStruct(struct);
}
export function deepPartial<T extends TypeStruct>(struct: Struct<T>): DeepPartial<T> {
  return new DeepPartial(struct);
}
