import Deque from "../../../../core/util/deque";
import Field from "../../../../core/types/parser/field";
import pushField from "../../../../core/util/parser/pushField";
import Coordinate from "../../../../core/types/parser/Coordinate";
import CliApi from "../../../../cli/types/api";

describe("test pushWord method with empty value", () => {
    const api = new CliApi();
    const deque = new Deque<Field>();
    const coordinate: Coordinate = {
        file: "",
        line: 1,
        column: 1
    };
    test("ignore empty", () => {
        pushField(deque, "", "operator", { coordinate, api });
        expect(deque.isEmpty()).toEqual(true);
    });
});