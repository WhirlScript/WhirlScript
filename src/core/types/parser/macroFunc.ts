import { Segment } from "./segment";
import Type from "./type";
import { RSegment } from "./rSegment";
import Coordinate from "./coordinate";

type Args = {
    name: string,
    type: Type,
    isMacro: boolean,
    defaultValue?: RSegment.Value
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
    readonly body: Segment.Block;
    readonly prop: MacroFunctionProp;
    readonly symbolTableLength: number;

    constructor(name: string, coordinate: Coordinate, type: Type, args: Args, body: Segment.Block, prop: MacroFunctionProp, symbolTableLength: number) {
        this.name = name;
        this.coordinate = coordinate;
        this.type = type;
        this.args = args;
        this.body = body;
        this.prop = prop;
        this.symbolTableLength = symbolTableLength;
    }
}