import LightDeque from "../../../core/util/lightDeque";

describe("test lightDeque built with list", () => {
    test("build", () => {
        const lightDeque = new LightDeque<number>([1, 2, 3]);
        expect(lightDeque.size()).toBe(3);
        expect(lightDeque.popFront()).toBe(1);
    });
});