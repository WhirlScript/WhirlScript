import { WhirlError } from "../types/api/loggerApi";

class LogError {
    /// why I select such a long method name......
    readonly ERROR_TYPES = {
        SYNTAX_ERROR: "Syntax Error",
        FILE_ERROR: "File Error",
        REFERENCE_ERROR: "Reference Error",
        MACRO_ERROR: "Macro Error"
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
            type: this.ERROR_TYPES.REFERENCE_ERROR,
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
            details: "Import in block"
        };
    }

    nonGlobalFinalDefine(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Non-global final defining"
        };
    }

    notAnExpression(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Not an expression"
        };
    }

    notAType(n: string): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: `${n} is not a type`
        };
    }

    notANamespace(n: string): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: `${n} is not a namespace`
        };
    }

    notAVal(n: string): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: `${n} is not a val`
        };
    }

    notAFunction(n: string): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: `${n} is not a function`
        };
    }

    unexpectedBlock(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Unexpected block."
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
            details: "Missing expected semicolon(;)"
        };
    }

    missingExpectedComma(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Missing expected comma(,)"
        };
    }

    missingExpectedColon(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Missing expected colon(:)"
        };
    }

    missingInitialValue(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Missing initial value"
        };
    }

    nativeVal(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Val cannot be native. Only functions can be native"
        };
    }

    notMacro(): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: "Not a macro value"
        };
    }

    notAVar(): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: "Not a var"
        };
    }

    notAnAnnotation(): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: "Not an annotation"
        };
    }

    missingType(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Missing type define"
        };
    }

    voidVal(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Void value"
        };
    }

    useBeforeInit(): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: "Use before init it"
        };
    }

    nativeError(e: unknown): WhirlError {
        return {
            type: this.ERROR_TYPES.MACRO_ERROR,
            details: `Native function error:\n${e}`
        };
    }

    nativeValueError(v: any): WhirlError {
        return {
            type: this.ERROR_TYPES.MACRO_ERROR,
            details: `${v} Cannot be convert to a WhirlScript value`
        };
    }

    baseTypeProperty(): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: "Base types do not have properties"
        };
    }

    noProperty(p: string): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: `Cannot find property ${p}`
        };
    }

    cannotStringify(): WhirlError {
        return {
            type: this.ERROR_TYPES.MACRO_ERROR,
            details: `Cannot stringify`
        };
    }

    mismatchingType(): WhirlError {
        return {
            type: this.ERROR_TYPES.REFERENCE_ERROR,
            details: "Mismatching type"
        };
    }

    functionInFunction(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Function in function"
        };
    }

    assignToConst(): WhirlError {
        return {
            type: this.ERROR_TYPES.SYNTAX_ERROR,
            details: "Assign to const"
        };
    }

    infiniteLoop() {
        return {
            type: this.ERROR_TYPES.MACRO_ERROR,
            details: "Infinite loop"
        };
    }
}

const LOG_ERROR = new LogError();
export default LOG_ERROR;