import FileApi from "./fileApi";

type FileApiReturn = {
    value: string,
    path: string,
    success: boolean
}

export default class FileApiWrapper {
    private fileApi: FileApi;

    constructor(fileApi: FileApi) {
        this.fileApi = fileApi;
    }

    getLib(path: string, base?: string): FileApiReturn {
        return this.fileApi.getLib(path, base);
    };

    getFile(path: string, base?: string): FileApiReturn {
        return this.fileApi.getFile(path, base);
    }

}