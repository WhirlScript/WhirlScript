import Coordinate from "../parser/Coordinate";

export default interface LoggerApi {
    /**
     * log info
     * @param msg message to log
     */
    info(msg: string): void;

    /**
     * log warning
     * @param whirlWarning message to log
     * @param coordinate where the warning occurred
     */
    warning(whirlWarning: WhirlWarning, coordinate: Coordinate): void;

    /**
     * log error and throw an empty error to interrupt the following parsing
     * @param whirlError message to log
     * @param coordinate where the error occurred
     * @param interrupt whether to throw the error
     */
    error(whirlError: WhirlError, coordinate: Coordinate, interrupt:boolean): void;
}

export interface WhirlError {
    type: string;
    details: string;
}

export interface WhirlWarning {
    type: string;
    details: string;
}