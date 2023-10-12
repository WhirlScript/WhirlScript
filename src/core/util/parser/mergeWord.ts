import CodeNode from "./codeNode";
import Deque from "../deque";
import Field from "../../types/parser/field";
import Pools from "./Pools";
import Api from "../../types/api";
import LOG_ERROR from "../../logger/messages/logError";
import LOGGER from "../../logger/logger";
import readFile from "../api/readFile";
import splitNode from "./splitNode";

export default function mergeWord(node: CodeNode, fields: Deque<Field>, context: {
    pools: Pools,
    pref: string,
    api: Api
}) {
    const { pools, pref, api } = context;
    if (node.child == null) {
        node.child = new Deque<CodeNode>();
    }
    while (!fields.isEmpty()) {
        let cursor = fields.popFront();
        if (cursor.flag == "comment") {
            node.child.pushRear(new CodeNode({
                coordinate: cursor.coordinate,
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
                const lineCoordinate = cursor.coordinate;
                cursor = fields.popFront();
                if (cursor.flag != "string") {
                    LOGGER.error(LOG_ERROR.invalidCharacter(cursor.value));
                }
                const filePath = cursor.value;
                cursor = fields.popFront();
                if (cursor.value != ";") {
                    LOGGER.error(LOG_ERROR.invalidCharacter(cursor.value));
                }
                if (pools.importPool.indexOf(filePath) >= 0) {
                    continue;
                }
                const file = readFile(filePath, api);
                if (!file.success) {
                    LOGGER.error(LOG_ERROR.unknownFile(filePath));
                }
                const fieldsImported = splitNode(new CodeNode({
                    coordinate: {
                        file: file.path,
                        line: 1,
                        column: 1,
                        chain: [...cursor.coordinate.chain ?? [], lineCoordinate]
                    },
                    type: "code",
                    value: file.value
                }));
                while (!fieldsImported.isEmpty()) {
                    fields.pushFront(fieldsImported.popRear());
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