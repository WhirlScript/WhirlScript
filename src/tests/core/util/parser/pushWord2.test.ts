import Deque from "../../../../core/util/deque";
import Field from "../../../../core/types/parser/field";
import pushField from "../../../../core/util/parser/pushField";
import Coordinate from "../../../../core/types/parser/Coordinate";

describe("test pushWord method with empty value", () => {
    const deque = new Deque<Field>();
    const coordinate: Coordinate = {
        file: "",
        line: 1,
        column: 1
    };
    test("ignore empty", () => {
        pushField(deque, "", "operator", coordinate);
        expect(deque.isEmpty()).toEqual(true);
    });
});