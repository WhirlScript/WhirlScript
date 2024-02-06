import { WhirlError } from "../types/api/loggerApi";

class LogError {
    /// why I select such a long method name......
    readonly ERROR_TYPES = {
        SYNTAX_ERROR: "Syntax Error",
        FILE_ERROR: "File Error"
    };

    unknownFile(f: string): WhirlError {
        return {
            type: this.ERROR_TYPES.FILE_ERROR,
            details: `Unknown file ${f}`
        };
    }

    unterminatedStringLiteral(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Unterminated string literal"
        };
    }

    unresolvedReference(f: string): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `Unresolved reference ${f}`
        };
    }

    unexpectedFileEnd(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Unexpected file end"
        };
    }

    invalidCharacterOrToken(c: string): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `Invalid character or token ${c}`
        };
    }

    invalidAssertion(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Invalid assertion"
        };
    }

    templateStringInTemplateString(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Template string in template string"
        };
    }

    importInBlock(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "#import in block"
        };
    }

    nonGlobalFinalDefine(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Non-global final defining"
        };
    }

    notAnExpression(): WhirlError {
        return { type: this.ERROR_TYPES.SYNTAX_ERROR, details: "Not an expression" };
    }

    notAType(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `Not a type`
        };
    }

    unexpectedBlock(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `Unexpected block.`
        };
    }

    mismatchFunctionCall(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Mismatch function call"
        };
    }

    redefine(f: string): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `Redefine ${f} with the same scope`
        };
    }

    reallyWeird(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `You encountered something really weird. Please report it.`
        };
    }

    missingExpectedSemicolon(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `Missing expected semicolon(;).`
        };
    }

    missingExpectedComma(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `Missing expected comma(,).`
        };
    }

    missingExpectedColon(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: `Missing expected colon(:).`
        };
    }
}

const LOG_ERROR = new LogError();
export default LOG_ERROR;