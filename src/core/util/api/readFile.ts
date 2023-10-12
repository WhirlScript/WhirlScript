import Api from "../../types/api";
import LOG_ERROR from "../../logger/logError";
import WORD_TEST from "../wordTest";
import Coordinate from "../../types/parser/Coordinate";

export default function readFile(path: string, context: { coordinate: Coordinate, api: Api }) {
    const { coordinate, api } = context;
    if (path == "") {
        api.loggerApi.error(LOG_ERROR.unknownFile(`"${path}"`), coordinate);
    }
    if (WORD_TEST.isWord(path[0]) && path[0] != "#") {
        return api.fileApi.getLib(path);
    }
    return api.fileApi.getFile(path);
}