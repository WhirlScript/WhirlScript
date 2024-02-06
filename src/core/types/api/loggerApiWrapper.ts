import LoggerApi, { WhirlError, WhirlWarning } from "./loggerApi";
import { Coordinate } from "../../../whirlscript";

export class LoggerApiWrapper {
    private loggerApi: LoggerApi;

    constructor(loggerApi: LoggerApi) {
        this.loggerApi = loggerApi;
    }

    info(msg: string) {
        this.loggerApi.info(msg);
    }

    warning(whirlWarning: WhirlWarning, coordinate: Coordinate = { line: -1, column: -1, file: "none" }): void {
        this.loggerApi.warning(whirlWarning, coordinate);
    }

    error(whirlError: WhirlError, coordinate: Coordinate = {
        line: -1,
        column: -1,
        file: "none"
    }): void {
        this.loggerApi.error(whirlError, coordinate);
    }

    errorInterrupt(whirlError: WhirlError, coordinate: Coordinate = {
        line: -1,
        column: -1,
        file: "none"
    }): never {
        this.loggerApi.error(whirlError, coordinate);
        throw new Error();
    }
}