import FileApi from "../../../core/types/api/fileApi";

export default class CliFileApi implements FileApi {//TODO: implement
    getFile(path: string, base?: string) {
        return {
            path: "", success: false, value: ""
        };
    }

    getLib(path: string, base?: string) {
        return {
            path: "", success: false, value: ""
        };
    }
}