class LogError {
    /// why I select such a long method name......
    readonly ERROR_TYPES = {
        SYNTAX_ERROR: "Syntax Error",
        FILE_ERROR: "File Error"
    };

    unknownFile(f: string) {
        return `${this.ERROR_TYPES.FILE_ERROR}: Unknown file ${f}`;
    }

    unterminatedStringLiteral() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Unterminated string literal`;
    }

    unresolvedReference(f: string) {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Unresolved reference ${f}`;
    }

    unexpectedFileEnd() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Unexpected file end`;
    }

    invalidCharacterOrToken(c: string) {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Invalid character or token ${c}`;
    }

    invalidAssertion() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Invalid assertion`;
    }

    templateStringInTemplateString() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Template string in template string`;
    }

    importInBlock() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: #import in block`;
    }

    nonGlobalFinalDefine() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Non-global final defining`;
    }

    notAnExpression() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR} Not an expression`;
    }

    notAType() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR} Not a type`;
    }

    unexpectedBlock() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR} Unexpected block.`;
    }

    mismatchFunctionCall() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Mismatch function call`;
    }

    redefine(f: string) {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Redefine ${f} with the same scope`;
    }

    reallyWeird() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: You encountered something really weird. Please report it.`;
    }

    missingExpectedSemicolon() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Missing expected semicolon(;).`;
    }

    missingExpectedComma() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Missing expected comma(,).`;
    }
    missingExpectedColon() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Missing expected colon(:).`;
    }
}

const LOG_ERROR = new LogError();
export default LOG_ERROR;