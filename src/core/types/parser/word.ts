export default interface Word {
    value: string,
    line: number,
    flag: "word" | "operator" | "comment" | "docs" | "string" | "block"
}