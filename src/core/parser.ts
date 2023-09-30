import FileApi from "./types/api/fileApi";
import Index from "./types/api";

export default class Parser {
    protected api: Index;
    protected type: "bat" | "sh";

    constructor(api: { fileApi: FileApi }, type: "bat" | "sh") {
        this.api = api;
        this.type = type;
    }
}