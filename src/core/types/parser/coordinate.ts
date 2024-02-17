export default interface Coordinate {
    file: string,
    line: number,
    column: number,
    chain?: Coordinate[]
}

const BUILTIN_COORDINATE: Coordinate = {
    line: -1,
    column: -1,
    file: "none"
};

export { BUILTIN_COORDINATE };