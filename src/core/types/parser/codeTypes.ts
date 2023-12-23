class CodeTypes {
    separates = [" ", "\t", "\n"];
    operators = [
        "+", "-", "*", "/", "%",
        "=", "+=", "-=", "*=", "/=", "%=",
        "++", "--",
        ">>", "<<",
        "<", ">", ">=", "<=",
        "!", "&&", "||",
        "$", ".", ";", ":",
        "(", ")",
        "{", "}",
        "${"
    ];
    keywords = [
        "var", "const",
        "#var", "#const",
        "editable", "env", "final",
        "string", "int", "boolean",
        "false", "true",
        "function", "#function",
        "for", "while",
        "raw", "rawln",
        "cmd", "bash",
        "#import"
    ];
    definingBuiltinPropKeywords = [
        "editable", "env", "final"
    ];
    definingKeywords = [
        "var", "const",
        "#var", "#const",
        "function", "#function",
        "editable", "env", "final"
    ];
    escapes: {
        [key: string]: string
    } = {
        "\\": "\\",
        "n": "\n",
        "t": "\t",
        "\'": "\'",
        "\"": "\"",
        "\`": "\`",
        "\$": "$",
        "\n": ""
    };
    operatorPrecedence = {
        "!": 1,
        "++": 2,
        "--": 2,
        "+": 2,
        "-": 2,
        "<<": 3,
        ">>": 3,
        "*": 4,
        "/": 4,
        "%": 4,
        "<": 5,
        ">": 5,
        "<=": 5,
        ">=": 5,
        "==": 6,
        "!=": 6,
        "&&": 7,
        "||": 8
    };
}

const CODE_TYPES = new CodeTypes();
export default CODE_TYPES;

export type ValType = "boolean" | "int" | "string";
export type MacroValType = boolean | number | string;