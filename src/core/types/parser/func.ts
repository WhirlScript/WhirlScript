import Type from "./type";
import { RSegment } from "./rSegment";
import Val from "./val";
import { SName } from "../../util/parser/pools";

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
    readonly args: Args;
    readonly type: Type;
    readonly body: RSegment.Block;
    readonly prop: FunctionProp;
    usingList: (Func | Val)[] = [];
    used: boolean = false;
    flag: string | undefined;

    constructor(name: string, type: Type, args: Args, body: RSegment.Block, prop: FunctionProp) {
        this.name = { v: name };
        this.type = type;
        this.args = args;
        this.body = body;
        this.prop = prop;
    }

    use() {
        for (const usingListElement of this.usingList) {
            usingListElement.use();
        }
        this.used = true;
    }

}