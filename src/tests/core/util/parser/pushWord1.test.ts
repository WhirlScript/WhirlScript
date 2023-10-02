import Deque from "../../../../core/util/deque";
import Word from "../../../../core/types/parser/word";
import pushWord from "../../../../core/util/parser/pushWord";

describe("test pushWord method normally", () => {
    const deque = new Deque<Word>();
    const line = 1;
    test("word to word", () => {
        pushWord(deque, "test", "word", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "word"
        });
    });
    test("operator to operator > on char", () => {
        pushWord(deque, "+", "operator", line);
        expect(deque.popFront()).toEqual({
            value: "+",
            line: 1,
            flag: "operator"
        });
    });
    test("operator to operator > multi-char", () => {
        pushWord(deque, "+=", "operator", line);
        expect(deque.popFront()).toEqual({
            value: "+=",
            line: 1,
            flag: "operator"
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
            flag: "operator"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\'",
            line: 1,
            flag: "operator"
        });
    });
    test("stringD to \" + string + \"", () => {
        pushWord(deque, "\"test\"", "stringD", line);
        expect(deque.popFront()).toEqual({
            value: "\"",
            line: 1,
            flag: "operator"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\"",
            line: 1,
            flag: "operator"
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
    test("stringR+L to  \` + string + $", () => {
        pushWord(deque, "\`test$", "stringR+L", line);
        expect(deque.popFront()).toEqual({
            value: "\`",
            line: 1,
            flag: "operator"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "$",
            line: 1,
            flag: "operator"
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
            flag: "operator"
        });
    });
    test("stringR+LR to \` + string + \`", () => {
        pushWord(deque, "\`test\`", "stringR+LR", line);
        expect(deque.popFront()).toEqual({
            value: "\`",
            line: 1,
            flag: "operator"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\`",
            line: 1,
            flag: "operator"
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