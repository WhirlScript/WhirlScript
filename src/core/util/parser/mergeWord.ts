import CodeNode from "./codeNode";
import Deque from "../deque";
import Field from "../../types/parser/field";
import Pools from "./Pools";
import Api from "../../types/api";
import LOG_ERROR from "../../logger/messages/logError";
import LOGGER from "../../logger/logger";
import readFile from "../api/readFile";
import splitNode from "./splitNode";

export default function mergeWord(node: CodeNode, words: Deque<Field>, pools: Pools, pref: string, api: Api) {
    if (node.child == null) {
        node.child = new Deque<CodeNode>();
    }
    while (!words.isEmpty()) {
        let cursor = words.popFront();
        if (cursor.flag == "comment") {
            node.child.pushRear(new CodeNode({
                line: cursor.line,
                type: "comment",
                value: cursor.value
            }));
            continue;
        }
        if (cursor.flag == "docs") {
            continue;
        }
        if (cursor.flag == "word") {
            if (cursor.value == "#import") {
                cursor = words.popFront();
                if (cursor.flag != "string") {
                    LOGGER.error(LOG_ERROR.invalidCharacter(cursor.value));
                }
                const file = cursor.value;
                cursor = words.popFront();
                if (cursor.value != ";") {
                    LOGGER.error(LOG_ERROR.invalidCharacter(cursor.value));
                }
                if (pools.importPool.indexOf(file) >= 0) {
                    continue;
                }
                const wordsImported = splitNode(new CodeNode({
                    line: 1,
                    type: "code",
                    value: readFile(file, api)
                }));
                while (!wordsImported.isEmpty()) {
                    words.pushFront(wordsImported.popRear());
                }
                continue;
            }
            //and so on
        }
        if (cursor.flag == "operator") {
            // ?????
        }
    }
}