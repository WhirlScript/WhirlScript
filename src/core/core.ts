import Api from "./types/api";

export default class Core {

    protected api: Api;

    constructor(api: Api) {
        this.api = api;
    }

    /**
     * compile wrs to bat
     * @param file entry file, read with api.fileApi.getFile()
     */
    toBat(file: string) {

    }

    /**
     * compile wrs to bash
     * @param file entry file, read with api.fileApi.getFile()
     */
    toBash(file: string) {

    }
}