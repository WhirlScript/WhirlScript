import Coordinate from "./Coordinate";

export default interface Field {
    value: string,
    coordinate: Coordinate,
    flag: "word" | "operator" | "comment" | "docs" | "string"
}