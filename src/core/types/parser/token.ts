import Coordinate from "./Coordinate";

export default interface Token {
    value: string,
    coordinate: Coordinate,
    flag: "word" | "operator" | "comment" | "docs" | "string"
}