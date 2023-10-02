import Word from "../../types/parser/word";
import Deque from "../deque";
import WORD_TEST from "./wordTest";
import LOGGER from "../../logger/logger";
import LOG_ERROR from "../../logger/messages/logError";

export type Status =
    "word"
    | "operator"
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
    if (status == "word") {
        words.pushRear({
            value: piece,
            line,
            flag: "word"
        });
    } else if (status == "operator") {
        const v = piece;
        let l = 0;
        let r = v.length;
        while (l < r) {
            const sub = v.substring(l, r);
            if (WORD_TEST.isOperator(sub)) {
                words.pushRear({
                    value: sub,
                    line,
                    flag: "operator"
                });
                l = r;
                r = v.length;
                continue;
            }
            if (l == r - 1) {
                LOGGER.error(LOG_ERROR.invalidCharacter(v[l]));
                l = r;
                r = v.length;
                continue;
            }
            r--;
        }
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
            flag: "operator"
        });
        words.pushRear({
            value: piece.slice(1, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: `'`,
            line,
            flag: "operator"
        });
    } else if (status == "stringD") {
        words.pushRear({
            value: `"`,
            line,
            flag: "operator"
        });
        words.pushRear({
            value: piece.slice(1, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: `"`,
            line,
            flag: "operator"
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
            flag: "operator"
        });
        words.pushRear({
            value: piece.slice(1, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: "$",
            line,
            flag: "operator"
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
            flag: "operator"
        });
    } else if (status == "stringR+LR") {
        words.pushRear({
            value: "\`",
            line,
            flag: "operator"
        });
        words.pushRear({
            value: piece.slice(1, -1),
            line,
            flag: "string"
        });
        words.pushRear({
            value: "\`",
            line,
            flag: "operator"
        });
    } else if (status == "block") {
        words.pushRear({
            value: piece.slice(1, -1),// remove `{` and `}`
            line,
            flag: "block"
        });
    }
}