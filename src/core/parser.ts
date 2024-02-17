import RawCode from "./util/parser/rawCode";
import ApiWrapper from "./types/api/apiWrapper";
import LOG_ERROR from "./logger/logError";

export default class Parser {
    protected file: string;
    protected api: ApiWrapper;
    protected type: "bat" | "sh";

    constructor(file: string, api: ApiWrapper, type: "bat" | "sh") {
        this.file = file;
        this.api = api;
        this.type = type;
    }

    parse() {
        const file = this.api.file.getFile(this.file);
        if (!file.success) {
            this.api.logger.errorInterrupt(LOG_ERROR.unknownFile(this.file), {
                file: "cli_args",
                line: 1,
                column: 1
            });
        }
        const rootCode = new RawCode({
            value: file.value,
            coordinate: {
                file: "import 'std';\n" + file.path,
                line: 0,
                column: 1
            }
        });
    }


}