import Coordinate from "../types/parser/Coordinate";

class Logger {//TODO: implement
    info(msg: string) {
        console.log(msg);
    }

    warning(msg: string) {
        console.warn(msg);
    }

    error(msg: string, coordinate: Coordinate = { line: -1, column: -1, file: "none" }): never {
        throw new Error(`${msg} in "${coordinate.file}:${coordinate.line}:${coordinate.column}"`);
    }
}

const LOGGER = new Logger();
export default LOGGER;