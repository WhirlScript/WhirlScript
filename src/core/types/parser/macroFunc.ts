import { PTN } from "./ptn";
import Type from "./type";
import { ASTN } from "./astn";
import Coordinate from "./coordinate";

type Args = {
    name: string,
    type: Type,
    isMacro: boolean,
    defaultValue?: ASTN.Value
}[];

type MacroFunctionProp = {
    hasScope: boolean,
    isConstexpr: boolean,
    deprecated: boolean
}

export default class MacroFunc {
    readonly name: string;
    readonly coordinate: Coordinate;
    readonly args: Args;
    readonly type: Type;
    readonly body: PTN.Block;
    readonly prop: MacroFunctionProp;
    readonly symbolTableLength: number;

    constructor(name: string, coordinate: Coordinate, type: Type, args: Args, body: PTN.Block, prop: MacroFunctionProp, symbolTableLength: number) {
        this.name = name;
        this.coordinate = coordinate;
        this.type = type;
        this.args = args;
        this.body = body;
        this.prop = prop;
        this.symbolTableLength = symbolTableLength;
    }
}