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
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Unterminated string literal.`;
    }

    invalidCharacterOrToken(c: string) {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Invalid character or token ${c}`;
    }

    templateStringInTemplateString() {
        return `${this.ERROR_TYPES.SYNTAX_ERROR}: Template string in template string`;
    }
}

const LOG_ERROR = new LogError();
export default LOG_ERROR;