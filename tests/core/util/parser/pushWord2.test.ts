import Deque from "../../../../src/core/util/deque";
import Word from "../../../../src/core/types/parser/word";
import pushWord from "../../../../src/core/util/parser/pushWord";

describe("test pushWord method with empty value", () => {
    const deque = new Deque<Word>();
    const line = 1;
    test("ignore empty", () => {
        pushWord(deque, "", "normal", line);
        expect(deque.isEmpty()).toEqual(true);
    });
});