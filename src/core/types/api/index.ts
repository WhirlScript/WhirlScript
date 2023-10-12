import FileApi from "./fileApi";
import LoggerApi from "./loggerApi";

export default interface Api {
    fileApi: FileApi;
    loggerApi: LoggerApi;
}