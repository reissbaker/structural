import { Either, Intersect, Validation } from "./type";
import { TypeOf } from "./checks/type-of";
import { InstanceOf } from "./checks/instance-of";
import { Value } from "./checks/value";
import { Arr } from "./checks/array";
import { Struct } from "./checks/struct";
import { Dict } from "./checks/dict";
import { MapType } from "./checks/map";
import { SetType } from "./checks/set";
import { Any } from "./checks/any";

export type Kind = Any
                 | SetType<any>
                 | MapType<any, any>
                 | Dict<any>
                 | Struct<any>
                 | Arr<any>
                 | Value<any>
                 | InstanceOf<any>
                 | TypeOf<any>
                 | Either<any, any>
                 | Intersect<any, any>
                 | Validation<any>
                 ;
