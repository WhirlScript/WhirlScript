class LogError {
    /// why I select such a long method name......

    unknownFile(f: string) {
        return `File Error: Unknown file ${f}`;
    }

    unterminatedStringLiteral() {
        return "Syntax Error: Unterminated string literal.";
    }

    invalidCharacter(c: string) {
        return `Syntax Error: Invalid character ${c}`;
    }

    templateStringInTemplateString() {
        return `Syntax Error: Template string in template string`;
    }
}

const LOG_ERROR = new LogError();
export default LOG_ERROR;