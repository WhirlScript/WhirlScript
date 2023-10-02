class Logger {//TODO: implement
    info(msg: string) {
        console.log(msg);
    }

    warning(msg: string) {
        console.warn(msg);
    }

    error(msg: string) {
        throw new Error(msg);
    }
}

const LOGGER = new Logger();
export default LOGGER;