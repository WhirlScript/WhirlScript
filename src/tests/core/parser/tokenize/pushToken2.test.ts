import Deque from "../../../../core/util/deque";
import Token from "../../../../core/types/parser/token";
import pushToken from "../../../../core/parser/tokenize/pushToken";
import Coordinate from "../../../../core/types/parser/coordinate";
import CliApi from "../../../../cli/types/api";
import ApiWrapper from "../../../../core/types/api/apiWrapper";

describe("test pushWord method with empty value", () => {
    const api = new ApiWrapper(new CliApi());
    const deque = new Deque<Token>();
    const coordinate: Coordinate = {
        file: "",
        line: 1,
        column: 1
    };
    test("ignore empty", () => {
        pushToken(deque, "", "operator", { coordinate, api });
        expect(deque.isEmpty()).toEqual(true);
    });
});