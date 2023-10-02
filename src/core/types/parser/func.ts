import { ValType } from "./codeTypes";
import CodeNode from "../../util/parser/codeNode";

type Args = {
    [key: string]: ValType
};

export default class Func {
    protected props: string[];
    args: Args;
    type: ValType;
    body: CodeNode;

    constructor(type: ValType, args: Args, props: string[], body: CodeNode) {
        this.type = type;
        this.args = args;
        this.props = props;
        this.body = body;
    }

    hasProp(prop: string): boolean {
        return this.props.indexOf(prop) >= 0;
    }
}