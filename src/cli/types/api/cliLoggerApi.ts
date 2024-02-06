import { Coordinate, LoggerApi, WhirlError, WhirlWarning } from "../../../whirlscript";

export default class CliLoggerApi implements LoggerApi {//TODO: implement
    info(msg: string) {
        console.log(msg);
    }

    warning(whirlWarning: WhirlWarning, coordinate: Coordinate): void {
        let text = `\x1b[43;30m${whirlWarning.type}\x1b[0m ${whirlWarning.details} in "${coordinate.file}:${coordinate.line}:${coordinate.column}"`;
        if (coordinate.chain) {
            text += "\nCall chain:";
            for (const chainElement of coordinate.chain) {
                text += `\n    at ${chainElement.file}:${chainElement.line}:${chainElement.column}`;
            }
        }
        console.warn(text);
    }

    error(whirlError: WhirlError, coordinate: Coordinate): void {
        let text = `\x1b[41;30m${whirlError.type}\x1b[0m ${whirlError.details} in "${coordinate.file}:${coordinate.line}:${coordinate.column}"`;
        if (coordinate.chain) {
            text += "\nCall chain:";
            for (const chainElement of coordinate.chain) {
                text += `\n    at ${chainElement.file}:${chainElement.line}:${chainElement.column}`;
            }
        }
        console.error(text);
    }
}