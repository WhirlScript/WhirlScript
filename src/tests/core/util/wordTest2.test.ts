import WORD_TEST from "../../../core/util/wordTest";

describe("test wordTest.isOperator method", () => {
    test("a should not not be an operator", () => {
        expect(WORD_TEST.isOperator("a")).toBeFalsy();
    });
    test("5 should not be an operator", () => {
        expect(WORD_TEST.isOperator("5")).toBeFalsy();
    });
    test("150.0 should not be an operator", () => {
        expect(WORD_TEST.isOperator("150.0")).toBeFalsy();
    });
    test("+ should be an operator", () => {
        expect(WORD_TEST.isOperator("+")).toBeTruthy();
    });
    test(">= should be an operator", () => {
        expect(WORD_TEST.isOperator(">=")).toBeTruthy();
    });
});