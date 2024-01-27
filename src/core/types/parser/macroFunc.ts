import { ValType } from "./codeTypes";
import { Segment } from "./segment";

type Args = {
    name: string,
    type: ValType
}[];

export default class MacroFunc {
    protected props: string[];
    name: string;
    args: Args;
    type: ValType;
    body: Segment.Block;
    macroConst: boolean;

    constructor(name: string, type: ValType, args: Args, props: string[], body: Segment.Block, macroConst: boolean) {
        this.name = name;
        this.type = type;
        this.args = args;
        this.props = props;
        this.body = body;
        this.macroConst = macroConst;
    }

    hasProp(prop: string): boolean {
        return this.props.indexOf(prop) >= 0;
    }

    isMacroConst(): boolean {
        return this.macroConst;
    }
}