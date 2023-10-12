import Index from "./types/api";
import CodeNode from "./util/parser/codeNode";
import Api from "./types/api";
import LOG_ERROR from "./logger/logError";

export default class Parser {
    protected file: string;
    protected api: Index;
    protected type: "bat" | "sh";

    constructor(file: string, api: Api, type: "bat" | "sh") {
        this.file = file;
        this.api = api;
        this.type = type;
    }

    parse() {
        const file = this.api.fileApi.getFile(this.file);
        if (!file.success) {
            this.api.loggerApi.error(LOG_ERROR.unknownFile(this.file), {
                file: "cli_args",
                line: 1,
                column: 1
            });
        }
        const rootNode = new CodeNode({
            type: "code",
            value: file.value,
            coordinate: {
                file: "#import std;\n" + file.path,
                line: 0,
                column: 1
            }
        });
    }


}