import Deque from "../deque";
import Coordinate from "../../types/parser/Coordinate";

type CodeNodeType =
    "code"
    | "raw"
    | "var"
    | "#var"
    | "function"
    | "#function"
    | "const"
    | "block"
    | "comment"
    | "operator"
    | "define"
    | "element"


export default class CodeNode {
    type: CodeNodeType;
    value: string;
    coordinate: Coordinate;
    child: Deque<CodeNode> | null;

    constructor(arg: {
        type: CodeNodeType,
        value: string,
        coordinate: Coordinate,
        child?: Deque<CodeNode>;
    }) {
        this.type = arg.type;
        this.value = arg.value;
        this.coordinate = arg.coordinate;
        this.child = arg.child ?? null;
    }

}