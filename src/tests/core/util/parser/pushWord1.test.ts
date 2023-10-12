import Deque from "../../../../core/util/deque";
import Field from "../../../../core/types/parser/field";
import pushField from "../../../../core/util/parser/pushField";
import Coordinate from "../../../../core/types/parser/Coordinate";
import CliApi from "../../../../cli/types/api";

describe("test pushWord method normally", () => {
    const api = new CliApi();
    const deque = new Deque<Field>();
    const coordinate: Coordinate = {
        file: "",
        line: 1,
        column: 1
    };
    test("word to word", () => {
        pushField(deque, "test", "word", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "word"
        });
    });
    test("operator to operator > on char", () => {
        pushField(deque, "+", "operator", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "+",
            coordinate,
            flag: "operator"
        });
    });
    test("operator to operator > multi-char", () => {
        pushField(deque, "+=", "operator", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "+=",
            coordinate,
            flag: "operator"
        });
    });
    test("comment to comment", () => {
        pushField(deque, "//test", "comment", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "comment"
        });
    });
    test("longComment to comment", () => {
        pushField(deque, "/*test*/", "longComment", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "comment"
        });
    });
    test("docs to docs", () => {
        pushField(deque, "/**test*/", "docs", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "/**test*/",
            coordinate,
            flag: "docs"
        });
    });
    test("stringS to ' + string + '", () => {
        pushField(deque, "\'test\'", "stringS", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "\'",
            coordinate,
            flag: "operator"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate: {
                ...coordinate,
                column: 2
            },
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\'",
            coordinate: {
                ...coordinate,
                column: 6
            },
            flag: "operator"
        });
    });
    test("stringD to \" + string + \"", () => {
        pushField(deque, "\"test\"", "stringD", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "\"",
            coordinate,
            flag: "operator"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate: {
                ...coordinate,
                column: 2
            },
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\"",
            coordinate: {
                ...coordinate,
                column: 6
            },
            flag: "operator"
        });
    });
    test("stringR to string", () => {
        pushField(deque, "test", "stringR", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "string"
        });
    });
    test("stringR+L to  \` + string", () => {
        pushField(deque, "\`test", "stringR+L", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "\`",
            coordinate,
            flag: "operator"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate: {
                ...coordinate,
                column: 2
            },
            flag: "string"
        });
    });
    test("stringR+R to string + \`", () => {
        pushField(deque, "test\`", "stringR+R", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\`",
            coordinate: {
                ...coordinate,
                column: 5
            },
            flag: "operator"
        });
    });
    test("stringR+LR to \` + string + \`", () => {
        pushField(deque, "\`test\`", "stringR+LR", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "\`",
            coordinate,
            flag: "operator"
        });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate: {
                ...coordinate,
                column: 2
            },
            flag: "string"
        });
        expect(deque.popFront()).toEqual({
            value: "\`",
            coordinate: {
                ...coordinate,
                column: 6
            },
            flag: "operator"
        });
    });
});