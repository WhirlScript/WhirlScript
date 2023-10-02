import WORD_TEST from "../../../../src/core/util/parser/wordTest";

describe("test wordTest.isNumber method", () => {
    test("a should not be a number", () => {
        expect(WORD_TEST.isNumber("a")).toBeFalsy();
    });
    test("@count should not be a number", () => {
        expect(WORD_TEST.isNumber("@count")).toBeFalsy();
    });
    test("#function should not be a number", () => {
        expect(WORD_TEST.isNumber("#function")).toBeFalsy();
    });
    test("5 should be a number", () => {
        expect(WORD_TEST.isNumber("5")).toBeTruthy();
    });
    test("150 should be a number", () => {
        expect(WORD_TEST.isNumber("150")).toBeTruthy();
    });
    test("150.0 should not be a number", () => {
        expect(WORD_TEST.isNumber("150.0")).toBeFalsy();
    });
});