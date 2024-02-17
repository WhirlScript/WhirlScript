import Struct from "./struct";

type TypeStruct = {
    type: "struct",
    struct: Struct
}

type TypeBase = {
    type: "base",
    base: "void" | "boolean" | "int" | "string"
}

type Type = {
    type: "struct",
    struct: Struct
} | {
    type: "base",
    base: "void" | "boolean" | "int" | "string"
}

const BASE_TYPES_NAME = ["void", "boolean", "int", "string"];
const BASE_TYPES: {
    void: Type
    boolean: Type;
    string: Type;
    int: Type
} = {
    void: {
        type: "base",
        base: "void"
    },
    boolean: {
        type: "base",
        base: "boolean"
    },
    int: {
        type: "base",
        base: "int"
    },
    string: {
        type: "base",
        base: "string"
    }
};

export default Type;
export { BASE_TYPES_NAME, BASE_TYPES };
export type { TypeBase, TypeStruct };