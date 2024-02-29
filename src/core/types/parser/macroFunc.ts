import { Segment } from "./segment";
import Type from "./type";
import { RSegment } from "./rSegment";

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
    readonly args: Args;
    readonly type: Type;
    readonly body: Segment.Block;
    readonly prop: MacroFunctionProp;
    readonly symbolTableLength: number;

    constructor(name: string, type: Type, args: Args, body: Segment.Block, prop: MacroFunctionProp, symbolTableLength: number) {
        this.name = name;
        this.type = type;
        this.args = args;
        this.body = body;
        this.prop = prop;
        this.symbolTableLength = symbolTableLength;
    }
}