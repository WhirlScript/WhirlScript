import Coordinate from "./coordinate";

export default interface Token {
    value: string,
    coordinate: Coordinate,
    flag: "word" | "operator" | "comment" | "docs" | "string" | "EOF"
}