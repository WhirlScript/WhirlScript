import Deque from "../../../core/util/lightDeque";

describe("test lightDeque built with list", () => {
    test("get with index", () => {
        const lightDeque = new Deque<number>();
        lightDeque.pushFront(1);
        expect(lightDeque.data[0]).toBe(1);
    });
});