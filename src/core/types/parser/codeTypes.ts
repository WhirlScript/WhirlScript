class CodeTypes {
    separates = [" ", "\t", "\n"];
    operators = [
        "+", "-", "*", "/", "%",
        "=", "+=", "-=", "*=", "/=", "%=",
        "++", "--",
        ">>", "<<",
        "<", ">", ">=", "<=", "==", "!=",
        "!", "&&", "||",
        "$", ".", ";", ":", ",",
        "::",
        "(", ")",
        "{", "}",
        "${",
        "_"
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
        "::": 0,
        ".": 0,
        "++": 1,
        "--": 1,
        "!": 2,
        "<<": 3,
        ">>": 3,
        "*": 4,
        "/": 4,
        "%": 4,
        "+": 5,
        "-": 5,
        "<": 6,
        ">": 6,
        "<=": 6,
        ">=": 6,
        "==": 7,
        "!=": 7,
        "&&": 8,
        "||": 9,
        "=": 10,
        "+=": 10,
        "-=": 10,
        "*=": 10,
        "/=": 10,
        "%=": 10,
        "<<=": 10,
        ">>=": 10
    };
}

const CODE_TYPES = new CodeTypes();
export default CODE_TYPES;
