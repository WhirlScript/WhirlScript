import Deque from "../../../../core/util/deque";
import Word from "../../../../core/types/parser/word";
import pushWord from "../../../../core/util/parser/pushWord";

describe("test pushWord method with empty value", () => {
    const deque = new Deque<Word>();
    const line = 1;
    test("ignore empty", () => {
        pushWord(deque, "", "operator", line);
        expect(deque.isEmpty()).toEqual(true);
    });
});