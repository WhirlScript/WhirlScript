import CodeNode from "./codeNode";
import Deque from "../deque";
import Word from "../../types/parser/word";
import pushWord, { Status } from "./pushWord";
import CODE_TYPES from "../../types/parser/codeTypes";
import CHAR_TEST from "./charTest";
import WORD_TEST from "./wordTest";

export default function expandNode(node: CodeNode): Deque<Word> { // TODO: I need a unit test
    const words = new Deque<Word>();
    if (node.type == "raw") {
        return words;
    }

    let line = node.line;
    let piece = "";
    let status: Status = "normal";
    const flags = {
        layerCount: 0,
        stringR: {
            l: false
        },
        escape: false,
        isWord: false
    };

    function push() {
        pushWord(words, piece, status, line);
        piece = "";
        flags.isWord = false;
    }

    const code = node.value;
    for (let i = 0; i < node.value.length; i++) {
        if (code[i] == "\n") {
            line++;
        }
        if (status == "normal") {
            if (CODE_TYPES.separates.indexOf(code[i]) >= 0) {
                if (piece == "") {
                    continue;
                }
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
                if (CHAR_TEST.isNumber(code[i]) || CHAR_TEST.isAlphabet(code[i])) {
                    push();
                    piece += code[i];
                    continue;
                }
                piece += code[i];
                continue;
            }
            if (piece == "") {
                if (WORD_TEST.isWord(code[i])) {
                    flags.isWord = true;
                }
            }
            if (flags.isWord && !WORD_TEST.isWord(piece + code[i])) {
                push();
                piece += code[i];
                continue;
            }
            if (code[i] == "'") {
                push();
                piece += code[i];
                status = "stringS";
                continue;
            }
            if (code[i] == "\"") {
                push();
                piece += code[i];
                status = "stringD";
                continue;
            }
            if (code[i] == "`") {
                push();
                piece += code[i];
                status = "stringR";
                flags.stringR.l = true;
                continue;
            }
            if (code[i] == "{") {
                push();
                piece += code[i];
                status = "block";
                flags.layerCount = 1;
                continue;
            }
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
            piece += code[i];
            if (piece.endsWith("*") && code[i] == "/") {
                push();
                status = "normal";
            }
            continue;
        }
        if (status == "stringS") {

        }
        if (status == "stringD") {

        }
        if (status == "stringR") {

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
                status = "normal";
            }
            // continue;
        }
    }

    return words;
}