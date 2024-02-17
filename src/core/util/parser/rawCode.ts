import Deque from "../deque";
import Coordinate from "../../types/parser/coordinate";

export default class RawCode {
    value: string;
    coordinate: Coordinate;

    constructor(arg: {
        value: string,
        coordinate: Coordinate,
        child?: Deque<RawCode>;
    }) {
        this.value = arg.value;
        this.coordinate = arg.coordinate;
    }

}