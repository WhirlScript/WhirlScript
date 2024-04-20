import MacroVal from "../../types/parser/macroVal";
import Val from "../../types/parser/val";
import Func from "../../types/parser/func";
import MacroFunc from "../../types/parser/macroFunc";
import Struct from "../../types/parser/struct";
import LOG_ERROR from "../../logger/logError";
import Coordinate from "../../types/parser/coordinate";
import { PTN } from "../../types/parser/ptn";
import ApiWrapper from "../../types/api/apiWrapper";
import NativeFunc from "../../types/parser/nativeFunc";
import Annotation from "../../types/parser/annotation";
import BUILTIN_FLAG_FUNCTIONS from "../../builtin/function/builtinFlagFunctions";
import { BUILTIN_ANNOTATIONS } from "../../builtin/annotations/builtinAnnotations";
import Type from "../../types/parser/type";

export default class Pools {
    constructor(pools?: Pools) {
        if (pools != undefined) {
            this.renamePool = pools.renamePool;
            this.functionPool = pools.functionPool;
            this.symbolTable = pools.symbolTable;
            this.flags = pools.flags;
            this.requirePool = pools.requirePool;
            this.definePool = pools.definePool;
            return;
        }
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

    flags = {
        defineFunction: false
    };

    renamePool: SName[] = [];
    functionPool: Func[] = [];

    returnTypeStack: { type: Type, cnt: number }[] = [];

    symbolTable: SymbolTable = [];

    requirePool: (Func | Val)[][] = [[]];

    definePool: (Func | Val)[][] = [[]];

    pushReturnType(type: Type) {
        this.returnTypeStack.push({ type, cnt: 0 });
    }

    popScope() {
        while (this.symbolTable.length > 0 && this.symbolTable.pop()?.type !== "Separator") {
        }
    }

    popMacroScope() {
        while (this.symbolTable.length > 0 && this.symbolTable.pop()?.type !== "MacroSeparator") {
        }
    }

    getSymbol(symbol: PTN.Name, coordinate: Coordinate, context: { api: ApiWrapper, namespace: string[] }) {
        const names: string[] = [symbol.namespaces.length == 0 ? symbol.value : symbol.namespaces.join("_") + "_" + symbol.value];
        for (let i = context.namespace.length - 1; i >= 0; i--) {
            names.push(context.namespace[i] + "_" + names[names.length - 1]);
        }
        let getMacro = true;
        for (let i = this.symbolTable.length - 1; i >= 0; i--) {
            if (names.indexOf(this.symbolTable[i].name) >= 0) {
                if (this.symbolTable[i].type == "MacroVal" && !getMacro) {
                    const pref = this.symbolTable[i].value as MacroVal;
                    const val = new MacroVal(pref.type, { ...pref.prop, isConst: true }, pref.value);
                    return { ...this.symbolTable[i], value: val };
                } else {
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
               symbol: PTN.Name,
               value: Val | Func | MacroVal | MacroFunc | NativeFunc | Struct | Annotation | "",
               namespace: string[]) {
        const name = (namespace.length == 0 ? "" : namespace.join("_") + "_") +
            (symbol.namespaces.length == 0 ? "" : symbol.namespaces.join("_") + "_") + symbol.value;
        this.symbolTable.push({
            name,
            type,
            value
        });
    }

    pushRequirePool(item: Func | Val) {
        if (this.requirePool[this.requirePool.length - 1].indexOf(item) < 0) {
            this.requirePool[this.requirePool.length - 1].push(item);
        }
    }

    pushDefinePool(item: Func | Val) {
        if (this.definePool[this.definePool.length - 1].indexOf(item) < 0) {
            this.definePool[this.definePool.length - 1].push(item);
        }
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
export type SName = { v: string }

export { SYMBOL_SEPARATOR };
