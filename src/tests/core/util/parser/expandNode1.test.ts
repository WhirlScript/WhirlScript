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
                { value: "#import", line: 1, flag: "normal" },
                { value: "test", line: 2, flag: "normal" },
                { value: "#if", line: 3, flag: "normal" },
                { value: "define", line: 3, flag: "normal" },
                { value: "a", line: 4, flag: "normal" },
                { value: "#const", line: 4, flag: "normal" },
                { value: "a", line: 4, flag: "normal" },
                { value: "=", line: 4, flag: "normal" },
                { value: "\"", line: 4, flag: "normal" },
                { value: "", line: 4, flag: "string" },
                { value: "\"", line: 4, flag: "normal" },
                { value: "#end", line: 5, flag: "normal" },
                { value: "if", line: 6, flag: "normal" },
                { value: "/**\n * docs test\n */", line: 6, flag: "docs" },
                { value: "#function", line: 10, flag: "normal" },
                { value: "t", line: 10, flag: "normal" },
                { value: "(", line: 10, flag: "normal" },
                { value: "x", line: 10, flag: "normal" },
                { value: ":", line: 10, flag: "normal" },
                { value: "string", line: 10, flag: "normal" },
                { value: "):", line: 10, flag: "normal" },
                { value: "string", line: 10, flag: "normal" },
                { value: "{", line: 11, flag: "normal" },
                {
                    value: "\n        return `a${x}`\n    ",
                    line: 11,
                    flag: "block"
                },
                { value: "}", line: 15, flag: "normal" },
                { value: "@count", line: 16, flag: "normal" },
                { value: "global", line: 16, flag: "normal" },
                { value: "editable", line: 16, flag: "normal" },
                { value: "v", line: 16, flag: "normal" },
                { value: "=", line: 16, flag: "normal" },
                { value: "true", line: 17, flag: "normal" }
            ]
        };
        expect(expandNode(codeNode)).toEqual(expectedValue);
    });
});