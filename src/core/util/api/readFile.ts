import Api from "../../types/api";
import LOGGER from "../../logger/logger";
import LOG_ERROR from "../../logger/messages/logError";
import WORD_TEST from "../wordTest";

export default function readFile(path: string, api: Api) {
    if (path == "") {
        LOGGER.error(LOG_ERROR.unknownFile(`"${path}"`));
    }
    if (WORD_TEST.isWord(path[0]) && path[0] != "#") {
        return api.fileApi.getLib(path);
    }
    return api.fileApi.getFile(path);
}