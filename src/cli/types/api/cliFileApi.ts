import FileApi from "../../../core/types/api/fileApi";

export default class CliFileApi implements FileApi {
    getFile(path: string): string {
        return "";
    }

    getLib(path: string): string {
        return "";
    }

    getStdLib(path: string): string {
        return "";
    }

}