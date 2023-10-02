class LogError {
    /// why I select such a long method name......
    unterminatedStringLiteral() {
        return "Unterminated string literal.";
    }
    invalidCharacter(c:string){
        return `Invalid character ${c}`
    }
}

const LOG_ERROR = new LogError();
export default LOG_ERROR;