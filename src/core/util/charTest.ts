class CharTest {
    isAlphabet(x: string): boolean {
        return (x >= "a" && x <= "z") || (x >= "A" && x <= "Z");
    }

    isNumber(x: string): boolean {
        return (x >= "0" && x <= "9");
    }
}

const CHAR_TEST = new CharTest();

export default CHAR_TEST;