import Coordinate from "../parser/Coordinate";

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
     * @param msg message to log
     * @param coordinate where error occurred
     */
    error(msg: string, coordinate: Coordinate): never;
}