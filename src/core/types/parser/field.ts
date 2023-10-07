export default interface Field {
    value: string,
    line: number,
    flag: "word" | "operator" | "comment" | "docs" | "string"
}