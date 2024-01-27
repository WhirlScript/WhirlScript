import CODE_TYPES from "../types/parser/codeTypes";

class WordTest {
    isInt(x: string): boolean {
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

export default new WordTest();