import { Coordinate, LoggerApi, WhirlError } from "../../../whirlscript";

export default class CliLoggerApi implements LoggerApi{//TODO: implement
    info(msg: string) {
        console.log(msg);
    }

    warning(msg: string) {
        console.warn(msg);
    }

    error(whirlError: WhirlError, coordinate: Coordinate = { line: -1, column: -1, file: "none" }): never {
        let text = `\x1b[41;30m${whirlError.type}\x1b[0m ${whirlError.details} in "${coordinate.file}:${coordinate.line}:${coordinate.column}"`;
        if (coordinate.chain) {
            text += "\nCall chain:";
            for (const chainElement of coordinate.chain) {
                text += `\n    at ${chainElement.file}:${chainElement.line}:${chainElement.column}`;
            }
        }
        console.error(text);
        throw new Error();
    }
}