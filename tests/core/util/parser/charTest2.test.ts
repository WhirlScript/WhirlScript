import CHAR_TEST from "../../../../src/core/util/parser/charTest";

describe("test charTest.isNumber method", () => {
    test("a should not be number", () => {
        expect(CHAR_TEST.isNumber("a")).toBeFalsy();
    });
    test("C should not be number", () => {
        expect(CHAR_TEST.isNumber("C")).toBeFalsy();
    });
    test("5 should be number", () => {
        expect(CHAR_TEST.isNumber("5")).toBeTruthy();
    });
    test("0 should be number", () => {
        expect(CHAR_TEST.isNumber("0")).toBeTruthy();
    });
});