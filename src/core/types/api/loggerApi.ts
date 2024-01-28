import Coordinate from "../parser/Coordinate";
import WhirlError from "./whirlError";

export default interface LoggerApi {
    /**
     * log info
     * @param msg message to log
     */
    info(msg: string): void;

    /**
     * log warning
     * @param msg message to log
     */
    warning(msg: string): void;

    /**
     * log error and throw an empty error to interrupt the following parsing
     * @param whirlError message to log
     * @param coordinate where error occurred
     * @param interrupt whether to throw the error
     */
    error(whirlError: WhirlError, coordinate: Coordinate, interrupt:boolean): never;
}