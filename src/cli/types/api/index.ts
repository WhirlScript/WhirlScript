import Api from "../../../core/types/api";
import FileApi from "../../../core/types/api/fileApi";
import CliFileApi from "./cliFileApi";
import LoggerApi from "../../../core/types/api/loggerApi";
import CliLoggerApi from "./cliLoggerApi";

export default class CliApi implements Api {
    fileApi: FileApi = new CliFileApi();
    loggerApi: LoggerApi = new CliLoggerApi();
}