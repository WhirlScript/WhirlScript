import Api from "./types/api";
import RawCode from "./util/parser/rawCode";
import ApiWrapper from "./types/api/apiWrapper";
import CliApi from "../cli/types/api";
import resolve from "./parser/resolve";
import tokenize from "./parser/tokenize";
import preprocess from "./parser/preprocess";

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
        const codeNode = new RawCode({
            coordinate: {
                file: "F",
                line: 1,
                column: 1,
                chain: undefined
            }, value: file
        });

        const api = new ApiWrapper(new CliApi());

        const s = resolve(tokenize(codeNode, { api }), { api, importPool: [] });

        return preprocess(s, { target: "sh" }, { api });
    }

    /**
     * compile wrs to bash
     * @param file entry file, read with api.fileApi.getFile()
     */
    toBash(file: string) {

    }
}