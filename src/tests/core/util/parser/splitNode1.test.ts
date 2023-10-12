import * as fs from "fs";
import CodeNode from "../../../../core/util/parser/codeNode";
import splitNode from "../../../../core/util/parser/splitNode";
import Deque from "../../../../core/util/deque";
import Field from "../../../../core/types/parser/field";
import CliApi from "../../../../cli/types/api";

describe("test splitNode method", () => {
    const api = new CliApi();
    test("script expand", () => {
        const path = process.cwd() + "/src/tests/resource/splitTest.txt";
        const script = fs.readFileSync(path).toString();
        const codeNode = new CodeNode({
            coordinate: {
                line: 1,
                column: 1,
                file: path
            }, type: "code", value: script
        });
        const expectedValue = new Deque<Field>([
            {
                value: "#import", flag: "word",
                coordinate: {
                    line: 1,
                    column: 1,
                    file: path
                }
            },
            {
                value: "test", flag: "word",
                coordinate: {
                    line: 1,
                    column: 9,
                    file: path
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 1,
                    column: 13,
                    file: path
                }
            },
            {
                value: "#if", flag: "word",
                coordinate: {
                    line: 3,
                    column: 1,
                    file: path
                }
            },
            {
                value: "define", flag: "word",
                coordinate: {
                    line: 3,
                    column: 5,
                    file: path
                }
            },
            {
                value: "a", flag: "word",
                coordinate: {
                    line: 3,
                    column: 12,
                    file: path
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 3,
                    column: 13,
                    file: path
                }
            },
            {
                value: "#const", flag: "word",
                coordinate: {
                    line: 4,
                    column: 1,
                    file: path
                }
            },
            {
                value: "a", flag: "word",
                coordinate: {
                    line: 4,
                    column: 8,
                    file: path
                }
            },
            {
                value: "=", flag: "operator",
                coordinate: {
                    line: 4,
                    column: 9,
                    file: path
                }
            },
            {
                value: "\"", flag: "operator",
                coordinate: {
                    line: 4,
                    column: 10,
                    file: path
                }
            },
            {
                value: "1", flag: "string",
                coordinate: {
                    line: 4,
                    column: 11,
                    file: path
                }
            },
            {
                value: "\"", flag: "operator",
                coordinate: {
                    line: 4,
                    column: 12,
                    file: path
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 4,
                    column: 13,
                    file: path
                }
            },
            {
                value: "#end", flag: "word",
                coordinate: {
                    line: 5,
                    column: 1,
                    file: path
                }
            },
            {
                value: "if", flag: "word",
                coordinate: {
                    line: 5,
                    column: 6,
                    file: path
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 5,
                    column: 8,
                    file: path
                }
            },
            {
                value: "/**\n * docs test\n */", flag: "docs",
                coordinate: {
                    line: 7,
                    column: 1,
                    file: path
                }
            },
            {
                value: "#function", flag: "word",
                coordinate: {
                    line: 10,
                    column: 1,
                    file: path
                }
            },
            {
                value: "t", flag: "word",
                coordinate: {
                    line: 10,
                    column: 11,
                    file: path
                }
            },
            {
                value: "(", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 12,
                    file: path
                }
            },
            {
                value: "x", flag: "word",
                coordinate: {
                    line: 10,
                    column: 13,
                    file: path
                }
            },
            {
                value: ":", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 14,
                    file: path
                }
            },
            {
                value: "int", flag: "word",
                coordinate: {
                    line: 10,
                    column: 15,
                    file: path
                }
            },
            {
                value: ")", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 18,
                    file: path
                }
            },
            {
                value: ":", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 19,
                    file: path
                }
            },
            {
                value: "string", flag: "word",
                coordinate: {
                    line: 10,
                    column: 20,
                    file: path
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 26,
                    file: path
                }
            },
            {
                value: "1", flag: "word",
                coordinate: {
                    line: 11,
                    column: 5,
                    file: path
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 6,
                    file: path
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 7,
                    file: path
                }
            },
            {
                value: "1", flag: "word",
                coordinate: {
                    line: 11,
                    column: 8,
                    file: path
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 9,
                    file: path
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 10,
                    file: path
                }
            },
            {
                value: "2", flag: "word",
                coordinate: {
                    line: 11,
                    column: 11,
                    file: path
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 12,
                    file: path
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 13,
                    file: path
                }
            },
            {
                value: "3", flag: "word",
                coordinate: {
                    line: 11,
                    column: 14,
                    file: path
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 15,
                    file: path
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 12,
                    column: 5,
                    file: path
                }
            },
            {
                value: "2", flag: "word",
                coordinate: {
                    line: 12,
                    column: 6,
                    file: path
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 13,
                    column: 1,
                    file: path
                }
            },
            {
                value: "#function", flag: "word",
                coordinate: {
                    line: 15,
                    column: 1,
                    file: path
                }
            },
            {
                value: "f", flag: "word",
                coordinate: {
                    line: 15,
                    column: 11,
                    file: path
                }
            },
            {
                value: "(", flag: "operator",
                coordinate: {
                    line: 15,
                    column: 12,
                    file: path
                }
            },
            {
                value: ")", flag: "operator",
                coordinate: {
                    line: 15,
                    column: 13,
                    file: path
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 15,
                    column: 14,
                    file: path
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 17,
                    column: 1,
                    file: path
                }
            },
            {
                value: "var", flag: "word",
                coordinate: {
                    line: 19,
                    column: 1,
                    file: path
                }
            },
            {
                value: "x", flag: "word",
                coordinate: {
                    line: 19,
                    column: 5,
                    file: path
                }
            },
            {
                value: "=", flag: "operator",
                coordinate: {
                    line: 19,
                    column: 6,
                    file: path
                }
            },
            {
                value: "5", flag: "word",
                coordinate: {
                    line: 19,
                    column: 7,
                    file: path
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 19,
                    column: 8,
                    file: path
                }
            },
            {
                value: "x", flag: "word",
                coordinate: {
                    line: 20,
                    column: 1,
                    file: path
                }
            },
            {
                value: "+=", flag: "operator",
                coordinate: {
                    line: 20,
                    column: 2,
                    file: path
                }
            },
            {
                value: "2", flag: "word",
                coordinate: {
                    line: 20,
                    column: 4,
                    file: path
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 20,
                    column: 5,
                    file: path
                }
            },
            {
                value: "const", flag: "word",
                coordinate: {
                    line: 21,
                    column: 1,
                    file: path
                }
            },
            {
                value: "y", flag: "word",
                coordinate: {
                    line: 21,
                    column: 7,
                    file: path
                }
            },
            {
                value: "=", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 8,
                    file: path
                }
            },
            {
                value: "`", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 9,
                    file: path
                }
            },
            {
                value: "a", flag: "string",
                coordinate: {
                    line: 21,
                    column: 10,
                    file: path
                }
            },
            {
                value: "${", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 11,
                    file: path
                }
            },
            {
                value: "x", flag: "word",
                coordinate: {
                    line: 21,
                    column: 13,
                    file: path
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 14,
                    file: path
                }
            },
            {
                value: "", flag: "string",
                coordinate: {
                    line: 21,
                    column: 15,
                    file: path
                }
            },
            {
                value: "`", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 15,
                    file: path
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 16,
                    file: path
                }
            },
            {
                value: "@count", flag: "word",
                coordinate: {
                    line: 23,
                    column: 1,
                    file: path
                }
            },
            {
                value: "global", flag: "word",
                coordinate: {
                    line: 23,
                    column: 8,
                    file: path
                }
            },
            {
                value: "editable", flag: "word",
                coordinate: {
                    line: 23,
                    column: 15,
                    file: path
                }
            },
            {
                value: "v", flag: "word",
                coordinate: {
                    line: 23,
                    column: 24,
                    file: path
                }
            },
            {
                value: "=", flag: "operator",
                coordinate: {
                    line: 23,
                    column: 26,
                    file: path
                }
            },
            {
                value: "true", flag: "word",
                coordinate: {
                    line: 23,
                    column: 28,
                    file: path
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 23,
                    column: 32,
                    file: path
                }
            }
        ]);
        expect(splitNode(codeNode, { api })).toEqual(expectedValue);
    });
});
