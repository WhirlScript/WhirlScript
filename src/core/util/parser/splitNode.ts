import CodeNode from "./codeNode";
import Deque from "../deque";
import Field from "../../types/parser/field";
import pushField, { Status } from "./pushField";
import CODE_TYPES from "../../types/parser/codeTypes";
import CHAR_TEST from "../charTest";
import WORD_TEST from "../wordTest";
import LOGGER from "../../logger/logger";
import LOG_ERROR from "../../logger/messages/logError";
import LOG_WARNING from "../../logger/messages/logWarning";
import Coordinate from "../../types/parser/Coordinate";

export default function splitNode(node: CodeNode): Deque<Field> {
    const fields = new Deque<Field>();
    if (node.type == "raw") {
        return fields;
    }

    let line = node.coordinate.line;
    let lineStart = 0 - node.coordinate.column;
    let piece = "";
    let status: Status = "operator";
    const code: string = node.value.replace(/\r/g, "");
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
            file: node.coordinate.file,
            line: node.coordinate.line,
            column: node.coordinate.column,
            chain: node.coordinate.chain
        }
    };

    function push(i: number) {
        pushField(fields, piece, status, { ...flags.coordinate });
        piece = "";
        status = "operator";
        flags.coordinate.line = line;
        flags.coordinate.column = i - lineStart + 1;
    }

    function stringEscape(i: number) {
        if (code[i] == null) {
            LOGGER.error(LOG_ERROR.invalidCharacter("\\"));
            return;
        }
        if (code[i] == "\n") {
            line++;
            lineStart = i;
        }
        let escapeResult: string | undefined = CODE_TYPES.escapes?.[code[i]];
        if (escapeResult == null) {
            LOGGER.warning(LOG_WARNING.unknownEscape(code[i]));
            escapeResult = code[i];
        }
        piece += escapeResult;
    }

    for (let i = 0; i < node.value.length; i++) {
        // if (i > 0)
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
                if (WORD_TEST.isWord(code[i])) {
                    status = "word";
                }
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
                    LOGGER.error(LOG_ERROR.templateStringInTemplateString());
                }
                push(i - 1);
                piece += code[i];
                status = "stringR";
                flags.inStringR = true;
                flags.stringR.l = true;
                continue;
            }
            if (status == "operator" && (CHAR_TEST.isNumber(code[i]) || CHAR_TEST.isAlphabet(code[i]))) {
                push(i - 1);
                status = "word";
                piece += code[i];
                continue;
            }
            if (status == "word" && !WORD_TEST.isWord(piece + code[i])) {
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
                LOGGER.error(LOG_ERROR.unterminatedStringLiteral());
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
                LOGGER.error(LOG_ERROR.unterminatedStringLiteral());
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

    return fields;
}