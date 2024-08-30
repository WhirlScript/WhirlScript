import { PTN } from "../../types/parser/ptn";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";
import Pools from "../../util/parser/pools";
import { AST } from "../../types/parser/AST";
import typeCalc from "../../util/parser/typeCalc";
import LOG_ERROR from "../../logger/logError";
import Type, { BASE_TYPES, TypeStruct } from "../../types/parser/type";
import Struct from "../../types/parser/struct";
import MacroVal from "../../types/parser/macroVal";
import LOG_WARNING from "../../logger/logWarning";
import Val from "../../types/parser/val";
import Func from "../../types/parser/func";
import MacroFunc from "../../types/parser/macroFunc";
import NativeFunc from "../../types/parser/nativeFunc";
import preprocessSegment from "./preprocessSegment";
import BUILTIN_FLAG_FUNCTIONS from "../../builtin/function/builtinFlagFunctions";

export default function preprocessValue(
    parseTreeRaw: PTN.Value,
    coordinateChain: Coordinate[] = [],
    requirement: {
        target: "sh" | "bat";
    },
    context: {
        api: ApiWrapper,
        pools: Pools,
        hasError: { v: boolean },
        namespace: string[]
    }
): AST.Value {
    const { api, pools, namespace } = context;
    let parseTree = parseTreeRaw;

    function reportError() {
        context.hasError.v = true;
    }

    if (parseTree instanceof PTN.Assertion) {
        const v = preprocessValue(parseTree.value, coordinateChain, requirement, context);
        if (v instanceof AST.EmptyValue) {
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }
        if (v instanceof AST.ValueWrapper) {
            v.valueType = typeCalc.getTypeWithName(parseTree.toType, context);
            return v;
        }
        return new AST.ValueWrapper(
            {
                ...parseTree.coordinate,
                chain: coordinateChain
            },
            typeCalc.getTypeWithName(parseTree.toType, context),
            [],
            {
                isMacro: v.isMacro,
                hasScope: false
            },
            v
        );
    }
    if (parseTree instanceof PTN.Int) {
        return new AST.Int(
            {
                ...parseTree.coordinate,
                chain: coordinateChain
            },
            parseTree.value
        );
    }
    if (parseTree instanceof PTN.Bool) {
        return new AST.Bool(
            {
                ...parseTree.coordinate,
                chain: coordinateChain
            },
            parseTree.value
        );
    }
    if (parseTree instanceof PTN.String) {
        return new AST.String(
            {
                ...parseTree.coordinate,
                chain: coordinateChain
            },
            parseTree.value
        );
    }
    if (parseTree instanceof PTN.TemplateString) {
        let values: AST.Value[] = [];
        for (const value of parseTree.values) {
            let r = preprocessValue(value, coordinateChain, requirement, context);
            if (r instanceof AST.EmptyValue) {
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
            if (r instanceof AST.MacroValCall) {
                if (!r.val.value) {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...r.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
                r = r.val.value;
            }
            if (r.valueType.type == "struct") {
                api.logger.error(LOG_ERROR.cannotStringify(), {
                    ...r.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
            if (values.length == 0) {
                if (r instanceof AST.Bool || r instanceof AST.Int) {
                    values.push(r.toStr());
                } else {
                    values.push(r);
                }
            } else {
                if (r.isMacro) {
                    if (values[values.length - 1] instanceof AST.String) {
                        const b = <AST.String>values.pop();
                        values.push(
                            new AST.String(
                                {
                                    ...b.coordinate,
                                    chain: coordinateChain
                                },
                                b.value + (<AST.MacroBase>r).toStr().value
                            )
                        );
                    } else {
                        values.push((<AST.MacroBase>r).toStr());
                    }
                } else {
                    values.push(r);
                }
            }
        }
        if (values.length == 1 && values[0] instanceof AST.String) {
            return values[0];
        } else {
            return new AST.TemplateString(
                {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                },
                values
            );
        }
    }
    if (parseTree instanceof PTN.StructBlock) {
        const def: { [key: string]: Type } = {};
        const inside: { [key: string]: AST.Value } = {};
        for (const key in parseTree.inside) {
            inside[key] = preprocessValue(parseTree.inside[key], coordinateChain, requirement, context);
            if (inside[key] instanceof AST.EmptyValue) {
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
            if (inside[key] instanceof AST.MacroValCall) {
                const v = (<AST.MacroValCall>inside[key]).val.value;
                if (v) {
                    inside[key] = v;
                } else {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...inside[key].coordinate
                        , chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            }
            def[key] = inside[key].valueType;
        }
        const struct = new Struct("", def);
        return new AST.StructBlock(
            {
                ...parseTree.coordinate,
                chain: coordinateChain
            },
            inside,
            {
                type: "struct",
                struct
            }
        );
    }
    if (parseTree instanceof PTN.ValCall) {
        const symbol = context.pools.getSymbol(
            parseTree.valName,
            {
                ...parseTree.coordinate,
                chain: coordinateChain
            },
            { api, namespace }
        );
        if (symbol.type != "Val" && symbol.type != "MacroVal") {
            api.logger.error(LOG_ERROR.notAVal(symbol.name), {
                ...parseTree.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }
        if (symbol.type == "MacroVal") {
            const val = <MacroVal>symbol.value;
            if (val.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
            if (!val.value) {
                api.logger.error(LOG_ERROR.useBeforeInit(), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
            return new AST.MacroValCall(parseTree.coordinate, val);
        }
        if (symbol.type == "Val") {
            const val = <Val>symbol.value;
            if (val.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
            val.used = true;
            pools.pushRequirePool(val);
            if (!val.isInit) {
                api.logger.error(LOG_ERROR.useBeforeInit(), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
                reportError();
            }
            return new AST.ValCall(
                {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                },
                val
            );
        }
    }
    if (parseTree instanceof PTN.FunctionCall) {
        const symbol = context.pools.getSymbol(
            parseTree.functionName,
            {
                ...parseTree.coordinate,
                chain: coordinateChain
            },
            { api, namespace }
        );
        if (symbol.type == "Function") {
            const func = <Func>symbol.value;
            if (func.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
            func.used = true;
            pools.pushRequirePool(func);
            const args: AST.Value[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (parseTree.args[i]) {
                    const a = preprocessValue(parseTree.args[i], coordinateChain, requirement, context);
                    if (a instanceof AST.EmptyValue) {
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (func.args[i].isMacro && !a.isMacro) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    args.push(a);
                } else {
                    if (!func.args[i].defaultValue) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    args.push(<AST.Value>func.args[i].defaultValue);
                }
            }
            return new AST.FunctionCall(
                {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                },
                func,
                args
            );
        }
        if (symbol.type == "MacroFunction") {
            const func = <MacroFunc>symbol.value;
            const p = new Pools(pools);
            p.symbolTable = [];
            for (let i = 0; i < func.symbolTableLength; i++) {
                p.symbolTable.push(pools.symbolTable[i]);
            }

            if (func.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
            if (func.prop.hasScope) {
                p.symbolTable.push({
                    name: "",
                    type: "Separator",
                    value: ""
                });
            }
            pools.pushReturnType(func.type);
            const beforeReturn = () => {
                pools.returnTypeStack.pop();
                if (func.prop.hasScope) {
                    p.popScope();
                }
            };
            const rStates: AST.AbstractSyntaxTreeNode[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (parseTree.args[i]) {
                    let a = preprocessValue(parseTree.args[i], coordinateChain, requirement, context);
                    if (a instanceof AST.EmptyValue) {
                        reportError();
                        beforeReturn();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (a instanceof AST.MacroValCall) {
                        const v = a.val.value;
                        if (v) {
                            a = v;
                        } else {
                            api.logger.error(LOG_ERROR.useBeforeInit(), {
                                ...a.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            beforeReturn();
                            return new AST.EmptyValue(parseTree.coordinate);
                        }
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        beforeReturn();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (func.args[i].isMacro && !a.isMacro) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        beforeReturn();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (a.isMacro) {
                        p.symbolTable.push({
                            name: func.args[i].name,
                            type: "MacroVal",
                            value: new MacroVal(
                                func.args[i].type,
                                { deprecated: false, isConst: false },
                                a
                            )
                        });
                    } else {
                        const val = new Val(func.args[i].name, {
                            ...func.coordinate,
                            chain: coordinateChain
                        }, func.args[i].type, {
                            deprecated: false,
                            isConst: false,
                            optional: false
                        });
                        val.isInit = true;
                        rStates.push(
                            new AST.ExpressionSVO(
                                {
                                    ...parseTree.coordinate,
                                    chain: coordinateChain
                                },
                                new AST.ValCall(
                                    {
                                        ...parseTree.coordinate,
                                        chain: coordinateChain
                                    },
                                    val
                                ),
                                "=",
                                a,
                                val.type
                            )
                        );
                        p.renamePool.push(val.name);
                        p.symbolTable.push({
                            name: func.args[i].name,
                            type: "Val",
                            value: val
                        });
                    }
                } else {
                    if (!func.args[i].defaultValue) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        beforeReturn();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (func.args[i].isMacro) {
                        p.symbolTable.push({
                            name: func.args[i].name,
                            type: "MacroVal",
                            value: new MacroVal(
                                func.args[i].type,
                                {
                                    deprecated: false,
                                    isConst: false
                                },
                                func.args[i].defaultValue
                            )
                        });
                    } else {
                        const val = new Val(func.args[i].name, {
                            ...func.coordinate,
                            chain: coordinateChain
                        }, func.args[i].type, {
                            deprecated: false,
                            isConst: false,
                            optional: false
                        });
                        rStates.push(
                            new AST.ExpressionSVO(
                                {
                                    ...parseTree.coordinate,
                                    chain: coordinateChain
                                },
                                new AST.ValCall(
                                    {
                                        ...parseTree.coordinate,
                                        chain: coordinateChain
                                    },
                                    val
                                ),
                                "=",
                                <AST.Value>func.args[i].defaultValue,
                                val.type
                            )
                        );
                        p.renamePool.push(val.name);
                        p.pushDefinePool(val);
                        p.symbolTable.push({
                            name: func.args[i].name,
                            type: "Val",
                            value: val
                        });
                    }
                }
            }
            let macroReturnValue: AST.Value | undefined;
            for (const segInside of func.body.inside) {
                //TODO-implement: closure
                const s = preprocessSegment(
                    segInside,
                    [...coordinateChain, parseTree.coordinate],
                    requirement,
                    { ...context, pools: p }
                );
                if (!(s instanceof AST.Empty)) {
                    rStates.push(s);
                }
                if (s.macroReturnValue) {
                    macroReturnValue = s.macroReturnValue;
                    if (!typeCalc.contains(macroReturnValue.valueType, func.type)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...macroReturnValue.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        beforeReturn();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (macroReturnValue instanceof AST.ValueWrapper) {
                        if (macroReturnValue.codes.length > 0) {
                            rStates.push(macroReturnValue);
                        }
                        macroReturnValue = macroReturnValue.value;
                    }
                    break;
                }
            }
            beforeReturn();
            if (func.prop.isConstexpr && (!macroReturnValue || !macroReturnValue.isMacro)) {
                api.logger.error(
                    LOG_ERROR.notMacro(),
                    macroReturnValue?.coordinate ?? {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    }
                );
            }
            // TODO-optimise: if no body?
            return new AST.ValueWrapper(
                {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                },
                func.type,
                rStates,
                {
                    isMacro: func.prop.isConstexpr,
                    hasScope: func.prop.hasScope
                },
                macroReturnValue
            );
        }
        if (symbol.type == "NativeFunction") {
            const func = <NativeFunc>symbol.value;
            if (func.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
            const args: any[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (parseTree.args[i]) {
                    let a = preprocessValue(parseTree.args[i], coordinateChain, requirement, context);
                    if (a instanceof AST.EmptyValue) {
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (a instanceof AST.MacroValCall) {
                        const v = a.val.value;
                        if (v) {
                            a = v;
                        } else {
                            api.logger.error(LOG_ERROR.useBeforeInit(), {
                                ...a.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new AST.EmptyValue(parseTree.coordinate);
                        }
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    if (!a.isMacro) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    try {
                        args.push(
                            typeCalc.valueToObj(
                                a,
                                {
                                    ...a.coordinate,
                                    chain: coordinateChain
                                },
                                { api }
                            )
                        );
                    } catch (e) {
                        api.logger.error(LOG_ERROR.nativeError(e), {
                            ...a.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                } else {
                    if (!func.args[i].defaultValue) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    args.push(
                        typeCalc.valueToObj(
                            <AST.Value>func.args[i].defaultValue,
                            {
                                ...(<AST.Value>func.args[i].defaultValue).coordinate,
                                chain: coordinateChain
                            },
                            { api }
                        )
                    );
                }
            }
            let o: any;
            try {
                o = func.body(...args);
            } catch (e) {
                api.logger.error(LOG_ERROR.nativeError(e), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
            return typeCalc.objToValue(
                o,
                {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                },
                { api }
            );
        }
        api.logger.error(LOG_ERROR.notAFunction(symbol.name), {
            ...parseTree.coordinate,
            chain: coordinateChain
        });
        reportError();
        return new AST.EmptyValue(parseTree.coordinate);
    }
    if (parseTree instanceof PTN.Exec) {
        const a = preprocessValue(parseTree.command, coordinateChain, requirement, context);
        if (a instanceof AST.EmptyValue) {
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }
        if (!typeCalc.contains(a.valueType, BASE_TYPES.string)) {
            api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                ...parseTree.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }

        return new AST.FunctionCall(
            {
                ...parseTree.coordinate,
                chain: coordinateChain
            },
            BUILTIN_FLAG_FUNCTIONS["exec"],
            [a]
        );
    }
    if (parseTree instanceof PTN.ExpressionSVO) {
        let s = preprocessValue(parseTree.s, coordinateChain, requirement, context);
        if (s instanceof AST.EmptyValue) {
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }
        if (parseTree.v == ".") {
            if (!(parseTree.o instanceof PTN.ValCall)) {
                api.logger.error(LOG_ERROR.unresolvedReference(""), {
                    ...parseTree.o.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
            if (parseTree.o.valName.namespaces.length != 0) {
                api.logger.error(LOG_ERROR.unresolvedReference(""), {
                    ...parseTree.o.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
            const o = parseTree.o.valName.value;
            if (s.valueType.type == "base") {
                api.logger.error(LOG_ERROR.baseTypeProperty(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            } else {
                if (s.valueType.struct.def[o]) {
                    if (s instanceof AST.ValueWrapper) {
                        if (!s.value) {
                            api.logger.error(LOG_ERROR.unresolvedReference("null"), {
                                ...parseTree.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new AST.EmptyValue(parseTree.coordinate);
                        }
                        if (s.isMacro) {
                            return new AST.ValueWrapper(
                                s.coordinate,
                                s.valueType,
                                s.codes,
                                {
                                    isMacro: s.isMacro,
                                    hasScope: s.hasScope
                                },
                                (<AST.StructBlock>s.value).inside[o]
                            );
                        } else {
                            return new AST.ValueWrapper(
                                s.coordinate,
                                s.valueType,
                                s.codes,
                                {
                                    isMacro: s.isMacro,
                                    hasScope: s.hasScope
                                },
                                new AST.GetProperty(
                                    s.coordinate,
                                    <AST.Value>s.value,
                                    o,
                                    s.valueType.struct.def[o]
                                )
                            );
                        }
                    }
                    let s1 = s;
                    if (s1 instanceof AST.MacroValCall) {
                        const v = s1.val.value;
                        if (v) {
                            s1 = v;
                        } else {
                            api.logger.error(LOG_ERROR.useBeforeInit(), {
                                ...s1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new AST.EmptyValue(parseTree.coordinate);
                        }
                    }
                    if (s1 instanceof AST.StructBlock) {
                        if (s1.isMacro) {
                            return s1.inside[o];
                        } else {
                            return new AST.GetProperty(
                                parseTree.coordinate,
                                s1,
                                o,
                                (<TypeStruct>s1.valueType).struct.def[o]
                            );
                        }
                    }
                    if (s1 instanceof AST.ValCall) {
                        return new AST.GetProperty(
                            parseTree.coordinate,
                            s1,
                            o,
                            (<TypeStruct>s1.valueType).struct.def[o],
                            s1.val
                        );
                    }
                    if (s1 instanceof AST.GetProperty) {
                        return new AST.GetProperty(
                            parseTree.coordinate,
                            s1,
                            o,
                            (<TypeStruct>s1.valueType).struct.def[o],
                            s1.valObj
                        );
                    }
                    api.logger.error(LOG_ERROR.reallyWeird(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
                api.logger.error(LOG_ERROR.noProperty(o), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
        }
        let v = parseTree.v;

        let o: AST.Value;
        if (v == "+=") {
            v = "+";
            o = preprocessValue(
                new PTN.ExpressionSVO(parseTree.coordinate, parseTree.s, "+", parseTree.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "-=") {
            v = "-";
            o = preprocessValue(
                new PTN.ExpressionSVO(parseTree.coordinate, parseTree.s, "-", parseTree.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "*=") {
            v = "*";
            o = preprocessValue(
                new PTN.ExpressionSVO(parseTree.coordinate, parseTree.s, "*", parseTree.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "/=") {
            v = "/";
            o = preprocessValue(
                new PTN.ExpressionSVO(parseTree.coordinate, parseTree.s, "/", parseTree.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "%=") {
            v = "%";
            o = preprocessValue(
                new PTN.ExpressionSVO(parseTree.coordinate, parseTree.s, "%", parseTree.o),
                coordinateChain,
                requirement,
                context
            );
        } else {
            o = preprocessValue(parseTree.o, coordinateChain, requirement, context);
        }
        if (o instanceof AST.EmptyValue) {
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }

        if (typeCalc.equalsTo(s.valueType, BASE_TYPES.void) ||
            typeCalc.equalsTo(o.valueType, BASE_TYPES.void)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...parseTree.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }
        if (v == "=") {
            if (s instanceof AST.ValCall) {
                if (s.val.prop.isConst) {
                    api.logger.error(LOG_ERROR.notAVar(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
                if (typeCalc.contains(o.valueType, s.valueType)) {
                    s.val.isInit = true;
                    return new AST.ExpressionSVO(parseTree.coordinate, s, parseTree.v, o, s.valueType);
                } else {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            } else if (s instanceof AST.GetProperty) {
                if (s.valObj) {
                    if (typeCalc.contains(o.valueType, s.valueType)) {
                        return new AST.ExpressionSVO(parseTree.coordinate, s, parseTree.v, o, s.valueType);
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                } else {
                    api.logger.error(LOG_ERROR.notAVar(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            } else if (s instanceof AST.MacroValCall) {
                const val = s.val;
                if (!o.isMacro) {
                    api.logger.error(LOG_ERROR.notMacro(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
                if (!typeCalc.contains(o.valueType, s.valueType)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
                let o1 = o;
                let type = o1.valueType;
                if (o1 instanceof AST.ValueWrapper) {
                    if (o1.codes) {
                        const vw = o1;
                        if (!vw.value) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...o1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new AST.EmptyValue(parseTree.coordinate);
                        }
                        if (!typeCalc.contains(type, val.type)) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...o1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new AST.EmptyValue(parseTree.coordinate);
                        }
                        val.value = vw.value;
                        return o1;
                    } else {
                        if (!o1.value) {
                            api.logger.error(LOG_ERROR.missingType(), {
                                ...o1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new AST.EmptyValue(parseTree.coordinate);
                        }
                        o1 = o1.value;
                    }
                }
                if (o1 instanceof AST.MacroValCall) {
                    if (o1.val.value) {
                        o1 = o1.val.value;
                    } else {
                        api.logger.error(LOG_ERROR.useBeforeInit(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                }
                const v = MacroVal.fromValue(o1, val.prop.isConst, { api });
                val.value = v.val.value;
                if (v.wrapper) {
                    v.wrapper.valueType = val.type;
                    v.wrapper.value = val.value;
                    return v.wrapper;
                }
                if (val.value) {
                    return val.value;
                } else {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            } else {
                api.logger.error(LOG_ERROR.notAVar(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
        }
        if (s.valueType.type == "struct" || o.valueType.type == "struct") {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...parseTree.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }
        if (s.isMacro && o.isMacro) {
            const codes: AST.ValueWrapper[] = [];
            const sType = s.valueType;
            const oType = o.valueType;

            const wrap = (value: AST.Value): AST.Value => {
                if (codes.length == 0) {
                    return value;
                }
                if (codes.length == 1) {
                    codes[0].value = value;
                    codes[0].valueType = value.valueType;
                    return codes[0];
                }
                return new AST.ValueWrapper(
                    parseTree.coordinate,
                    value.valueType,
                    codes,
                    {
                        isMacro: true,
                        hasScope: false
                    },
                    value
                );
            };

            if (s instanceof AST.ValueWrapper) {
                if (s.codes.length > 0) {
                    codes.push(<AST.ValueWrapper>s);
                }
                s = <AST.Value>s.value;
            }
            if (o instanceof AST.ValueWrapper) {
                if (o.codes.length > 0) {
                    codes.push(<AST.ValueWrapper>o);
                }
                o = <AST.Value>o.value;
            }
            if (s instanceof AST.MacroValCall) {
                const val = s.val;
                if (val.value) {
                    s = val.value;
                } else {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            }
            if (o instanceof AST.MacroValCall) {
                const val = o.val;
                if (val.value) {
                    o = val.value;
                } else {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            }
            if (!typeCalc.equalsTo(sType, s.valueType)) {
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean)) {
                    const str = (<AST.MacroBase>s).toStr().value;
                    if (str == "1") {
                        s = new AST.Bool(s.coordinate, true);
                    } else if (str == "0") {
                        s = new AST.Bool(s.coordinate, false);
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...s.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        s = new AST.Bool(s.coordinate, true);
                    }
                }
                if (typeCalc.equalsTo(sType, BASE_TYPES.int)) {
                    const num = Number((<AST.MacroBase>s).toStr().value);
                    if (isNaN(num)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...s.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    s = new AST.Int(s.coordinate, num);
                }
            }
            if (!typeCalc.equalsTo(oType, o.valueType)) {
                if (typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                    const str = (<AST.MacroBase>o).toStr().value;
                    if (str == "1") {
                        o = new AST.Bool(o.coordinate, true);
                    } else if (str == "0") {
                        o = new AST.Bool(o.coordinate, false);
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        o = new AST.Bool(o.coordinate, true);
                    }
                }
                if (typeCalc.equalsTo(oType, BASE_TYPES.int)) {
                    const num = Number((<AST.MacroBase>o).toStr().value);
                    if (isNaN(num)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                    o = new AST.Int(o.coordinate, num);
                }
            }
            if (v == "+") {
                if (typeCalc.equalsTo(sType, BASE_TYPES.string) ||
                    typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    return wrap(new AST.String(parseTree.coordinate,
                        (<AST.MacroBase>s).toStr().value + (<AST.MacroBase>o).toStr().value));
                }
            } else if (v == "==" || v == "!=") {
                if (!(sType.type == "base") || !(oType.type == "base")) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
                if (v == "==") {
                    return wrap(new AST.Bool(parseTree.coordinate, (<AST.MacroBase>s).value == (<AST.MacroBase>o).value));
                } else {
                    return wrap(new AST.Bool(parseTree.coordinate, (<AST.MacroBase>s).value != (<AST.MacroBase>o).value));
                }
            } else {
                if (typeCalc.equalsTo(sType, BASE_TYPES.string) ||
                    typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            }
            if (["+", "-", "*", "/", "%", ">>", "<<"].indexOf(v) >= 0) {
                let l: number;
                let r: number;
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean)) {
                    l = (<AST.Bool>s).value ? 1 : 0;
                } else {
                    l = (<AST.Int>s).value;
                }
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean)) {
                    r = (<AST.Bool>s).value ? 1 : 0;
                } else {
                    r = (<AST.Int>s).value;
                }
                return wrap(new AST.Int(parseTree.coordinate, (new Function(`${l}${v}${r}`))()));
            }
            if (["<", ">", ">=", "<=", "==", "!="].indexOf(v) >= 0) {
                return wrap(new AST.Bool(parseTree.coordinate,
                    (new Function(`${(<AST.MacroBase>s).toStr().value}${v}${(<AST.MacroBase>o).toStr().value}`)())));
            }
            if (v == "&&" || v == "||") {
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean) && typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                    if (v == "&&") {
                        return wrap(new AST.Bool(parseTree.coordinate, (<AST.Bool>s).value && (<AST.Bool>o).value));
                    } else {
                        return wrap(new AST.Bool(parseTree.coordinate, (<AST.Bool>s).value || (<AST.Bool>o).value));
                    }
                }
                api.logger.error(LOG_ERROR.mismatchingType(), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
        } else {
            const codes: AST.ValueWrapper[] = [];
            const sType = s.valueType;
            const oType = o.valueType;

            if (s instanceof AST.ValueWrapper) {
                if (s.codes.length > 0) {
                    codes.push(s);
                }
                s = <AST.Value>s.value;
            }
            if (o instanceof AST.ValueWrapper) {
                if (o.codes.length > 0) {
                    codes.push(o);
                }
                o = <AST.Value>o.value;
            }
            let type: Type;
            if (v == "+") {
                if (typeCalc.equalsTo(sType, BASE_TYPES.string) ||
                    typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    type = BASE_TYPES.string;
                } else {
                    type = BASE_TYPES.int;
                }
            } else if (v == "==" || v == "!=") {
                type = BASE_TYPES.boolean;
            } else {
                if (typeCalc.equalsTo(sType, BASE_TYPES.string) ||
                    typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                } else if (["-", "*", "/", "%", ">>", "<<"].indexOf(v) >= 0) {
                    type = BASE_TYPES.int;
                } else if (["<", ">", ">=", "<="].indexOf(v) >= 0) {
                    type = BASE_TYPES.boolean;
                } else if (v == "&&" || v == "||") {
                    if (typeCalc.equalsTo(sType, BASE_TYPES.boolean) && typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                        type = BASE_TYPES.boolean;
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                } else {
                    api.logger.error(LOG_ERROR.invalidCharacterOrToken(v), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            }
            const value = new AST.ExpressionSVO(parseTree.coordinate, s, v, o, type);

            if (codes.length == 0) {
                return value;
            }
            if (codes.length == 1) {
                codes[0].value = value;
                codes[0].valueType = value.valueType;
                return codes[0];
            }
            return new AST.ValueWrapper(
                parseTree.coordinate,
                type,
                codes,
                {
                    isMacro: true,
                    hasScope: false
                },
                value
            );
        }
    }

    if (parseTree instanceof PTN.ExpressionSV) {
        let s = preprocessValue(parseTree.s, coordinateChain, requirement, context);
        if (s instanceof AST.EmptyValue) {
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }
        let v = parseTree.v;

        if (!typeCalc.equalsTo(s.valueType, BASE_TYPES.int)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...parseTree.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }

        if (s instanceof AST.MacroValCall) {
            const val = s.val;
            if (val.value) {
                if (typeCalc.equalsTo(val.type, BASE_TYPES.int)) {
                    const ret = new AST.Int(parseTree.coordinate, (<AST.Int>val.value).value);
                    if (v == "++") {
                        val.value = new AST.Int(parseTree.coordinate, (<AST.Int>val.value).value + 1);
                        return ret;
                    }
                    if (v == "--") {
                        val.value = new AST.Int(parseTree.coordinate, (<AST.Int>val.value).value - 1);
                        return ret;
                    }
                }
                if (typeCalc.equalsTo(val.type, BASE_TYPES.string)) {
                    let num = Number((<AST.String>val.value).value);
                    if (isNaN(num)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...s.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        num = 0;
                    }
                    const ret = new AST.Int(parseTree.coordinate, num);
                    if (v == "++") {
                        val.value = new AST.String(parseTree.coordinate, (num + 1).toString());
                        return ret;
                    }
                    if (v == "--") {
                        val.value = new AST.String(parseTree.coordinate, (num - 1).toString());
                        return ret;
                    }
                }
                api.logger.error(LOG_ERROR.invalidCharacterOrToken(v), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            } else {
                api.logger.error(LOG_ERROR.useBeforeInit(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
        }
        if (s instanceof AST.ValCall) {
            if (s.val.prop.isConst) {
                api.logger.error(LOG_ERROR.assignToConst(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
            }
            return new AST.ExpressionSV(parseTree.coordinate, s, parseTree.v, s.valueType);
        }
        if (s instanceof AST.GetProperty) {
            if (s.valObj && !s.valObj.prop.isConst) {
                return new AST.ExpressionSV(parseTree.coordinate, s, parseTree.v, s.valueType);
            } else {
                api.logger.error(LOG_ERROR.notAVar(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
        }
    }

    if (parseTree instanceof PTN.ExpressionVO) {
        let v = parseTree.v;
        let o = preprocessValue(parseTree.o, coordinateChain, requirement, context);
        if (o instanceof AST.EmptyValue) {
            reportError();
            return new AST.EmptyValue(parseTree.coordinate);
        }

        if (v == "!") {
            if (!typeCalc.equalsTo(o.valueType, BASE_TYPES.boolean)) {
                api.logger.error(LOG_ERROR.mismatchingType(), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.Bool(parseTree.coordinate, false);
            }
            if (o.isMacro) {
                let vw: AST.ValueWrapper | undefined;
                if (o instanceof AST.ValueWrapper) {
                    if (o.codes.length > 0) {
                        vw = o;
                    }
                    o = <AST.Value>o.value;
                }
                if (o instanceof AST.MacroValCall) {
                    const val = o.val;
                    if (val.value) {
                        o = val.value;
                    } else {
                        api.logger.error(LOG_ERROR.useBeforeInit(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new AST.EmptyValue(parseTree.coordinate);
                    }
                }
                if (!typeCalc.equalsTo(o.valueType, BASE_TYPES.boolean)) {
                    const str = (<AST.MacroBase>o).toStr().value;
                    if (str == "1") {
                        o = new AST.Bool(o.coordinate, true);
                    } else if (str == "0") {
                        o = new AST.Bool(o.coordinate, false);
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        o = new AST.Bool(o.coordinate, true);
                    }
                }
                if (vw) {
                    vw.value = new AST.Bool(parseTree.coordinate, !(<AST.Bool>o).value);
                    return vw;
                } else {
                    return new AST.Bool(parseTree.coordinate, !(<AST.Bool>o).value);
                }
            } else {
                let vw: AST.ValueWrapper | undefined;
                const oType = o.valueType;

                if (o instanceof AST.ValueWrapper) {
                    if (o.codes.length > 0) {
                        vw = o;
                    }
                    o = <AST.Value>o.value;
                }
                if (typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
                const value = new AST.ExpressionVO(parseTree.coordinate, v, o, BASE_TYPES.boolean);
                if (vw) {
                    vw.value = value;
                    return vw;
                } else {
                    return value;
                }
            }
        }
        if (v == "++" || v == "--") {
            if (!typeCalc.equalsTo(o.valueType, BASE_TYPES.int)) {
                api.logger.error(LOG_ERROR.mismatchingType(), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new AST.EmptyValue(parseTree.coordinate);
            }
            if (o instanceof AST.MacroValCall) {
                const val = o.val;
                if (val.value) {
                    if (typeCalc.equalsTo(val.type, BASE_TYPES.int)) {
                        const ret = new AST.Int(parseTree.coordinate, (<AST.Int>val.value).value);
                        if (v == "++") {
                            val.value = new AST.Int(parseTree.coordinate, (<AST.Int>val.value).value + 1);
                            return ret;
                        }
                        if (v == "--") {
                            val.value = new AST.Int(parseTree.coordinate, (<AST.Int>val.value).value - 1);
                            return ret;
                        }
                    }
                    if (typeCalc.equalsTo(val.type, BASE_TYPES.string)) {
                        let num = Number((<AST.String>val.value).value);
                        if (isNaN(num)) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...o.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            num = 0;
                        }
                        if (v == "++") {
                            val.value = new AST.String(parseTree.coordinate, (num + 1).toString());
                            return val.value;
                        }
                        if (v == "--") {
                            val.value = new AST.String(parseTree.coordinate, (num - 1).toString());
                            return val.value;
                        }
                    }
                    api.logger.error(LOG_ERROR.invalidCharacterOrToken(v), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                } else {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            }
            if (o instanceof AST.ValCall) {
                if (o.val.prop.isConst) {
                    api.logger.error(LOG_ERROR.notAVar(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
                return new AST.ExpressionSV(parseTree.coordinate, o, parseTree.v, o.valueType);
            }
            if (o instanceof AST.GetProperty) {
                if (o.valObj && !o.valObj.prop.isConst) {
                    return new AST.ExpressionSV(parseTree.coordinate, o, parseTree.v, o.valueType);
                } else {
                    api.logger.error(LOG_ERROR.notAVar(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new AST.EmptyValue(parseTree.coordinate);
                }
            }
        }
    }
    api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), {
        ...parseTree.coordinate,
        chain: coordinateChain
    });
    return <AST.Value>{};
}