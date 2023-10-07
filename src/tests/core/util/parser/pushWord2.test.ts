import Deque from "../../../../core/util/deque";
import Field from "../../../../core/types/parser/field";
import pushField from "../../../../core/util/parser/pushField";

describe("test pushWord method with empty value", () => {
    const deque = new Deque<Field>();
    const line = 1;
    test("ignore empty", () => {
        pushField(deque, "", "operator", line);
        expect(deque.isEmpty()).toEqual(true);
    });
});