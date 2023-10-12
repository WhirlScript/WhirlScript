import Coordinate from "../../../core/types/parser/Coordinate";

export default class CliLoggerApi {//TODO: implement
    info(msg: string) {
        console.log(msg);
    }

    warning(msg: string) {
        console.warn(msg);
    }

    error(msg: string, coordinate: Coordinate = { line: -1, column: -1, file: "none" }): never {
        let text = `\x1b47m\x1b[31mError\x1b[0m ${msg} in "${coordinate.file}:${coordinate.line}:${coordinate.column}"`;
        if (coordinate.chain) {
            text += "\nCall chain:";
            for (const chainElement of coordinate.chain) {
                text += `\n${chainElement.file}:${chainElement.line}:${chainElement.column}`;
            }
        }
        throw text;
    }
}