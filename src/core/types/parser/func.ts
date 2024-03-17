import Type from "./type";
import { RSegment } from "./rSegment";
import Val from "./val";
import { SName } from "../../util/parser/pools";
import Coordinate from "./coordinate";

type Args = {
    name: string,
    type: Type,
    isMacro: boolean,
    defaultValue?: RSegment.Value
}[];

type FunctionProp = {
    deprecated: boolean
    optional: boolean,
}

export default class Func {
    readonly name: SName;
    readonly coordinate: Coordinate;
    readonly args: Args;
    readonly type: Type;
    readonly body: RSegment.Block;
    readonly prop: FunctionProp;
    used: boolean = false;
    required: boolean = false;
    requireList: (Func | Val)[];
    flag: string | undefined;

    constructor(name: string, coordinate: Coordinate, requireList: (Func | Val)[], type: Type, args: Args, body: RSegment.Block, prop: FunctionProp) {
        this.name = { v: name };
        this.coordinate = coordinate;
        this.requireList = requireList;
        this.type = type;
        this.args = args;
        this.body = body;
        this.prop = prop;
    }

    require() {
        for (const e of this.requireList) {
            e.require();
        }
        this.required = true;
    }

}