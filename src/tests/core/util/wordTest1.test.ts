import WORD_TEST from "../../../core/util/wordTest";

describe("test wordTest.isNumber method", () => {
    test("a should not be a number", () => {
        expect(WORD_TEST.isInt("a")).toBeFalsy();
    });
    test("@count should not be a number", () => {
        expect(WORD_TEST.isInt("@count")).toBeFalsy();
    });
    test("#function should not be a number", () => {
        expect(WORD_TEST.isInt("#function")).toBeFalsy();
    });
    test("5 should be a number", () => {
        expect(WORD_TEST.isInt("5")).toBeTruthy();
    });
    test("150 should be a number", () => {
        expect(WORD_TEST.isInt("150")).toBeTruthy();
    });
    test("150.0 should not be a number", () => {
        expect(WORD_TEST.isInt("150.0")).toBeFalsy();
    });
});