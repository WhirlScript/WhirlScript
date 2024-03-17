import { Segment } from "../../types/parser/segment";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";
import Pools from "../../util/parser/pools";
import { RSegment } from "../../types/parser/rSegment";
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
    segmentRaw: Segment.Value,
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
): RSegment.Value {
    const { api, pools, namespace } = context;
    let segment = segmentRaw;

    function reportError() {
        context.hasError.v = true;
    }

    if (segment instanceof Segment.Assertion) {
        const v = preprocessValue(segment.value, coordinateChain, requirement, context);
        if (v instanceof RSegment.EmptyValue) {
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }
        if (v instanceof RSegment.ValueWrapper) {
            v.valueType = typeCalc.getTypeWithName(segment.toType, context);
            return v;
        }
        return new RSegment.ValueWrapper(
            {
                ...segment.coordinate,
                chain: coordinateChain
            },
            typeCalc.getTypeWithName(segment.toType, context),
            [],
            {
                isMacro: v.isMacro,
                hasScope: false
            },
            v
        );
    }
    if (segment instanceof Segment.Int) {
        return new RSegment.Int(
            {
                ...segment.coordinate,
                chain: coordinateChain
            },
            segment.value
        );
    }
    if (segment instanceof Segment.Bool) {
        return new RSegment.Bool(
            {
                ...segment.coordinate,
                chain: coordinateChain
            },
            segment.value
        );
    }
    if (segment instanceof Segment.String) {
        return new RSegment.String(
            {
                ...segment.coordinate,
                chain: coordinateChain
            },
            segment.value
        );
    }
    if (segment instanceof Segment.TemplateString) {
        let values: RSegment.Value[] = [];
        for (const value of segment.values) {
            let r = preprocessValue(value, coordinateChain, requirement, context);
            if (r instanceof RSegment.EmptyValue) {
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
            if (r instanceof RSegment.MacroValCall) {
                if (!r.val.value) {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...r.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
                r = r.val.value;
            }
            if (r.valueType.type == "struct") {
                api.logger.error(LOG_ERROR.cannotStringify(), {
                    ...r.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
            if (values.length == 0) {
                if (r instanceof RSegment.Bool || r instanceof RSegment.Int) {
                    values.push(r.toStr());
                } else {
                    values.push(r);
                }
            } else {
                if (r.isMacro) {
                    if (values[values.length - 1] instanceof RSegment.String) {
                        const b = <RSegment.String>values.pop();
                        values.push(
                            new RSegment.String(
                                {
                                    ...b.coordinate,
                                    chain: coordinateChain
                                },
                                b.value + (<RSegment.MacroBase>r).toStr().value
                            )
                        );
                    } else {
                        values.push((<RSegment.MacroBase>r).toStr());
                    }
                } else {
                    values.push(r);
                }
            }
        }
        if (values.length == 1 && values[0] instanceof RSegment.String) {
            return values[0];
        } else {
            return new RSegment.TemplateString(
                {
                    ...segment.coordinate,
                    chain: coordinateChain
                },
                values
            );
        }
    }
    if (segment instanceof Segment.StructBlock) {
        const def: { [key: string]: Type } = {};
        const inside: { [key: string]: RSegment.Value } = {};
        for (const key in segment.inside) {
            inside[key] = preprocessValue(segment.inside[key], coordinateChain, requirement, context);
            if (inside[key] instanceof RSegment.EmptyValue) {
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
            if (inside[key] instanceof RSegment.MacroValCall) {
                const v = (<RSegment.MacroValCall>inside[key]).val.value;
                if (v) {
                    inside[key] = v;
                } else {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...inside[key].coordinate
                        , chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            }
            def[key] = inside[key].valueType;
        }
        const struct = new Struct("", def);
        return new RSegment.StructBlock(
            {
                ...segment.coordinate,
                chain: coordinateChain
            },
            inside,
            {
                type: "struct",
                struct
            }
        );
    }
    if (segment instanceof Segment.ValCall) {
        const symbol = context.pools.getSymbol(
            segment.valName,
            {
                ...segment.coordinate,
                chain: coordinateChain
            },
            { api, namespace }
        );
        if (symbol.type != "Val" && symbol.type != "MacroVal") {
            api.logger.error(LOG_ERROR.notAVal(symbol.name), {
                ...segment.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }
        if (symbol.type == "MacroVal") {
            const val = <MacroVal>symbol.value;
            if (val.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
            }
            if (!val.value) {
                api.logger.error(LOG_ERROR.useBeforeInit(), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
            return new RSegment.MacroValCall(segment.coordinate, val);
        }
        if (symbol.type == "Val") {
            const val = <Val>symbol.value;
            if (val.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
            }
            val.used = true;
            pools.pushRequirePool(val);
            if (!val.isInit) {
                api.logger.error(LOG_ERROR.useBeforeInit(), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
                reportError();
            }
            return new RSegment.ValCall(
                {
                    ...segment.coordinate,
                    chain: coordinateChain
                },
                val
            );
        }
    }
    if (segment instanceof Segment.FunctionCall) {
        const symbol = context.pools.getSymbol(
            segment.functionName,
            {
                ...segment.coordinate,
                chain: coordinateChain
            },
            { api, namespace }
        );
        if (symbol.type == "Function") {
            const func = <Func>symbol.value;
            if (func.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
            }
            func.used = true;
            pools.pushRequirePool(func);
            const args: RSegment.Value[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (segment.args[i]) {
                    const a = preprocessValue(segment.args[i], coordinateChain, requirement, context);
                    if (a instanceof RSegment.EmptyValue) {
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    if (func.args[i].isMacro && !a.isMacro) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    args.push(a);
                } else {
                    if (!func.args[i].defaultValue) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    args.push(<RSegment.Value>func.args[i].defaultValue);
                }
            }
            return new RSegment.FunctionCall(
                {
                    ...segment.coordinate,
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
                    ...segment.coordinate,
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
            const rStates: RSegment.SegmentInterface[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (segment.args[i]) {
                    let a = preprocessValue(segment.args[i], coordinateChain, requirement, context);
                    if (a instanceof RSegment.EmptyValue) {
                        reportError();
                        beforeReturn();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    if (a instanceof RSegment.MacroValCall) {
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
                            return new RSegment.EmptyValue(segment.coordinate);
                        }
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        beforeReturn();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    if (func.args[i].isMacro && !a.isMacro) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        beforeReturn();
                        return new RSegment.EmptyValue(segment.coordinate);
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
                            new RSegment.ExpressionSVO(
                                {
                                    ...segment.coordinate,
                                    chain: coordinateChain
                                },
                                new RSegment.ValCall(
                                    {
                                        ...segment.coordinate,
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
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        beforeReturn();
                        return new RSegment.EmptyValue(segment.coordinate);
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
                            new RSegment.ExpressionSVO(
                                {
                                    ...segment.coordinate,
                                    chain: coordinateChain
                                },
                                new RSegment.ValCall(
                                    {
                                        ...segment.coordinate,
                                        chain: coordinateChain
                                    },
                                    val
                                ),
                                "=",
                                <RSegment.Value>func.args[i].defaultValue,
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
            let macroReturnValue: RSegment.Value | undefined;
            for (const segInside of func.body.inside) {
                //TODO-implement: closure
                const s = preprocessSegment(
                    segInside,
                    [...coordinateChain, segment.coordinate],
                    requirement,
                    { ...context, pools: p }
                );
                if (!(s instanceof RSegment.Empty)) {
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
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    if (macroReturnValue instanceof RSegment.ValueWrapper) {
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
                        ...segment.coordinate,
                        chain: coordinateChain
                    }
                );
            }
            // TODO-optimise: if no body?
            return new RSegment.ValueWrapper(
                {
                    ...segment.coordinate,
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
                    ...segment.coordinate,
                    chain: coordinateChain
                });
            }
            const args: any[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (segment.args[i]) {
                    let a = preprocessValue(segment.args[i], coordinateChain, requirement, context);
                    if (a instanceof RSegment.EmptyValue) {
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    if (a instanceof RSegment.MacroValCall) {
                        const v = a.val.value;
                        if (v) {
                            a = v;
                        } else {
                            api.logger.error(LOG_ERROR.useBeforeInit(), {
                                ...a.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.EmptyValue(segment.coordinate);
                        }
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    if (!a.isMacro) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
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
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                } else {
                    if (!func.args[i].defaultValue) {
                        api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    args.push(
                        typeCalc.valueToObj(
                            <RSegment.Value>func.args[i].defaultValue,
                            {
                                ...(<RSegment.Value>func.args[i].defaultValue).coordinate,
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
                    ...segment.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
            return typeCalc.objToValue(
                o,
                {
                    ...segment.coordinate,
                    chain: coordinateChain
                },
                { api }
            );
        }
        api.logger.error(LOG_ERROR.notAFunction(symbol.name), {
            ...segment.coordinate,
            chain: coordinateChain
        });
        reportError();
        return new RSegment.EmptyValue(segment.coordinate);
    }
    if (segment instanceof Segment.Exec) {
        const a = preprocessValue(segment.command, coordinateChain, requirement, context);
        if (a instanceof RSegment.EmptyValue) {
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }
        if (!typeCalc.contains(a.valueType, BASE_TYPES.string)) {
            api.logger.error(LOG_ERROR.mismatchFunctionCall(), {
                ...segment.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }

        return new RSegment.FunctionCall(
            {
                ...segment.coordinate,
                chain: coordinateChain
            },
            BUILTIN_FLAG_FUNCTIONS["exec"],
            [a]
        );
    }
    if (segment instanceof Segment.ExpressionSVO) {
        let s = preprocessValue(segment.s, coordinateChain, requirement, context);
        if (s instanceof RSegment.EmptyValue) {
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }
        if (segment.v == ".") {
            if (!(segment.o instanceof Segment.ValCall)) {
                api.logger.error(LOG_ERROR.unresolvedReference(""), {
                    ...segment.o.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
            if (segment.o.valName.namespaces.length != 0) {
                api.logger.error(LOG_ERROR.unresolvedReference(""), {
                    ...segment.o.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
            const o = segment.o.valName.value;
            if (s.valueType.type == "base") {
                api.logger.error(LOG_ERROR.baseTypeProperty(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            } else {
                if (s.valueType.struct.def[o]) {
                    if (s instanceof RSegment.ValueWrapper) {
                        if (!s.value) {
                            api.logger.error(LOG_ERROR.unresolvedReference("null"), {
                                ...segment.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.EmptyValue(segment.coordinate);
                        }
                        if (s.isMacro) {
                            return new RSegment.ValueWrapper(
                                s.coordinate,
                                s.valueType,
                                s.codes,
                                {
                                    isMacro: s.isMacro,
                                    hasScope: s.hasScope
                                },
                                (<RSegment.StructBlock>s.value).inside[o]
                            );
                        } else {
                            return new RSegment.ValueWrapper(
                                s.coordinate,
                                s.valueType,
                                s.codes,
                                {
                                    isMacro: s.isMacro,
                                    hasScope: s.hasScope
                                },
                                new RSegment.GetProperty(
                                    s.coordinate,
                                    <RSegment.Value>s.value,
                                    o,
                                    s.valueType.struct.def[o]
                                )
                            );
                        }
                    }
                    let s1 = s;
                    if (s1 instanceof RSegment.MacroValCall) {
                        const v = s1.val.value;
                        if (v) {
                            s1 = v;
                        } else {
                            api.logger.error(LOG_ERROR.useBeforeInit(), {
                                ...s1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.EmptyValue(segment.coordinate);
                        }
                    }
                    if (s1 instanceof RSegment.StructBlock) {
                        if (s1.isMacro) {
                            return s1.inside[o];
                        } else {
                            return new RSegment.GetProperty(
                                segment.coordinate,
                                s1,
                                o,
                                (<TypeStruct>s1.valueType).struct.def[o]
                            );
                        }
                    }
                    if (s1 instanceof RSegment.ValCall) {
                        return new RSegment.GetProperty(
                            segment.coordinate,
                            s1,
                            o,
                            (<TypeStruct>s1.valueType).struct.def[o],
                            s1.val
                        );
                    }
                    if (s1 instanceof RSegment.GetProperty) {
                        return new RSegment.GetProperty(
                            segment.coordinate,
                            s1,
                            o,
                            (<TypeStruct>s1.valueType).struct.def[o],
                            s1.valObj
                        );
                    }
                    api.logger.error(LOG_ERROR.reallyWeird(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
                api.logger.error(LOG_ERROR.noProperty(o), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
        }
        let v = segment.v;

        let o: RSegment.Value;
        if (v == "+=") {
            v = "+";
            o = preprocessValue(
                new Segment.ExpressionSVO(segment.coordinate, segment.s, "+", segment.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "-=") {
            v = "-";
            o = preprocessValue(
                new Segment.ExpressionSVO(segment.coordinate, segment.s, "-", segment.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "*=") {
            v = "*";
            o = preprocessValue(
                new Segment.ExpressionSVO(segment.coordinate, segment.s, "*", segment.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "/=") {
            v = "/";
            o = preprocessValue(
                new Segment.ExpressionSVO(segment.coordinate, segment.s, "/", segment.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "%=") {
            v = "%";
            o = preprocessValue(
                new Segment.ExpressionSVO(segment.coordinate, segment.s, "%", segment.o),
                coordinateChain,
                requirement,
                context
            );
        } else {
            o = preprocessValue(segment.o, coordinateChain, requirement, context);
        }
        if (o instanceof RSegment.EmptyValue) {
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }

        if (typeCalc.equalsTo(s.valueType, BASE_TYPES.void) ||
            typeCalc.equalsTo(o.valueType, BASE_TYPES.void)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...segment.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }
        if (v == "=") {
            if (s instanceof RSegment.ValCall) {
                if (s.val.prop.isConst) {
                    api.logger.error(LOG_ERROR.notAVar(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
                if (typeCalc.contains(o.valueType, s.valueType)) {
                    s.val.isInit = true;
                    return new RSegment.ExpressionSVO(segment.coordinate, s, segment.v, o, s.valueType);
                } else {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            } else if (s instanceof RSegment.GetProperty) {
                if (s.valObj) {
                    if (typeCalc.contains(o.valueType, s.valueType)) {
                        return new RSegment.ExpressionSVO(segment.coordinate, s, segment.v, o, s.valueType);
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                } else {
                    api.logger.error(LOG_ERROR.notAVar(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            } else if (s instanceof RSegment.MacroValCall) {
                const val = s.val;
                if (!o.isMacro) {
                    api.logger.error(LOG_ERROR.notMacro(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
                if (!typeCalc.contains(o.valueType, s.valueType)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
                let o1 = o;
                let type = o1.valueType;
                if (o1 instanceof RSegment.ValueWrapper) {
                    if (o1.codes) {
                        const vw = o1;
                        if (!vw.value) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...o1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.EmptyValue(segment.coordinate);
                        }
                        if (!typeCalc.contains(type, val.type)) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...o1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.EmptyValue(segment.coordinate);
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
                            return new RSegment.EmptyValue(segment.coordinate);
                        }
                        o1 = o1.value;
                    }
                }
                if (o1 instanceof RSegment.MacroValCall) {
                    if (o1.val.value) {
                        o1 = o1.val.value;
                    } else {
                        api.logger.error(LOG_ERROR.useBeforeInit(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
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
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            } else {
                api.logger.error(LOG_ERROR.notAVar(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
        }
        if (s.valueType.type == "struct" || o.valueType.type == "struct") {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...segment.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }
        if (s.isMacro && o.isMacro) {
            const codes: RSegment.ValueWrapper[] = [];
            const sType = s.valueType;
            const oType = o.valueType;

            const wrap = (value: RSegment.Value): RSegment.Value => {
                if (codes.length == 0) {
                    return value;
                }
                if (codes.length == 1) {
                    codes[0].value = value;
                    codes[0].valueType = value.valueType;
                    return codes[0];
                }
                return new RSegment.ValueWrapper(
                    segment.coordinate,
                    value.valueType,
                    codes,
                    {
                        isMacro: true,
                        hasScope: false
                    },
                    value
                );
            };

            if (s instanceof RSegment.ValueWrapper) {
                if (s.codes.length > 0) {
                    codes.push(<RSegment.ValueWrapper>s);
                }
                s = <RSegment.Value>s.value;
            }
            if (o instanceof RSegment.ValueWrapper) {
                if (o.codes.length > 0) {
                    codes.push(<RSegment.ValueWrapper>o);
                }
                o = <RSegment.Value>o.value;
            }
            if (s instanceof RSegment.MacroValCall) {
                const val = s.val;
                if (val.value) {
                    s = val.value;
                } else {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            }
            if (o instanceof RSegment.MacroValCall) {
                const val = o.val;
                if (val.value) {
                    o = val.value;
                } else {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            }
            if (!typeCalc.equalsTo(sType, s.valueType)) {
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean)) {
                    const str = (<RSegment.MacroBase>s).toStr().value;
                    if (str == "1") {
                        s = new RSegment.Bool(s.coordinate, true);
                    } else if (str == "0") {
                        s = new RSegment.Bool(s.coordinate, false);
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...s.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        s = new RSegment.Bool(s.coordinate, true);
                    }
                }
                if (typeCalc.equalsTo(sType, BASE_TYPES.int)) {
                    const num = Number((<RSegment.MacroBase>s).toStr().value);
                    if (isNaN(num)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...s.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    s = new RSegment.Int(s.coordinate, num);
                }
            }
            if (!typeCalc.equalsTo(oType, o.valueType)) {
                if (typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                    const str = (<RSegment.MacroBase>o).toStr().value;
                    if (str == "1") {
                        o = new RSegment.Bool(o.coordinate, true);
                    } else if (str == "0") {
                        o = new RSegment.Bool(o.coordinate, false);
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        o = new RSegment.Bool(o.coordinate, true);
                    }
                }
                if (typeCalc.equalsTo(oType, BASE_TYPES.int)) {
                    const num = Number((<RSegment.MacroBase>o).toStr().value);
                    if (isNaN(num)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                    o = new RSegment.Int(o.coordinate, num);
                }
            }
            if (v == "+") {
                if (typeCalc.equalsTo(sType, BASE_TYPES.string) ||
                    typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    return wrap(new RSegment.String(segment.coordinate,
                        (<RSegment.MacroBase>s).toStr().value + (<RSegment.MacroBase>o).toStr().value));
                }
            } else if (v == "==" || v == "!=") {
                if (!(sType.type == "base") || !(oType.type == "base")) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
                if (v == "==") {
                    return wrap(new RSegment.Bool(segment.coordinate, (<RSegment.MacroBase>s).value == (<RSegment.MacroBase>o).value));
                } else {
                    return wrap(new RSegment.Bool(segment.coordinate, (<RSegment.MacroBase>s).value != (<RSegment.MacroBase>o).value));
                }
            } else {
                if (typeCalc.equalsTo(sType, BASE_TYPES.string) ||
                    typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            }
            if (["+", "-", "*", "/", "%", ">>", "<<"].indexOf(v) >= 0) {
                let l: number;
                let r: number;
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean)) {
                    l = (<RSegment.Bool>s).value ? 1 : 0;
                } else {
                    l = (<RSegment.Int>s).value;
                }
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean)) {
                    r = (<RSegment.Bool>s).value ? 1 : 0;
                } else {
                    r = (<RSegment.Int>s).value;
                }
                return wrap(new RSegment.Int(segment.coordinate, eval(`${l}${v}${r}`)));
            }
            if (["<", ">", ">=", "<=", "==", "!="].indexOf(v) >= 0) {
                return wrap(new RSegment.Bool(segment.coordinate,
                    eval(`${(<RSegment.MacroBase>s).toStr().value}${v}${(<RSegment.MacroBase>o).toStr().value}`)));
            }
            if (v == "&&" || v == "||") {
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean) && typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                    if (v == "&&") {
                        return wrap(new RSegment.Bool(segment.coordinate, (<RSegment.Bool>s).value && (<RSegment.Bool>o).value));
                    } else {
                        return wrap(new RSegment.Bool(segment.coordinate, (<RSegment.Bool>s).value || (<RSegment.Bool>o).value));
                    }
                }
                api.logger.error(LOG_ERROR.mismatchingType(), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
        } else {
            const codes: RSegment.ValueWrapper[] = [];
            const sType = s.valueType;
            const oType = o.valueType;

            if (s instanceof RSegment.ValueWrapper) {
                if (s.codes.length > 0) {
                    codes.push(s);
                }
                s = <RSegment.Value>s.value;
            }
            if (o instanceof RSegment.ValueWrapper) {
                if (o.codes.length > 0) {
                    codes.push(o);
                }
                o = <RSegment.Value>o.value;
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
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                } else if (["-", "*", "/", "%", ">>", "<<"].indexOf(v) >= 0) {
                    type = BASE_TYPES.int;
                } else if (["<", ">", ">=", "<="].indexOf(v) >= 0) {
                    type = BASE_TYPES.boolean;
                } else if (v == "&&" || v == "||") {
                    if (typeCalc.equalsTo(sType, BASE_TYPES.boolean) && typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                        type = BASE_TYPES.boolean;
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                } else {
                    api.logger.error(LOG_ERROR.invalidCharacterOrToken(v), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            }
            const value = new RSegment.ExpressionSVO(segment.coordinate, s, v, o, type);

            if (codes.length == 0) {
                return value;
            }
            if (codes.length == 1) {
                codes[0].value = value;
                codes[0].valueType = value.valueType;
                return codes[0];
            }
            return new RSegment.ValueWrapper(
                segment.coordinate,
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

    if (segment instanceof Segment.ExpressionSV) {
        let s = preprocessValue(segment.s, coordinateChain, requirement, context);
        if (s instanceof RSegment.EmptyValue) {
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }
        let v = segment.v;

        if (!typeCalc.equalsTo(s.valueType, BASE_TYPES.int)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...segment.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }

        if (s instanceof RSegment.MacroValCall) {
            const val = s.val;
            if (val.value) {
                if (typeCalc.equalsTo(val.type, BASE_TYPES.int)) {
                    const ret = new RSegment.Int(segment.coordinate, (<RSegment.Int>val.value).value);
                    if (v == "++") {
                        val.value = new RSegment.Int(segment.coordinate, (<RSegment.Int>val.value).value + 1);
                        return ret;
                    }
                    if (v == "--") {
                        val.value = new RSegment.Int(segment.coordinate, (<RSegment.Int>val.value).value - 1);
                        return ret;
                    }
                }
                if (typeCalc.equalsTo(val.type, BASE_TYPES.string)) {
                    let num = Number((<RSegment.String>val.value).value);
                    if (isNaN(num)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...s.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        num = 0;
                    }
                    const ret = new RSegment.Int(segment.coordinate, num);
                    if (v == "++") {
                        val.value = new RSegment.String(segment.coordinate, (num + 1).toString());
                        return ret;
                    }
                    if (v == "--") {
                        val.value = new RSegment.String(segment.coordinate, (num - 1).toString());
                        return ret;
                    }
                }
                api.logger.error(LOG_ERROR.invalidCharacterOrToken(v), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            } else {
                api.logger.error(LOG_ERROR.useBeforeInit(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
        }
        if (s instanceof RSegment.ValCall) {
            if (s.val.prop.isConst) {
                api.logger.error(LOG_ERROR.assignToConst(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
            }
            return new RSegment.ExpressionSV(segment.coordinate, s, segment.v, s.valueType);
        }
        if (s instanceof RSegment.GetProperty) {
            if (s.valObj && !s.valObj.prop.isConst) {
                return new RSegment.ExpressionSV(segment.coordinate, s, segment.v, s.valueType);
            } else {
                api.logger.error(LOG_ERROR.notAVar(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
        }
    }

    if (segment instanceof Segment.ExpressionVO) {
        let v = segment.v;
        let o = preprocessValue(segment.o, coordinateChain, requirement, context);
        if (o instanceof RSegment.EmptyValue) {
            reportError();
            return new RSegment.EmptyValue(segment.coordinate);
        }

        if (v == "!") {
            if (!typeCalc.equalsTo(o.valueType, BASE_TYPES.boolean)) {
                api.logger.error(LOG_ERROR.mismatchingType(), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.Bool(segment.coordinate, false);
            }
            if (o.isMacro) {
                let vw: RSegment.ValueWrapper | undefined;
                if (o instanceof RSegment.ValueWrapper) {
                    if (o.codes.length > 0) {
                        vw = o;
                    }
                    o = <RSegment.Value>o.value;
                }
                if (o instanceof RSegment.MacroValCall) {
                    const val = o.val;
                    if (val.value) {
                        o = val.value;
                    } else {
                        api.logger.error(LOG_ERROR.useBeforeInit(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.EmptyValue(segment.coordinate);
                    }
                }
                if (!typeCalc.equalsTo(o.valueType, BASE_TYPES.boolean)) {
                    const str = (<RSegment.MacroBase>o).toStr().value;
                    if (str == "1") {
                        o = new RSegment.Bool(o.coordinate, true);
                    } else if (str == "0") {
                        o = new RSegment.Bool(o.coordinate, false);
                    } else {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        o = new RSegment.Bool(o.coordinate, true);
                    }
                }
                if (vw) {
                    vw.value = new RSegment.Bool(segment.coordinate, !(<RSegment.Bool>o).value);
                    return vw;
                } else {
                    return new RSegment.Bool(segment.coordinate, !(<RSegment.Bool>o).value);
                }
            } else {
                let vw: RSegment.ValueWrapper | undefined;
                const oType = o.valueType;

                if (o instanceof RSegment.ValueWrapper) {
                    if (o.codes.length > 0) {
                        vw = o;
                    }
                    o = <RSegment.Value>o.value;
                }
                if (typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
                const value = new RSegment.ExpressionVO(segment.coordinate, v, o, BASE_TYPES.boolean);
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
                    ...segment.coordinate,
                    chain: coordinateChain
                });
                reportError();
                return new RSegment.EmptyValue(segment.coordinate);
            }
            if (o instanceof RSegment.MacroValCall) {
                const val = o.val;
                if (val.value) {
                    if (typeCalc.equalsTo(val.type, BASE_TYPES.int)) {
                        const ret = new RSegment.Int(segment.coordinate, (<RSegment.Int>val.value).value);
                        if (v == "++") {
                            val.value = new RSegment.Int(segment.coordinate, (<RSegment.Int>val.value).value + 1);
                            return ret;
                        }
                        if (v == "--") {
                            val.value = new RSegment.Int(segment.coordinate, (<RSegment.Int>val.value).value - 1);
                            return ret;
                        }
                    }
                    if (typeCalc.equalsTo(val.type, BASE_TYPES.string)) {
                        let num = Number((<RSegment.String>val.value).value);
                        if (isNaN(num)) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...o.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            num = 0;
                        }
                        if (v == "++") {
                            val.value = new RSegment.String(segment.coordinate, (num + 1).toString());
                            return val.value;
                        }
                        if (v == "--") {
                            val.value = new RSegment.String(segment.coordinate, (num - 1).toString());
                            return val.value;
                        }
                    }
                    api.logger.error(LOG_ERROR.invalidCharacterOrToken(v), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                } else {
                    api.logger.error(LOG_ERROR.useBeforeInit(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            }
            if (o instanceof RSegment.ValCall) {
                if (o.val.prop.isConst) {
                    api.logger.error(LOG_ERROR.notAVar(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
                return new RSegment.ExpressionSV(segment.coordinate, o, segment.v, o.valueType);
            }
            if (o instanceof RSegment.GetProperty) {
                if (o.valObj && !o.valObj.prop.isConst) {
                    return new RSegment.ExpressionSV(segment.coordinate, o, segment.v, o.valueType);
                } else {
                    api.logger.error(LOG_ERROR.notAVar(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.EmptyValue(segment.coordinate);
                }
            }
        }
    }
    api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), {
        ...segment.coordinate,
        chain: coordinateChain
    });
    return <RSegment.Value>{};
}