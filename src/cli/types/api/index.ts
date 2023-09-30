import Api from "../../../core/types/api";
import FileApi from "../../../core/types/api/fileApi";
import CliFileApi from "./cliFileApi";

export default class CliApi implements Api {
    fileApi: FileApi = new CliFileApi();
}