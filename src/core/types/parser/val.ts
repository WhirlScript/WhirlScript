import Type from "./type";
import { SName } from "../../util/parser/pools";
import Coordinate from "./coordinate";


type ValProp = {
    isConst: boolean,
    deprecated: boolean,
    optional: boolean
}

export default class Val {
    readonly name: SName;
    readonly coordinate: Coordinate;
    readonly type: Type;
    readonly prop: ValProp;
    isInit: boolean = false;
    used: boolean = false;
    required: boolean = false;


    constructor(name: string, coordinate: Coordinate, type: Type, prop: ValProp) {
        this.name = { v: name };
        this.coordinate = coordinate;
        this.type = type;
        this.prop = prop;
    }

    require() {
        this.required = true;
    }
}