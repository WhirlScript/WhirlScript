import CHAR_TEST from "../../../../core/util/parser/charTest";

describe("test charTest.isAlphabet method", () => {
    test("a should be alphabet", () => {
        expect(CHAR_TEST.isAlphabet("a")).toBeTruthy();
    });
    test("C should be alphabet", () => {
        expect(CHAR_TEST.isAlphabet("C")).toBeTruthy();
    });
    test("5 should not be alphabet", () => {
        expect(CHAR_TEST.isAlphabet("5")).toBeFalsy();
    });
    test("0 should not be alphabet", () => {
        expect(CHAR_TEST.isAlphabet("0")).toBeFalsy();
    });
});