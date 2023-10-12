import Field from "../../types/parser/field";
import Deque from "../deque";
import WORD_TEST from "../wordTest";
import LOG_ERROR from "../../logger/logError";
import Coordinate from "../../types/parser/Coordinate";
import Api from "../../types/api";

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

export default function pushField(fields: Deque<Field>, piece: string, status: Status, context: { coordinate: Coordinate, api: Api }) {
    const { coordinate, api } = context;
    if (piece == "") {
        return;
    }
    if (status == "word") {
        fields.pushRear({
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
                fields.pushRear({
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
                api.loggerApi.error(LOG_ERROR.invalidCharacter(v[l]), coordinate);
                l = r;
                r = v.length;
                continue;
            }
            r--;
        }
    } else if (status == "comment") {
        fields.pushRear({
            value: piece.slice(2),// remove `//`
            coordinate,
            flag: "comment"
        });
    } else if (status == "longComment") {
        fields.pushRear({
            value: piece.slice(2, -2),// remove `/*` and `*/`
            coordinate,
            flag: "comment"
        });
    } else if (status == "docs") {
        fields.pushRear({
            value: piece,// keep raw as it will not be in output
            coordinate,
            flag: "docs"
        });
    } else if (status == "stringS") {
        fields.pushRear({
            value: `'`,
            coordinate,
            flag: "operator"
        });
        fields.pushRear({
            value: piece.slice(1, -1),
            coordinate: {
                ...coordinate,
                column: coordinate.column + 1
            },
            flag: "string"
        });
        fields.pushRear({
            value: `'`,
            coordinate: {
                ...coordinate,
                column: coordinate.column + piece.length - 1
            },
            flag: "operator"
        });
    } else if (status == "stringD") {
        fields.pushRear({
            value: `"`,
            coordinate,
            flag: "operator"
        });
        fields.pushRear({
            value: piece.slice(1, -1),
            coordinate: {
                ...coordinate,
                column: coordinate.column + 1
            },
            flag: "string"
        });
        fields.pushRear({
            value: `"`,
            coordinate: {
                ...coordinate,
                column: coordinate.column + piece.length - 1
            },
            flag: "operator"
        });
    } else if (status == "stringR") {
        fields.pushRear({
            value: piece,
            coordinate,
            flag: "string"
        });
    } else if (status == "stringR+L") {
        fields.pushRear({
            value: "\`",
            coordinate,
            flag: "operator"
        });
        fields.pushRear({
            value: piece.slice(1),
            coordinate: {
                ...coordinate,
                column: coordinate.column + 1
            },
            flag: "string"
        });
    } else if (status == "stringR+R") {
        fields.pushRear({
            value: piece.slice(0, -1),
            coordinate,
            flag: "string"
        });
        fields.pushRear({
            value: "\`",
            coordinate: {
                ...coordinate,
                column: coordinate.column + piece.length - 1
            },
            flag: "operator"
        });
    } else if (status == "stringR+LR") {
        fields.pushRear({
            value: "\`",
            coordinate,
            flag: "operator"
        });
        fields.pushRear({
            value: piece.slice(1, -1),
            coordinate: {
                ...coordinate,
                column: coordinate.column + 1
            },
            flag: "string"
        });
        fields.pushRear({
            value: "\`",
            coordinate: {
                ...coordinate,
                column: coordinate.column + piece.length - 1
            },
            flag: "operator"
        });
    }
}