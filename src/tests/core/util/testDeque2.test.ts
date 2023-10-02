import Deque from "../../../core/util/deque";

describe("test deque built with list", () => {
    test("build", () => {
        const deque = new Deque<number>([1, 2, 3]);
        expect(deque.size()).toBe(3);
        expect(deque.popFront()).toBe(1);
    });
});