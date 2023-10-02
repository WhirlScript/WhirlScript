import Deque from "../deque";

type CodeNodeType = "code" | "raw" | "var" | "#var" | "function" | "#function" | "const" | "block" | "comment" | "operator"


export default class CodeNode {
    type: CodeNodeType;
    value: string;
    line: number;
    child: Deque<CodeNode> | null;

    constructor(arg: {
        type: CodeNodeType,
        value: string,
        line: number,
        child?: Deque<CodeNode>;
    }) {
        this.type = arg.type;
        this.value = arg.value;
        this.line = arg.line;
        this.child = arg.child ?? null;
    }

}