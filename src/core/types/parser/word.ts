export default interface Word {
    value: string,
    line: number,
    flag: "normal" | "comment" | "docs" | "string" | "block"
}