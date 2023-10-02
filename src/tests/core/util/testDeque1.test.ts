import Deque from "../../../core/util/deque";

describe("test whether deque works well", () => {
    test("push front", () => {
        const deque = new Deque<number>();
        deque.pushRear(1);
        expect(deque.size()).toBe(1);
        expect(deque.isEmpty()).toBeFalsy();
    });
    test("push rear", () => {
        const deque = new Deque<number>();
        deque.pushRear(1);
        expect(deque.size()).toBe(1);
        expect(deque.isEmpty()).toBeFalsy();
    });
    test("peak front", () => {
        const deque = new Deque<number>();
        deque.pushRear(1);
        expect(deque.peekFront()).toBe(1);
        expect(deque.size()).toBe(1);
    });
    test("peak rear", () => {
        const deque = new Deque<number>();
        deque.pushRear(1);
        expect(deque.peekRear()).toBe(1);
        expect(deque.size()).toBe(1);
    });
    test("pop front", () => {
        const deque = new Deque<number>();
        deque.pushRear(1);
        expect(deque.popFront()).toBe(1);
        expect(deque.size()).toBe(0);
    });
    test("pop rear", () => {
        const deque = new Deque<number>();
        deque.pushRear(1);
        expect(deque.popRear()).toBe(1);
        expect(deque.size()).toBe(0);
    });
    test("clear", () => {
        const deque = new Deque<number>();
        deque.pushFront(1);
        deque.pushRear(2);
        deque.clear();
        expect(deque.size()).toBe(0);
        expect(deque.isEmpty()).toBeTruthy();
    });
});