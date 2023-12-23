import Deque from "../../../../core/util/deque";
import Token from "../../../../core/types/parser/token";
import pushToken from "../../../../core/util/parser/pushToken";
import Coordinate from "../../../../core/types/parser/Coordinate";
import CliApi from "../../../../cli/types/api";

describe("test pushWord method normally", () => {
    const api = new CliApi();
    const deque = new Deque<Token>();
    const coordinate: Coordinate = {
        file: "",
        line: 1,
        column: 1,
        chain: undefined
    };
    test("word to word", () => {
        pushToken(deque, "test", "word", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "word"
        });
    });
    test("operator to operator > on char", () => {
        pushToken(deque, "+", "operator", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "+",
            coordinate,
            flag: "operator"
        });
    });
    test("operator to operator > multi-char", () => {
        pushToken(deque, "+=", "operator", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "+=",
            coordinate,
            flag: "operator"
        });
    });
    test("comment to comment", () => {
        pushToken(deque, "//test", "comment", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "comment"
        });
    });
    test("longComment to comment", () => {
        pushToken(deque, "/*test*/", "longComment", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "comment"
        });
    });
    test("docs to docs", () => {
        pushToken(deque, "/**test*/", "docs", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "/**test*/",
            coordinate,
            flag: "docs"
        });
    });
    test("stringS to ' + string + '", () => {
        pushToken(deque, "\'test\'", "stringS", { coordinate, api });
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
        pushToken(deque, "\"test\"", "stringD", { coordinate, api });
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
        pushToken(deque, "test", "stringR", { coordinate, api });
        expect(deque.popFront()).toEqual({
            value: "test",
            coordinate,
            flag: "string"
        });
    });
    test("stringR+L to  \` + string", () => {
        pushToken(deque, "\`test", "stringR+L", { coordinate, api });
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
        pushToken(deque, "test\`", "stringR+R", { coordinate, api });
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
        pushToken(deque, "\`test\`", "stringR+LR", { coordinate, api });
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