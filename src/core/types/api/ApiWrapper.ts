import Api from "./index";
import { LoggerApiWrapper } from "./loggerApiWrapper";
import FileApiWrapper from "./fileApiWrapper";

export default class ApiWrapper {
    logger: LoggerApiWrapper;
    file: FileApiWrapper;

    constructor(api: Api) {
        this.logger = new LoggerApiWrapper(api.loggerApi);
        this.file = new FileApiWrapper(api.fileApi);
    }
}