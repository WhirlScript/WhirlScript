import LOG_ERROR from "../../logger/logError";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";

export default function readFile(path: string, context: { coordinate: Coordinate, api: ApiWrapper }) {
    const { coordinate, api } = context;
    if (path == "") {
        api.logger.errorInterrupt(LOG_ERROR.unknownFile(`"${path}"`), coordinate);
    }
    if (path[0] == "." || path[0] == "/") {
        return api.file.getFile(path);
    }
    return api.file.getLib(path);
}