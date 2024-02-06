import RawCode from "../../util/parser/rawCode";
import Deque from "../../util/deque";
import Token from "../../types/parser/token";
import pushToken, { Status } from "./pushToken";
import CODE_TYPES from "../../types/parser/codeTypes";
import CHAR_TEST from "../../util/charTest";
import LOG_ERROR from "../../logger/logError";
import LOG_WARNING from "../../logger/logWarning";
import Coordinate from "../../types/parser/Coordinate";
import Api from "../../types/api";

export default function tokenize(rawCode: RawCode, context: { api: Api }): Deque<Token> {
    const { api } = context;
    const tokens = new Deque<Token>();

    let line = rawCode.coordinate.line;
    let lineStart = 0 - rawCode.coordinate.column;
    let piece = "";
    let status: Status = "operator";
    const code: string = rawCode.value.replace(/\r/g, "");
    const flags = {
        layerCount: 0,
        stringR: {
            l: false
        },
        escape: false,
        isWord: false,
        inStringR: false,
        inStringRFormat: false,
        coordinate: <Coordinate>{
            file: rawCode.coordinate.file,
            line: rawCode.coordinate.line,
            column: rawCode.coordinate.column,
            chain: rawCode.coordinate.chain
        }
    };

    function push(i: number) {
        pushToken(tokens, piece, status, {
            coordinate: {
                ...flags.coordinate
            }, api
        });
        piece = "";
        status = "operator";
        flags.coordinate.line = line;
        flags.coordinate.column = i - lineStart + 1;
    }

    function stringEscape(i: number) {
        if (code[i] == null) {
            api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken("\\"), {
                ...flags.coordinate,
                line: line,
                column: i - lineStart
            }, true);
            return;
        }
        if (code[i] == "\n") {
            line++;
            lineStart = i;
        }
        let escapeResult: string | undefined = CODE_TYPES.escapes?.[code[i]];
        if (escapeResult == null) {
            api.loggerApi.warning(LOG_WARNING.unknownEscape(code[i]), {
                ...flags.coordinate,
                line: line,
                column: i - lineStart
            });
            escapeResult = code[i];
        }
        piece += escapeResult;
    }

    for (let i = 0; i < rawCode.value.length; i++) {
        // if (i > 154)
        //     console.log(i, "  |  ", code[i - 1] == "\n" ? "\\n" : code[i - 1], "  |  ", status, "  |  ", piece, "  |  ", `${flags.coordinate.line}:${flags.coordinate.column}`, "  |  ", lineStart);

        if (code[i] == "\n") {
            line++;
            lineStart = i;
        }
        if (status == "operator" || status == "word") {
            if (CODE_TYPES.separates.indexOf(code[i]) >= 0) {
                if (piece != "") {
                    push(i - 1);
                    flags.coordinate.column = i - lineStart + 1;
                } else {
                    flags.coordinate.line = line;
                    flags.coordinate.column = i - lineStart + 1;
                }
                if (code[i] == "\n") {
                    lineStart = i;
                    continue;
                }
                continue;
            }
            if (flags.inStringRFormat) {
                if (code[i] == "{") {
                    flags.layerCount++;
                }
                if (code[i] == "}") {
                    flags.layerCount--;
                }
                if (flags.layerCount == 0) {
                    push(i - 1);
                    piece += code[i];
                    status = "operator";
                    push(i);
                    flags.stringR.l = false;
                    flags.inStringRFormat = false;
                    status = "stringR";
                    continue;
                }
            }
            if (piece.endsWith("/")) {
                if (code[i] == "/") {
                    // comment
                    status = "comment";
                    piece += code[i];
                    continue;
                }
                if (code[i] == "*") {
                    if (code[i + 1] == "*") {
                        // docs
                        status = "docs";
                        piece += code[i];
                        continue;
                    } else {
                        // long comment
                        status = "longComment";
                        piece += code[i];
                        continue;
                    }
                }
            }
            if (piece == "") {
                status = "word";
            }
            if (code[i] == "'") {
                push(i - 1);
                piece += code[i];
                status = "stringS";
                continue;
            }
            if (code[i] == "\"") {
                push(i - 1);
                piece += code[i];
                status = "stringD";
                continue;
            }
            if (code[i] == "`") {
                if (flags.inStringR) {
                    api.loggerApi.error(LOG_ERROR.templateStringInTemplateString(), {
                        ...flags.coordinate,
                        line: line,
                        column: i - lineStart
                    }, true);
                }
                push(i - 1);
                piece += code[i];
                status = "stringR";
                flags.inStringR = true;
                flags.stringR.l = true;
                continue;
            }
            if (status == "operator" && (CHAR_TEST.isNumber(code[i]) || CODE_TYPES.operators.indexOf(code[i]) < 0)) {
                push(i - 1);
                status = "word";
                piece += code[i];
                continue;
            }
            if (status == "word" && CODE_TYPES.operators.indexOf(code[i]) > -1) {
                push(i - 1);
                status = "operator";
                piece += code[i];
                continue;
            }
            piece += code[i];
        }
        if (status == "comment") {
            if (code[i] == "\n") {
                push(i);
                status = "operator";
            } else {
                piece += code[i];
            }
            continue;
        }
        if (status == "longComment" || status == "docs") {
            if (piece.endsWith("*") && code[i] == "/") {
                piece += code[i];
                push(i);
                status = "operator";
                continue;
            }
            piece += code[i];
            continue;
        }
        if (status == "stringS") {
            if (code[i] == "\\") {
                i++;
                stringEscape(i);
                continue;
            }
            if (code[i] == "\n") {
                api.loggerApi.error(LOG_ERROR.unterminatedStringLiteral(), {
                    ...flags.coordinate,
                    line: line,
                    column: i - lineStart
                }, true);
                continue;
            }
            if (code[i] == "'") {
                piece += code[i];
                push(i);
                status = "operator";
                continue;
            }
            piece += code[i];
            continue;
        }
        if (status == "stringD") {
            if (code[i] == "\\") {
                i++;
                stringEscape(i);
                continue;
            }
            if (code[i] == "\n") {
                api.loggerApi.error(LOG_ERROR.unterminatedStringLiteral(), {
                    ...flags.coordinate,
                    line: line,
                    column: i - lineStart
                }, true);
                continue;
            }
            if (code[i] == "\"") {
                piece += code[i];
                push(i);
                status = "operator";
                continue;
            }
            piece += code[i];
            continue;
        }
        if (status == "stringR") {
            if (code[i] == "\\") {
                i++;
                stringEscape(i);
                continue;
            }
            if (code[i] == "$" && code[i + 1] == "{") {
                if (flags.stringR.l) {
                    status = "stringR+L";
                    flags.stringR.l = false;
                }
                push(i - 1);
                piece += code[i];
                i++;
                piece += code[i];
                status = "operator";
                flags.inStringRFormat = true;
                flags.layerCount = 1;
                continue;
            }
            if (code[i] == "`") {
                piece += code[i];
                if (flags.stringR.l) {
                    status = "stringR+LR";
                } else {
                    status = "stringR+R";
                }
                push(i);
                status = "operator";
                flags.inStringR = false;
                continue;
            }
            piece += code[i];
            // continue;
        }
    }

    return tokens;
}