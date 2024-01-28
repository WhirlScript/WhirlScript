import type { Api, FileApi, LoggerApi } from "../../../whirlscript";
import CliFileApi from "./cliFileApi";
import CliLoggerApi from "./cliLoggerApi";

export default class CliApi implements Api {
    fileApi: FileApi = new CliFileApi();
    loggerApi: LoggerApi = new CliLoggerApi();
}