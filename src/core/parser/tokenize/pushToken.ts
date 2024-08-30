import Token from "../../types/parser/token";
import Deque from "../../util/deque";
import WORD_TEST from "../../util/wordTest";
import LOG_ERROR from "../../logger/logError";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";

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

export default function pushToken(tokens: Deque<Token>, piece: string, status: Status, context: {
    coordinate: Coordinate,
    api: ApiWrapper
}) {
    const { coordinate, api } = context;
    if (piece == "") {
        return;
    }
    if (status == "word") {
        tokens.pushRear({
            value: piece,
            coordinate,
            flag: "word"
        });
    } else if (status == "operator") {
        const v = piece;
        let l = 0;
        let r = v.length;
        while (l < r) {
            const sub = v.substring(l, r);
            if (WORD_TEST.isOperator(sub)) {
                tokens.pushRear({
                    value: sub,
                    coordinate: {
                        ...coordinate,
                        column: coordinate.column + l
                    },
                    flag: "operator"
                });
                l = r;
                r = v.length;
                continue;
            }
            if (l == r - 1) {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(v[l]), coordinate);
                l = r;
                r = v.length;
                continue;
            }
            r--;
        }
    } else if (status == "comment") {
        tokens.pushRear({
            value: piece.slice(2),// remove `//`
            coordinate,
            flag: "comment"
        });
    } else if (status == "longComment") {
        tokens.pushRear({
            value: piece.slice(2, -2),// remove `/*` and `*/`
            coordinate,
            flag: "comment"
        });
    } else if (status == "docs") {
        tokens.pushRear({
            value: piece,// keep raw as it will not be in codegen
            coordinate,
            flag: "docs"
        });
    } else if (status == "stringS") {
        tokens.pushRear({
            value: `'`,
            coordinate,
            flag: "operator"
        });
        tokens.pushRear({
            value: piece.slice(1, -1),
            coordinate: {
                ...coordinate,
                column: coordinate.column + 1
            },
            flag: "string"
        });
        tokens.pushRear({
            value: `'`,
            coordinate: {
                ...coordinate,
                column: coordinate.column + piece.length - 1
            },
            flag: "operator"
        });
    } else if (status == "stringD") {
        tokens.pushRear({
            value: `"`,
            coordinate,
            flag: "operator"
        });
        tokens.pushRear({
            value: piece.slice(1, -1),
            coordinate: {
                ...coordinate,
                column: coordinate.column + 1
            },
            flag: "string"
        });
        tokens.pushRear({
            value: `"`,
            coordinate: {
                ...coordinate,
                column: coordinate.column + piece.length - 1
            },
            flag: "operator"
        });
    } else if (status == "stringR") {
        tokens.pushRear({
            value: piece,
            coordinate,
            flag: "string"
        });
    } else if (status == "stringR+L") {
        tokens.pushRear({
            value: "\`",
            coordinate,
            flag: "operator"
        });
        tokens.pushRear({
            value: piece.slice(1),
            coordinate: {
                ...coordinate,
                column: coordinate.column + 1
            },
            flag: "string"
        });
    } else if (status == "stringR+R") {
        tokens.pushRear({
            value: piece.slice(0, -1),
            coordinate,
            flag: "string"
        });
        tokens.pushRear({
            value: "\`",
            coordinate: {
                ...coordinate,
                column: coordinate.column + piece.length - 1
            },
            flag: "operator"
        });
    } else if (status == "stringR+LR") {
        tokens.pushRear({
            value: "\`",
            coordinate,
            flag: "operator"
        });
        tokens.pushRear({
            value: piece.slice(1, -1),
            coordinate: {
                ...coordinate,
                column: coordinate.column + 1
            },
            flag: "string"
        });
        tokens.pushRear({
            value: "\`",
            coordinate: {
                ...coordinate,
                column: coordinate.column + piece.length - 1
            },
            flag: "operator"
        });
    }
}