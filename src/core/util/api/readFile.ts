import Api from "../../types/api";
import LOG_ERROR from "../../logger/logError";
import Coordinate from "../../types/parser/Coordinate";

export default function readFile(path: string, context: { coordinate: Coordinate, api: Api }) {
    const { coordinate, api } = context;
    if (path == "") {
        api.loggerApi.error(LOG_ERROR.unknownFile(`"${path}"`), coordinate, true);
    }
    if (path[0] == "." || path[0] == "/") {
        return api.fileApi.getFile(path);
    }
    return api.fileApi.getLib(path);
}