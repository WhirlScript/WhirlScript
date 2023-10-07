import Deque from "../../../../core/util/deque";
import Field from "../../../../core/types/parser/field";
import pushField from "../../../../core/util/parser/pushField";

describe("test pushWord method normally", () => {
    const deque = new Deque<Field>();
    const line = 1;
    test("word to word", () => {
        pushField(deque, "test", "word", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "word"
        });
    });
    test("operator to operator > on char", () => {
        pushField(deque, "+", "operator", line);
        expect(deque.popFront()).toEqual({
            value: "+",
            line: 1,
            flag: "operator"
        });
    });
    test("operator to operator > multi-char", () => {
        pushField(deque, "+=", "operator", line);
        expect(deque.popFront()).toEqual({
            value: "+=",
            line: 1,
            flag: "operator"
        });
    });
    test("comment to comment", () => {
        pushField(deque, "//test", "comment", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "comment"
        });
    });
    test("longComment to comment", () => {
        pushField(deque, "/*test*/", "longComment", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "comment"
        });
    });
    test("docs to docs", () => {
        pushField(deque, "/**test*/", "docs", line);
        expect(deque.popFront()).toEqual({
            value: "/**test*/",
            line: 1,
            flag: "docs"
        });
    });
    test("stringS to ' + string + '", () => {
        pushField(deque, "\'test\'", "stringS", line);
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
        pushField(deque, "\"test\"", "stringD", line);
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
        pushField(deque, "test", "stringR", line);
        expect(deque.popFront()).toEqual({
            value: "test",
            line: 1,
            flag: "string"
        });
    });
    test("stringR+L to  \` + string", () => {
        pushField(deque, "\`test", "stringR+L", line);
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
    });
    test("stringR+R to string + \`", () => {
        pushField(deque, "test\`", "stringR+R", line);
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
        pushField(deque, "\`test\`", "stringR+LR", line);
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
});