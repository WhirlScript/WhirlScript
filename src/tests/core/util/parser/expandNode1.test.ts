import * as fs from "fs";
import CodeNode from "../../../../core/util/parser/codeNode";
import expandNode from "../../../../core/util/parser/expandNode";

describe("test charTest.isAlphabet method", () => {
    test("script expand", () => {
        const script = fs.readFileSync(process.cwd() + "/src/tests/resource/expandTest.wrs").toString();
        const codeNode = new CodeNode({
            line: 1, type: "code", value: script
        });
        const expectedValue = {
            data: [
                { value: "#import", line: 1, flag: "word" },
                { value: "test", line: 1, flag: "word" },
                { value: ";", line: 2, flag: "operator" },
                { value: "#if", line: 3, flag: "word" },
                { value: "define", line: 3, flag: "word" },
                { value: "a", line: 3, flag: "word" },
                { value: ";", line: 4, flag: "operator" },
                { value: "#const", line: 4, flag: "word" },
                { value: "a", line: 4, flag: "word" },
                { value: "=", line: 4, flag: "operator" },
                { value: "\"", line: 4, flag: "operator" },
                { value: "", line: 4, flag: "string" },
                { value: "\"", line: 4, flag: "operator" },
                { value: ";", line: 5, flag: "operator" },
                { value: "#end", line: 5, flag: "word" },
                { value: "if", line: 5, flag: "word" },
                { value: ";", line: 6, flag: "operator" },
                { value: "/**\n * docs test\n */", line: 6, flag: "docs" },
                { value: "#function", line: 10, flag: "word" },
                { value: "t", line: 10, flag: "word" },
                { value: "(", line: 10, flag: "operator" },
                { value: "x", line: 10, flag: "word" },
                { value: ":", line: 10, flag: "operator" },
                { value: "int", line: 10, flag: "word" },
                { value: ")", line: 10, flag: "operator" },
                { value: ":", line: 10, flag: "operator" },
                { value: "string", line: 10, flag: "word" },
                { value: "\n    1{{1}{2}{3}\n    }2\n", line: 10, flag: "block" },
                { value: "#function", line: 15, flag: "word" },
                { value: "f", line: 15, flag: "word" },
                { value: "(", line: 15, flag: "operator" },
                { value: ")", line: 15, flag: "operator" },
                { value: "\n\n", line: 15, flag: "block" },
                { value: "var", line: 19, flag: "word" },
                { value: "x", line: 19, flag: "word" },
                { value: "=", line: 19, flag: "operator" },
                { value: "5", line: 19, flag: "word" },
                { value: ";", line: 20, flag: "operator" },
                { value: "x", line: 20, flag: "word" },
                { value: "+=", line: 20, flag: "operator" },
                { value: "2", line: 20, flag: "word" },
                { value: ";", line: 21, flag: "operator" },
                { value: "const", line: 21, flag: "word" },
                { value: "y", line: 21, flag: "word" },
                { value: "=", line: 21, flag: "operator" },
                { value: "`", line: 21, flag: "operator" },
                { value: "a", line: 21, flag: "string" },
                { value: "$", line: 21, flag: "operator" },
                { value: "", line: 21, flag: "block" },
                { value: "", line: 21, flag: "string" },
                { value: "`", line: 21, flag: "operator" },
                { value: ";", line: 22, flag: "operator" },
                { value: "@count", line: 23, flag: "word" },
                { value: "global", line: 23, flag: "word" },
                { value: "editable", line: 23, flag: "word" },
                { value: "v", line: 23, flag: "word" },
                { value: "=", line: 23, flag: "operator" },
                { value: "true", line: 23, flag: "word" },
                { value: ";", line: 24, flag: "operator" }
            ]
        };
        expect(expandNode(codeNode)).toEqual(expectedValue);
    });
});