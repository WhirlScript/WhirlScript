import WORD_TEST from "../../../../src/core/util/parser/wordTest";

describe("test wordTest.isWord method", () => {
    test("a should be a word", () => {
        expect(WORD_TEST.isWord("a")).toBeTruthy();
    });
    test("C should be a word", () => {
        expect(WORD_TEST.isWord("C")).toBeTruthy();
    });
    test("fn should be a word", () => {
        expect(WORD_TEST.isWord("fn")).toBeTruthy();
    });
    test("@count should be a word", () => {
        expect(WORD_TEST.isWord("@count")).toBeTruthy();
    });
    test("#function should be a word", () => {
        expect(WORD_TEST.isWord("#function")).toBeTruthy();
    });
    test("5 should not be word", () => {
        expect(WORD_TEST.isWord("5")).toBeFalsy();
    });
});