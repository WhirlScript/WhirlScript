import CodeNode from "../core/util/parser/codeNode";
import splitNode from "../core/util/parser/splitNode";
import * as fs from "fs";

const script = fs.readFileSync(process.cwd() + "/src/tests/resource/expandTest.txt").toString();

const codeNode = new CodeNode({
    line: 1, type: "code", value: script
});

console.log(splitNode(codeNode));