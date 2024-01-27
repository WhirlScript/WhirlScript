import { ValType } from "./codeTypes";
import CodeNode from "../../util/parser/codeNode";

type Args = {
    name: string,
    type: ValType,
    default?: number | boolean | string
}[];

export default class Func {
    protected props: string[];
    name: string;
    args: Args;
    type: ValType;
    body: CodeNode;

    constructor(name: string, type: ValType, args: Args, props: string[], body: CodeNode) {
        this.name = name;
        this.type = type;
        this.args = args;
        this.props = props;
        this.body = body;
    }

    hasProp(prop: string): boolean {
        return this.props.indexOf(prop) >= 0;
    }

}