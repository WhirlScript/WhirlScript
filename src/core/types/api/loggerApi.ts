import Coordinate from "../parser/coordinate";

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
     * log error
     * @param whirlError message to log
     * @param coordinate where the error occurred
     */
    error(whirlError: WhirlError, coordinate: Coordinate): void;
}

export interface WhirlError {
    type: string;
    details: string;
}

export interface WhirlWarning {
    type: string;
    details: string;
}