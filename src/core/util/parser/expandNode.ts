import CodeNode from "./codeNode";
import Deque from "../deque";
import Word from "../../types/parser/word";
import pushWord, { Status } from "./pushWord";
import CODE_TYPES from "../../types/parser/codeTypes";
import CHAR_TEST from "./charTest";
import WORD_TEST from "./wordTest";
import LOGGER from "../../logger/logger";
import LOG_ERROR from "../../logger/messages/logError";
import LOG_WARNING from "../../logger/messages/logWarning";

export default function expandNode(node: CodeNode): Deque<Word> {
    const words = new Deque<Word>();
    if (node.type == "raw") {
        return words;
    }

    let line = node.line;
    let piece = "";
    let status: Status = "normal";
    const code: string = node.value;
    const flags = {
        layerCount: 0,
        stringR: {
            l: false
        },
        escape: false,
        isWord: false,
        inStringR: false,
        lineS: line
    };

    function push() {
        pushWord(words, piece, status, flags.lineS);
        piece = "";
        flags.isWord = false;
    }

    function stringEscape(i: number) {
        if (code[i] == null) {
            LOGGER.error(LOG_ERROR.invalidCharacter("\\"));
            return;
        }
        if (code[i] == "\n") {
            line++;
        }
        let escapeResult: string | undefined = CODE_TYPES.escapes?.[code[i]];
        if (escapeResult == null) {
            LOGGER.warning(LOG_WARNING.unknownEscape(code[i]));
            escapeResult = code[i];
        }
        piece += escapeResult;
    }

    for (let i = 0; i < node.value.length; i++) {
        if (code[i] == "\r") {
            continue;
        }
        if (code[i] == "\n") {
            line++;
        }
        if (status == "normal") {
            if (CODE_TYPES.separates.indexOf(code[i]) >= 0) {
                if (piece == "") {
                    continue;
                }
                flags.lineS = line;
                push();
                continue;
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
                    flags.isWord = true;
                }

            }
            if (!flags.isWord && (CHAR_TEST.isNumber(code[i]) || CHAR_TEST.isAlphabet(code[i]))) {
                flags.lineS = line;
                push();
                flags.isWord = true;
                piece += code[i];
                continue;
            }
            if (flags.isWord && !WORD_TEST.isWord(piece + code[i])) {
                flags.lineS = line;
                push();
                piece += code[i];
                continue;
            }
            if (code[i] == "'") {
                flags.lineS = line;
                push();
                piece += code[i];
                status = "stringS";
                continue;
            }
            if (code[i] == "\"") {
                flags.lineS = line;
                push();
                piece += code[i];
                status = "stringD";
                continue;
            }
            if (code[i] == "`") {
                flags.lineS = line;
                push();
                piece += code[i];
                status = "stringR";
                flags.inStringR = true;
                flags.stringR.l = true;
                continue;
            }
            if (code[i] == "{") {
                flags.lineS = line;
                push();
                piece += code[i];
                status = "block";
                flags.layerCount = 1;
                continue;
            }
            piece += code[i];
        }
        if (status == "comment") {
            if (code[i] == "\n") {
                push();
                status = "normal";
            } else {
                piece += code[i];
            }
            continue;
        }
        if (status == "longComment" || status == "docs") {
            if (piece.endsWith("*") && code[i] == "/") {
                piece += code[i];
                push();
                status = "normal";
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
                push();
                status = "normal";
                continue;
            }
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
                push();
                status = "normal";
                continue;
            }
        }
        if (status == "stringR") {
            if (code[i] == "\\") {
                i++;
                stringEscape(i);
                continue;
            }
            if (code[i] == "$") {
                if (code[i + 1] == "{") {
                    if (flags.stringR.l) {
                        status = "stringR+L";
                        flags.stringR.l = false;
                    }
                    piece += code[i];
                    push();
                    i++;
                    piece += code[i];
                    status = "block";
                    continue;
                }
            }
            if (code[i] == "`") {
                if (flags.stringR.l) {
                    status = "stringR+LR";
                } else {
                    status = "stringR+R";
                }
                push();
                status = "normal";
                flags.inStringR = false;
                continue;
            }
            piece += code[i];
            continue;
        }
        if (status == "block") {
            piece += code[i];
            if (code[i] == "{") {
                flags.layerCount++;
            }
            if (code[i] == "}") {
                flags.layerCount--;
            }
            if (flags.layerCount == 0) {
                push();
                if (flags.inStringR) {
                    status = "stringR";
                } else {
                    status = "normal";
                }
            }
            // continue;
        }
    }

    return words;
}