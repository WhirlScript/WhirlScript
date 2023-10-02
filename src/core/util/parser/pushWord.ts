import Word from "../../types/parser/word";
import Deque from "../deque";

export type Status =
    "normal"
    | "comment"// comment start with //
    | "longComment"// comment wrapped with /* and */
    | "docs"//docs wrapped with /** and */
    | "stringS"// string wrapped with '
    | "stringD"// string wrapped with "
    | "stringR"// string wrapped with ` and without no leading and trailing `
    | "stringR+L"// string wrapped with ` and with leading `
    | "stringR+R"// string wrapped with ` and with trailing `
    | "stringR+LR"// string wrapped with ` and with leading and trailing `
    | "block"// code block wrapped with { and }

export default function pushWord(words: Deque<Word>, piece: string, status: Status, line: number) {
    if (piece == "") {
        return;
    }
    if (status == "normal") {
        words.pushRear({
            value: piece,
            line,
            flag: "normal"
        });
    } else if (status == "comment") {
        words.pushRear({
            value: piece.slice(2),// remove `//`
            line,
            flag: "comment"
        });
    } else if (status == "longComment") {
        words.pushRear({
            value: piece.slice(2, -2),// remove `/*` and `*/`
            line,
            flag: "comment"
        });
    } else if (status == "docs") {
        words.pushRear({
            value: piece,// keep raw as it will not be in output
            line,
            flag: "docs"
        });
    } else if (status == "stringS") {
        words.pushRear({
            value: `'`,
            line,
            flag: "normal"
        });
        words.pushRear({
            value: piece.slice(1, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: `'`,
            line,
            flag: "normal"
        });
    } else if (status == "stringD") {
        words.pushRear({
            value: `"`,
            line,
            flag: "normal"
        });
        words.pushRear({
            value: piece.slice(1, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: `"`,
            line,
            flag: "normal"
        });
    } else if (status == "stringR") {
        words.pushRear({
            value: piece,
            line,
            flag: "string"
        });
    } else if (status == "stringR+L") {
        words.pushRear({
            value: "\`",
            line,
            flag: "normal"
        });
        words.pushRear({
            value: piece.slice(1, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: "$",
            line,
            flag: "normal"
        });
    } else if (status == "stringR+R") {
        words.pushRear({
            value: piece.slice(0, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: "\`",
            line,
            flag: "normal"
        });
    } else if (status == "stringR+LR") {
        words.pushRear({
            value: "\`",
            line,
            flag: "normal"
        });
        words.pushRear({
            value: piece.slice(1, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: "\`",
            line,
            flag: "normal"
        });
    } else if (status == "block") {
        words.pushRear({
            value: piece.slice(1, -1),// remove `{` and `}`
            line,
            flag: "block"
        });
    }
}