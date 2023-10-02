import FileApi from "./types/api/fileApi";
import Index from "./types/api";
import CodeNode from "./util/parser/codeNode";

export default class Parser {
    protected file: string;
    protected api: Index;
    protected type: "bat" | "sh";
    constList=[];
    varList=[]

    constructor(file: string, api: { fileApi: FileApi }, type: "bat" | "sh") {
        this.file = file;
        this.api = api;
        this.type = type;
    }

    parse() {
        const rootNode = new CodeNode({
            type: "code",
            value: this.api.fileApi.getFile(this.file),
            line: 0
        });
    }


}