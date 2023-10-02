import Deque from "../../../../src/core/util/deque";
import Word from "../../../../src/core/types/parser/word";
import pushWord from "../../../../src/core/util/parser/pushWord";

describe("test pushWord method normally", () => {
    const deque = new Deque<Word>();
    const line = 1;
    test("normal to normal", () => {
        pushWord(deque, "test", "normal", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "normal"
        });
    });
    test("comment to comment", () => {
        pushWord(deque, "//test", "comment", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "comment"
        });
    });
    test("longComment to comment", () => {
        pushWord(deque, "/*test*/", "longComment", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "comment"
        });
    });
    test("docs to docs", () => {
        pushWord(deque, "/**test*/", "docs", line);
        expect(deque.popFront()).toEqual({
            value: "/**test*/",
            line: 1,
            flag: "docs"
        });
    });
    test("stringS to ' + string + '", () => {
        pushWord(deque, "\'test\'", "stringS", line);
        expect(deque.popFront()).toEqual({
            value: "\'",
            line: 1,
            flag: "normal"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\'",
            line: 1,
            flag: "normal"
        });
    });
    test("stringD to \" + string + \"", () => {
        pushWord(deque, "\"test\"", "stringD", line);
        expect(deque.popFront()).toEqual({
            value: "\"",
            line: 1,
            flag: "normal"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\"",
            line: 1,
            flag: "normal"
        });
    });
    test("stringR to string", () => {
        pushWord(deque, "test", "stringR", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
    });
    test("stringR+L to  \` + string", () => {
        pushWord(deque, "\`test", "stringR+L", line);
        expect(deque.popFront()).toEqual({
            value: "\`",
            line: 1,
            flag: "normal"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
    });
    test("stringR+R to string + \`", () => {
        pushWord(deque, "test\`", "stringR+R", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\`",
            line: 1,
            flag: "normal"
        });
    });
    test("stringR+LR to \` + string + \`", () => {
        pushWord(deque, "\`test\`", "stringR+LR", line);
        expect(deque.popFront()).toEqual({
            value: "\`",
            line: 1,
            flag: "normal"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\`",
            line: 1,
            flag: "normal"
        });
    });
    test("block to block", () => {
        pushWord(deque, "{test}", "block", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "block"
        });
    });
});