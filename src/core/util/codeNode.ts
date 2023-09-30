type CodeNodeType = "code" | "raw" | "var" | "#var" | "function" | "#function"

export default class CodeNode {
    type: CodeNodeType;
    value: string;

    constructor(type: CodeNodeType, value: string) {
        this.type = type;
        this.value = value;
    }


}