import MacroVal from "../../types/parser/macroVal";
import Val from "../../types/parser/val";
import Func from "../../types/parser/func";
import MacroFunc from "../../types/parser/macroFunc";
import Struct from "../../types/parser/struct";
import LOG_ERROR from "../../logger/logError";
import Coordinate from "../../types/parser/coordinate";
import { Segment } from "../../types/parser/segment";
import ApiWrapper from "../../types/api/apiWrapper";
import NativeFunc from "../../types/parser/nativeFunc";
import Annotation from "../../types/parser/annotation";
import BUILTIN_FLAG_FUNCTIONS from "../../builtin/function/builtinFlagFunctions";
import { BUILTIN_ANNOTATIONS } from "../../builtin/annotations/builtinAnnotations";

export default class Pools {
    // map: {
    //     [key: string]: string
    // } = {};
    // annotationPool: Annotation[] = [];
    // valPool: Val[] = [];
    // macroValPool: MacroVal[] = [];
    // constPool: Val[] = [];
    // macroFunctionPool: MacroFunc[] = [];
    constructor() {
        for (const builtinAnnotationsKey in BUILTIN_ANNOTATIONS) {
            this.symbolTable.push({
                type: "Annotation",
                name: builtinAnnotationsKey,
                value: BUILTIN_ANNOTATIONS[builtinAnnotationsKey]
            });
        }
        for (const builtinFlagFunctionsKey in BUILTIN_FLAG_FUNCTIONS) {
            this.symbolTable.push({
                type: "Function",
                name: builtinFlagFunctionsKey,
                value: BUILTIN_FLAG_FUNCTIONS[builtinFlagFunctionsKey]
            });
        }

        this.symbolTable.push(SYMBOL_SEPARATOR.scope);
    }

    renamePool: (Val | Func)[] = [];
    functionPool: Func[] = [];

    symbolTable: SymbolTable = [];

    popScope() {
        while (this.symbolTable.length > 0 && this.symbolTable.pop()?.type !== "Separator") {
        }
    }

    popMacroScope() {
        while (this.symbolTable.length > 0 && this.symbolTable.pop()?.type !== "MacroSeparator") {
        }
    }

    getSymbol(symbol: Segment.Name, coordinate: Coordinate, context: { api: ApiWrapper, namespace: string[] }) {
        const names: string[] = [symbol.namespaces.length == 0 ? symbol.value : symbol.namespaces.join("_") + "_" + symbol.value];
        for (let i = context.namespace.length - 1; i >= 0; i--) {
            names.push(context.namespace[i] + "_" + names[names.length - 1]);
        }
        let getMacro = true;
        for (let i = this.symbolTable.length - 1; i >= 0; i--) {
            if (names.indexOf(this.symbolTable[i].name) >= 0) {
                if (this.symbolTable[i].type != "MacroVal" || getMacro) {
                    return this.symbolTable[i];
                }
            }
            if (this.symbolTable[i].type == "MacroSeparator") {
                getMacro = false;
            }
        }
        context.api.logger.errorInterrupt(LOG_ERROR.unresolvedReference(symbol.value), coordinate);
    }

    pushSymbol(type: "Val" | "Function" | "MacroVal" | "MacroFunction" | "NativeFunction" | "Struct" | "Annotation" | "Separator" | "MacroSeparator",
               symbol: Segment.Name,
               value: Val | Func | MacroVal | MacroFunc | NativeFunc | Struct | Annotation | "",
               namespace: string[]) {
        const name = (namespace.length == 0 ? symbol.value : namespace.join("_")) +
            (symbol.namespaces.length == 0 ? symbol.value : symbol.namespaces.join("_")) + "_" + symbol.value;
        this.symbolTable.push({
            name,
            type,
            value
        });
    }
}

export interface Symbol {
    type: "Val" | "Function" | "MacroVal" | "MacroFunction" | "NativeFunction" | "Struct" | "Annotation" | "Separator" | "MacroSeparator",
    name: string,
    value: Val | Func | MacroVal | MacroFunc | NativeFunc | Struct | Annotation | ""
}

const SYMBOL_SEPARATOR: { scope: Symbol, macro: Symbol } = {
    scope: {
        type: "Separator",
        name: "",
        value: ""
    },
    macro: {
        type: "MacroSeparator",
        name: "",
        value: ""
    }

};

export type SymbolTable = Symbol[]

export { SYMBOL_SEPARATOR };
