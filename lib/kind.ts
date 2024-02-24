import type { Comment, Either, DefaultIntersect, Validation } from "./type";
import type { TypeOf } from "./checks/type-of";
import type { InstanceOf } from "./checks/instance-of";
import type { Value } from "./checks/value";
import type { Arr } from "./checks/array";
import type { Dict, Struct, MergeIntersect } from "./checks/struct";
import type { MapType } from "./checks/map";
import type { SetType } from "./checks/set";
import type { Any } from "./checks/any";
import type { Is } from "./checks/is";
import type { Never } from "./checks/never";
import type { DeepPartial, PartialStruct } from "./checks/partial";

export type Kind = Any
                 | Never
                 | SetType<any>
                 | MapType<any, any>
                 | Dict<any>
                 | Struct<any>
                 | MergeIntersect<any, any, any, any>
                 | Arr<any>
                 | Value<any>
                 | InstanceOf<any>
                 | TypeOf<any>
                 | Either<any, any>
                 | DefaultIntersect<any, any>
                 | Validation<any>
                 | Is<any>
                 | Comment<any>
                 | PartialStruct<any>
                 | DeepPartial<any>
                 ;
