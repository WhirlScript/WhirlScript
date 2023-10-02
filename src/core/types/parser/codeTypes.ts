class CodeTypes {
    separates = [" ", "\t", "\n"];
    operators = [
        "+", "-", "*", "/",
        "=", "+=", "-=", "*=", "/=",
        "++", "--",
        "<", ">", ">=", "<=",
        "!", "&&", "||",
        "$", ".",
        "(", ")"
        // "${", "{", "}"
    ];
    keywords = [
        "var", "const",
        "#var", "#const",
        "global", "editable", "env", "final",
        "string", "int", "boolean",
        "false", "true",
        "function", "#function",
        "for", "while",
        "raw", "rawln",
        "cmd", "bash"
    ];
    escapes = {
        "\\": "\\",
        "n": "\n",
        "t": "\t",
        "\'": "\'",
        "\"": "\"",
        "\`": "\`",
        "\$": "$"
    };
}

const CODE_TYPES = new CodeTypes();
export default CODE_TYPES;

export type ValType = "boolean" | "int" | "string"