import * as fs from "fs";
import CodeNode from "../../../../core/util/parser/codeNode";
import tokenize from "../../../../core/parser/tokenize";
import Deque from "../../../../core/util/deque";
import Token from "../../../../core/types/parser/token";
import CliApi from "../../../../cli/types/api";

describe("test tokenize method", () => {
    const api = new CliApi();
    test("script expand", () => {
        const path = process.cwd() + "/src/tests/resource/splitTest.txt";
        const script = fs.readFileSync(path).toString();
        const codeNode = new CodeNode({
            coordinate: {
                line: 1,
                column: 1,
                file: path,
                chain: undefined
            }, type: "code", value: script
        });
        const expectedValue = new Deque<Token>([
            {
                value: "#import", flag: "word",
                coordinate: {
                    line: 1,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "test", flag: "word",
                coordinate: {
                    line: 1,
                    column: 9,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 1,
                    column: 13,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "#if", flag: "word",
                coordinate: {
                    line: 3,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "define", flag: "word",
                coordinate: {
                    line: 3,
                    column: 5,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "a", flag: "word",
                coordinate: {
                    line: 3,
                    column: 12,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 3,
                    column: 13,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "#const", flag: "word",
                coordinate: {
                    line: 4,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "a", flag: "word",
                coordinate: {
                    line: 4,
                    column: 8,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "=", flag: "operator",
                coordinate: {
                    line: 4,
                    column: 9,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "\"", flag: "operator",
                coordinate: {
                    line: 4,
                    column: 10,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "1", flag: "string",
                coordinate: {
                    line: 4,
                    column: 11,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "\"", flag: "operator",
                coordinate: {
                    line: 4,
                    column: 12,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 4,
                    column: 13,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "#end", flag: "word",
                coordinate: {
                    line: 5,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "if", flag: "word",
                coordinate: {
                    line: 5,
                    column: 6,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 5,
                    column: 8,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "/**\n * docs test\n */", flag: "docs",
                coordinate: {
                    line: 7,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "#function", flag: "word",
                coordinate: {
                    line: 10,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "t", flag: "word",
                coordinate: {
                    line: 10,
                    column: 11,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "(", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 12,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "x", flag: "word",
                coordinate: {
                    line: 10,
                    column: 13,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ":", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 14,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "int", flag: "word",
                coordinate: {
                    line: 10,
                    column: 15,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ")", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 18,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ":", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 19,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "string", flag: "word",
                coordinate: {
                    line: 10,
                    column: 20,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 10,
                    column: 26,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "1", flag: "word",
                coordinate: {
                    line: 11,
                    column: 5,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 6,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 7,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "1", flag: "word",
                coordinate: {
                    line: 11,
                    column: 8,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 9,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 10,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "2", flag: "word",
                coordinate: {
                    line: 11,
                    column: 11,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 12,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 13,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "3", flag: "word",
                coordinate: {
                    line: 11,
                    column: 14,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 11,
                    column: 15,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 12,
                    column: 5,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "2", flag: "word",
                coordinate: {
                    line: 12,
                    column: 6,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 13,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "#function", flag: "word",
                coordinate: {
                    line: 15,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "f", flag: "word",
                coordinate: {
                    line: 15,
                    column: 11,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "(", flag: "operator",
                coordinate: {
                    line: 15,
                    column: 12,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ")", flag: "operator",
                coordinate: {
                    line: 15,
                    column: 13,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "{", flag: "operator",
                coordinate: {
                    line: 15,
                    column: 14,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 17,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "var", flag: "word",
                coordinate: {
                    line: 19,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "x", flag: "word",
                coordinate: {
                    line: 19,
                    column: 5,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "=", flag: "operator",
                coordinate: {
                    line: 19,
                    column: 6,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "5", flag: "word",
                coordinate: {
                    line: 19,
                    column: 7,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 19,
                    column: 8,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "x", flag: "word",
                coordinate: {
                    line: 20,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "+=", flag: "operator",
                coordinate: {
                    line: 20,
                    column: 2,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "2", flag: "word",
                coordinate: {
                    line: 20,
                    column: 4,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 20,
                    column: 5,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "const", flag: "word",
                coordinate: {
                    line: 21,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "好", flag: "word",
                coordinate: {
                    line: 21,
                    column: 7,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "=", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 8,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "`", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 9,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "a", flag: "string",
                coordinate: {
                    line: 21,
                    column: 10,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "${", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 11,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "x", flag: "word",
                coordinate: {
                    line: 21,
                    column: 13,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "}", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 14,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "", flag: "string",
                coordinate: {
                    line: 21,
                    column: 15,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "`", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 15,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 21,
                    column: 16,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "@count", flag: "word",
                coordinate: {
                    line: 23,
                    column: 1,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "global", flag: "word",
                coordinate: {
                    line: 23,
                    column: 8,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "editable", flag: "word",
                coordinate: {
                    line: 23,
                    column: 15,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "v", flag: "word",
                coordinate: {
                    line: 23,
                    column: 24,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "=", flag: "operator",
                coordinate: {
                    line: 23,
                    column: 26,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: "true", flag: "word",
                coordinate: {
                    line: 23,
                    column: 28,
                    file: path,
                    chain: undefined
                }
            },
            {
                value: ";", flag: "operator",
                coordinate: {
                    line: 23,
                    column: 32,
                    file: path,
                    chain: undefined
                }
            }
        ]);
        expect(tokenize(codeNode, { api })).toEqual(expectedValue);
    });
});
