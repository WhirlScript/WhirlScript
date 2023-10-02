import CODE_TYPES from "../types/parser/codeTypes";

class WordTest {
    isWord(x: string): boolean {
        if (!x) return false;
        const firstChar = x.charAt(0);
        if (!(
            firstChar >= "a" && firstChar <= "z"
            || firstChar >= "A" && firstChar <= "Z"
            || firstChar == "@" || firstChar == "#"
        )) {
            return false;
        }
        for (let i = 1; i < x.length; i++) {
            const char = x.charAt(i);
            if (!(char >= "a" && char <= "z") && !(char >= "A" && char <= "Z") && !(char >= "0" && char <= "9")) {
                return false;
            }
        }
        return true;
    }

    isNumber(x: string): boolean {
        if (x === null || x === "") {
            return false;
        }
        for (let i = 0; i < x.length; i++) {
            const char = x[i];
            if (char < "0" || char > "9") {
                return false;
            }
        }
        return true;
    }

    isOperator(x: string): boolean {
        return CODE_TYPES.operators.indexOf(x) >= 0;
    }
}

const WORD_TEST = new WordTest();

export default WORD_TEST;