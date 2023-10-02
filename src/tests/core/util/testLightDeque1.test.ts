import LightDeque from "../../../core/util/lightDeque";

describe("test whether lightDeque works well", () => {
    test("push front", () => {
        const lightDeque = new LightDeque<number>();
        lightDeque.pushRear(1);
        expect(lightDeque.size()).toBe(1);
        expect(lightDeque.isEmpty()).toBeFalsy();
    });
    test("push rear", () => {
        const lightDeque = new LightDeque<number>();
        lightDeque.pushRear(1);
        expect(lightDeque.size()).toBe(1);
        expect(lightDeque.isEmpty()).toBeFalsy();
    });
    test("peak front", () => {
        const lightDeque = new LightDeque<number>();
        lightDeque.pushRear(1);
        expect(lightDeque.peekFront()).toBe(1);
        expect(lightDeque.size()).toBe(1);
    });
    test("peak rear", () => {
        const lightDeque = new LightDeque<number>();
        lightDeque.pushRear(1);
        expect(lightDeque.peekRear()).toBe(1);
        expect(lightDeque.size()).toBe(1);
    });
    test("pop front", () => {
        const lightDeque = new LightDeque<number>();
        lightDeque.pushRear(1);
        expect(lightDeque.popFront()).toBe(1);
        expect(lightDeque.size()).toBe(0);
    });
    test("pop rear", () => {
        const lightDeque = new LightDeque<number>();
        lightDeque.pushRear(1);
        expect(lightDeque.popRear()).toBe(1);
        expect(lightDeque.size()).toBe(0);
    });
    test("clear", () => {
        const lightDeque = new LightDeque<number>();
        lightDeque.pushFront(1);
        lightDeque.pushRear(2);
        lightDeque.clear();
        expect(lightDeque.size()).toBe(0);
        expect(lightDeque.isEmpty()).toBeTruthy();
    });
});