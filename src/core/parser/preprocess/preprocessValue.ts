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

    function reportError() {
        context.hasError.v = true;
    }

    if (segmentRaw.type == "Assertion") {
        const seg = <Segment.Assertion>segmentRaw;
        const v = preprocessValue(seg.value, coordinateChain, requirement, context);
        if (v.type == "EmptyValue") {
            reportError();
            return new RSegment.EmptyValue(seg.coordinate);
        }
        if (v.type == "ValueWrapper") {
            v.valueType = typeCalc.getTypeWithName(seg.toType, context);
            return v;
        }
        return new RSegment.ValueWrapper(
            {
                ...seg.coordinate,
                chain: coordinateChain
            },
            typeCalc.getTypeWithName(seg.toType, context),
            [],
            {
                isMacro: v.isMacro,
                hasScope: false
            },
            v
        );
    }
    if (segmentRaw.type == "Int") {
        const seg = <Segment.Int>segmentRaw;
        return new RSegment.Int(
            {
                ...seg.coordinate,
                chain: coordinateChain
            },
            seg.value
        );
    }
    if (segmentRaw.type == "Bool") {
        const seg = <Segment.Bool>segmentRaw;
        return new RSegment.Bool(
            {
                ...seg.coordinate,
                chain: coordinateChain
            },
            seg.value
        );
    }
    if (segmentRaw.type == "String") {
        const seg = <Segment.String>segmentRaw;
        return new RSegment.String(
            {
                ...seg.coordinate,
                chain: coordinateChain
            },
            seg.value
        );
    }
    if (segmentRaw.type == "TemplateString") {
        const seg = <Segment.TemplateString>segmentRaw;
        let values: RSegment.Value[] = [];
        for (const value of seg.values) {
            let r = preprocessValue(value, coordinateChain, requirement, context);
            if (r.type == "EmptyValue") {
                reportError();
                return new RSegment.EmptyValue(seg.coordinate);
            }
            if (r.type == "MacroValCall") {
                if (!(<RSegment.MacroValCall>r).val.value) {
                    api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), r.coordinate);
                }
                r = <RSegment.Value>(<RSegment.MacroValCall>r).val.value;
            }
            if (r.valueType.type == "struct") {
                api.logger.errorInterrupt(LOG_ERROR.cannotStringify(), r.coordinate);
            }
            if (values.length == 0) {
                if (r.type == "Bool" || r.type == "Int") {
                    values.push((<RSegment.MacroBase>r).toStr());
                } else {
                    values.push(r);
                }
            } else {
                if (r.isMacro) {
                    if (values[values.length - 1].type == "String") {
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
        if (values.length == 1 && values[0].type == "String") {
            return values[0];
        } else {
            return new RSegment.TemplateString(
                {
                    ...seg.coordinate,
                    chain: coordinateChain
                },
                values
            );
        }
    }
    if (segmentRaw.type == "StructBlock") {
        const seg = <Segment.StructBlock>segmentRaw;
        const def: { [key: string]: Type } = {};
        const inside: { [key: string]: RSegment.Value } = {};
        for (const key in seg.inside) {
            inside[key] = preprocessValue(seg.inside[key], coordinateChain, requirement, context);
            if (inside[key].type == "EmptyValue") {
                reportError();
                return new RSegment.EmptyValue(seg.coordinate);
            }
            if (inside[key].type == "MacroValCall") {
                const v = (<RSegment.MacroValCall>inside[key]).val.value;
                if (v) {
                    inside[key] = v;
                } else {
                    api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), inside[key].coordinate);
                }
            }
            def[key] = inside[key].valueType;
        }
        const struct = new Struct("", def);
        return new RSegment.StructBlock(
            {
                ...seg.coordinate,
                chain: coordinateChain
            },
            inside,
            {
                type: "struct",
                struct
            }
        );
    }
    if (segmentRaw.type == "ValCall") {
        const seg = <Segment.ValCall>segmentRaw;
        const symbol = context.pools.getSymbol(
            seg.valName,
            {
                ...seg.coordinate,
                chain: coordinateChain
            },
            { api, namespace }
        );
        if (symbol.type != "Val" && symbol.type != "MacroVal") {
            api.logger.errorInterrupt(LOG_ERROR.notAVal(symbol.name), {
                ...seg.coordinate,
                chain: coordinateChain
            });
        }
        if (symbol.type == "MacroVal") {
            const val = <MacroVal>symbol.value;
            if (val.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            if (!val.value) {
                api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            return new RSegment.MacroValCall(seg.coordinate, val);
        }
        if (symbol.type == "Val") {
            const val = <Val>symbol.value;
            if (val.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            if (!val.isInit) {
                api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            return new RSegment.ValCall(
                {
                    ...seg.coordinate,
                    chain: coordinateChain
                },
                val
            );
        }
    }
    if (segmentRaw.type == "FunctionCall") {
        const seg = <Segment.FunctionCall>segmentRaw;
        const symbol = context.pools.getSymbol(
            seg.functionName,
            {
                ...seg.coordinate,
                chain: coordinateChain
            },
            { api, namespace }
        );
        if (symbol.type == "Function") {
            const func = <Func>symbol.value;
            if (func.prop.deprecated) {
                api.logger.warning(LOG_WARNING.deprecated(symbol.name), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            const args: RSegment.Value[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (seg.args[i]) {
                    const a = preprocessValue(seg.args[i], coordinateChain, requirement, context);
                    if (a.type == "EmptyValue") {
                        reportError();
                        return new RSegment.EmptyValue(seg.coordinate);
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                    }
                    if (func.args[i].isMacro && !a.isMacro) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                    }
                    args.push(a);
                } else {
                    if (!func.args[i].defaultValue) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                    }
                    args.push(<RSegment.Value>func.args[i].defaultValue);
                }
            }
            return new RSegment.FunctionCall(
                {
                    ...seg.coordinate,
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
                    ...seg.coordinate,
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
            const rStates: RSegment.SegmentInterface[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (seg.args[i]) {
                    let a = preprocessValue(seg.args[i], coordinateChain, requirement, context);
                    if (a.type == "EmptyValue") {
                        reportError();
                        return new RSegment.EmptyValue(seg.coordinate);
                    }
                    if (a.type == "MacroValCall") {
                        const v = (<RSegment.MacroValCall>a).val.value;
                        if (v) {
                            a = v;
                        } else {
                            api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), a.coordinate);
                        }
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                    }
                    if (func.args[i].isMacro && !a.isMacro) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                    }
                    if (func.args[i].isMacro) {
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
                        const val = new Val(func.args[i].name, func.args[i].type, {
                            deprecated: false,
                            isConst: false,
                            optional: false
                        });
                        val.isInit = true;
                        rStates.push(
                            new RSegment.ExpressionSVO(
                                {
                                    ...seg.coordinate,
                                    chain: coordinateChain
                                },
                                new RSegment.ValCall(
                                    {
                                        ...seg.coordinate,
                                        chain: coordinateChain
                                    },
                                    val
                                ),
                                "=",
                                a,
                                val.type
                            )
                        );
                        p.renamePool.push(val);
                        p.symbolTable.push({
                            name: func.args[i].name,
                            type: "Val",
                            value: val
                        });
                    }
                } else {
                    if (!func.args[i].defaultValue) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
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
                        const val = new Val(func.args[i].name, func.args[i].type, {
                            deprecated: false,
                            isConst: false,
                            optional: false
                        });
                        rStates.push(
                            new RSegment.ExpressionSVO(
                                {
                                    ...seg.coordinate,
                                    chain: coordinateChain
                                },
                                new RSegment.ValCall(
                                    {
                                        ...seg.coordinate,
                                        chain: coordinateChain
                                    },
                                    val
                                ),
                                "=",
                                <RSegment.Value>func.args[i].defaultValue,
                                val.type
                            )
                        );
                        p.renamePool.push(val);
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
                    [...coordinateChain, seg.coordinate],
                    requirement,
                    { ...context, pools: p }
                );
                if (s.type != "Empty") {
                    rStates.push(s);
                }
                if (s.macroReturnValue) {
                    macroReturnValue = s.macroReturnValue;
                    if (!typeCalc.contains(macroReturnValue.valueType, func.type)) {
                        api.logger.errorInterrupt(
                            LOG_ERROR.mismatchingType(),
                            macroReturnValue.coordinate
                        );
                    }
                    if (macroReturnValue.type == "ValueWrapper") {
                        const vw = <RSegment.ValueWrapper>macroReturnValue;
                        if (vw.codes.length > 0) {
                            rStates.push(vw);
                        }
                        macroReturnValue = vw.value;
                    }
                    break;
                }
            }
            if (func.prop.hasScope) {
                p.popScope();
            }
            if (func.prop.isConstexpr && (!macroReturnValue || !macroReturnValue.isMacro)) {
                api.logger.error(
                    LOG_ERROR.notMacro(),
                    macroReturnValue?.coordinate ?? {
                        ...seg.coordinate,
                        chain: coordinateChain
                    }
                );
            }
            // TODO-optimise: if no body?
            return new RSegment.ValueWrapper(
                {
                    ...seg.coordinate,
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
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            const args: any[] = [];
            for (let i = 0; i < func.args.length; i++) {
                if (seg.args[i]) {
                    let a = preprocessValue(seg.args[i], coordinateChain, requirement, context);
                    if (a.type == "EmptyValue") {
                        reportError();
                        return new RSegment.EmptyValue(seg.coordinate);
                    }
                    if (a.type == "MacroValCall") {
                        const v = (<RSegment.MacroValCall>a).val.value;
                        if (v) {
                            a = v;
                        } else {
                            api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                                ...a.coordinate,
                                chain: coordinateChain
                            });
                        }
                    }
                    if (!typeCalc.contains(a.valueType, func.args[i].type)) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                    }
                    if (!a.isMacro) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
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
                        api.logger.errorInterrupt(LOG_ERROR.nativeError(e), {
                            ...a.coordinate,
                            chain: coordinateChain
                        });
                    }
                } else {
                    if (!func.args[i].defaultValue) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
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
                api.logger.errorInterrupt(LOG_ERROR.nativeError(e), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            return typeCalc.objToValue(
                o,
                {
                    ...seg.coordinate,
                    chain: coordinateChain
                },
                { api }
            );
        }
        api.logger.errorInterrupt(LOG_ERROR.notAFunction(symbol.name), {
            ...seg.coordinate,
            chain: coordinateChain
        });
    }
    if (segmentRaw.type == "ExpressionSVO") {
        const seg = <Segment.ExpressionSVO>segmentRaw;
        let s = preprocessValue(seg.s, coordinateChain, requirement, context);
        if (s.type == "EmptyValue") {
            reportError();
            return new RSegment.EmptyValue(seg.coordinate);
        }
        if (seg.v == ".") {
            if (seg.o.type != "ValCall") {
                api.logger.errorInterrupt(LOG_ERROR.unresolvedReference(""), {
                    ...seg.o.coordinate,
                    chain: coordinateChain
                });
            }
            if ((<Segment.ValCall>seg.o).valName.namespaces.length != 0) {
                api.logger.errorInterrupt(LOG_ERROR.unresolvedReference(""), {
                    ...seg.o.coordinate,
                    chain: coordinateChain
                });
            }
            const o = (<Segment.ValCall>seg.o).valName.value;
            if (s.valueType.type == "base") {
                api.logger.errorInterrupt(LOG_ERROR.baseTypeProperty(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
            } else {
                if (s.valueType.struct.def[o]) {
                    if (s.type == "ValueWrapper") {
                        const vw = <RSegment.ValueWrapper>s;
                        if (!vw.value) {
                            api.logger.errorInterrupt(LOG_ERROR.unresolvedReference("null"), {
                                ...seg.coordinate,
                                chain: coordinateChain
                            });
                        }
                        if (vw.isMacro) {
                            return new RSegment.ValueWrapper(
                                vw.coordinate,
                                vw.valueType,
                                vw.codes,
                                {
                                    isMacro: vw.isMacro,
                                    hasScope: vw.hasScope
                                },
                                (<RSegment.StructBlock>vw.value).inside[o]
                            );
                        } else {
                            return new RSegment.ValueWrapper(
                                vw.coordinate,
                                vw.valueType,
                                vw.codes,
                                {
                                    isMacro: vw.isMacro,
                                    hasScope: vw.hasScope
                                },
                                new RSegment.GetProperty(
                                    vw.coordinate,
                                    <RSegment.Value>vw.value,
                                    o,
                                    s.valueType.struct.def[o]
                                )
                            );
                        }
                    }
                    let s1 = s;
                    if (s1.type == "MacroValCall") {
                        const v = (<RSegment.MacroValCall>s1).val.value;
                        if (v) {
                            s1 = v;
                        } else {
                            api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                                ...s1.coordinate,
                                chain: coordinateChain
                            });
                        }
                    }
                    if (s1.type == "StructBlock") {
                        const structBlock = <RSegment.StructBlock>s1;
                        if (s1.isMacro) {
                            return structBlock.inside[o];
                        } else {
                            return new RSegment.GetProperty(
                                seg.coordinate,
                                structBlock,
                                o,
                                (<TypeStruct>s1.valueType).struct.def[o]
                            );
                        }
                    }
                    if (s1.type == "ValCall") {
                        return new RSegment.GetProperty(
                            seg.coordinate,
                            s1,
                            o,
                            (<TypeStruct>s1.valueType).struct.def[o],
                            (<RSegment.ValCall>s1).val
                        );
                    }
                    if (s1.type == "GetProperty") {
                        return new RSegment.GetProperty(
                            seg.coordinate,
                            s1,
                            o,
                            (<TypeStruct>s1.valueType).struct.def[o],
                            (<RSegment.GetProperty>s1).valObj
                        );
                    }
                    api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                }
                api.logger.errorInterrupt(LOG_ERROR.noProperty(o), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
        }
        let v = seg.v;

        let o: RSegment.Value;
        if (v == "+=") {
            v = "+";
            o = preprocessValue(
                new Segment.ExpressionSVO(seg.coordinate, seg.s, "+", seg.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "-=") {
            v = "-";
            o = preprocessValue(
                new Segment.ExpressionSVO(seg.coordinate, seg.s, "-", seg.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "*=") {
            v = "*";
            o = preprocessValue(
                new Segment.ExpressionSVO(seg.coordinate, seg.s, "*", seg.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "/=") {
            v = "/";
            o = preprocessValue(
                new Segment.ExpressionSVO(seg.coordinate, seg.s, "/", seg.o),
                coordinateChain,
                requirement,
                context
            );
        } else if (v == "%=") {
            v = "%";
            o = preprocessValue(
                new Segment.ExpressionSVO(seg.coordinate, seg.s, "%", seg.o),
                coordinateChain,
                requirement,
                context
            );
        } else {
            o = preprocessValue(seg.o, coordinateChain, requirement, context);
        }
        if (o.type == "EmptyValue") {
            reportError();
            return new RSegment.EmptyValue(seg.coordinate);
        }

        if (typeCalc.equalsTo(s.valueType, BASE_TYPES.void) ||
            typeCalc.equalsTo(o.valueType, BASE_TYPES.void)) {
            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                ...seg.coordinate,
                chain: coordinateChain
            });
        }
        if (v == "=") {
            if (s.type == "ValCall") {
                if ((<RSegment.ValCall>s).val.prop.isConst) {
                    api.logger.errorInterrupt(LOG_ERROR.notAVar(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                }
                if (typeCalc.contains(o.valueType, s.valueType)) {
                    (<RSegment.ValCall>s).val.isInit = true;
                    return new RSegment.ExpressionSVO(seg.coordinate, s, seg.v, o, s.valueType);
                } else {
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                }
            } else if (s.type == "GetProperty") {
                if ((<RSegment.GetProperty>s).valObj) {
                    if (typeCalc.contains(o.valueType, s.valueType)) {
                        return new RSegment.ExpressionSVO(seg.coordinate, s, seg.v, o, s.valueType);
                    } else {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                    }
                } else {
                    api.logger.errorInterrupt(LOG_ERROR.notAVar(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                }
            } else if (s.type == "MacroValCall") {
                const val = (<RSegment.MacroValCall>s).val;
                if (!o.isMacro) {
                    api.logger.errorInterrupt(LOG_ERROR.notMacro(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                }
                if (!typeCalc.contains(o.valueType, s.valueType)) {
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                }
                let o1 = o;
                let type = o1.valueType;
                if (o1.type == "ValueWrapper") {
                    if ((<RSegment.ValueWrapper>o1).codes) {
                        const vw = <RSegment.ValueWrapper>o1;
                        if (!vw.value) {
                            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                ...o1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        if (!typeCalc.contains(type, val.type)) {
                            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                ...o1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        val.value = vw.value;
                        return o1;
                    } else {
                        if (!(<RSegment.ValueWrapper>o1).value) {
                            api.logger.errorInterrupt(LOG_ERROR.missingType(), {
                                ...o1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        o1 = <RSegment.Value>(<RSegment.ValueWrapper>o1).value;
                    }
                }
                if (o1.type == "MacroValCall") {
                    if ((<RSegment.MacroValCall>o).val.value) {
                        o1 = <RSegment.Value>(<RSegment.MacroValCall>o).val.value;
                    } else {
                        api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
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
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                }
            } else {
                api.logger.errorInterrupt(LOG_ERROR.notAVar(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
            }
        }
        if (s.valueType.type == "struct" || o.valueType.type == "struct") {
            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                ...seg.coordinate,
                chain: coordinateChain
            });
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
                    seg.coordinate,
                    value.valueType,
                    codes,
                    {
                        isMacro: true,
                        hasScope: false
                    },
                    value
                );
            };

            if (s.type == "ValueWrapper") {
                const vw = <RSegment.ValueWrapper>s;
                if (vw.codes.length > 0) {
                    codes.push(<RSegment.ValueWrapper>s);
                }
                s = <RSegment.Value>vw.value;
            }
            if (o.type == "ValueWrapper") {
                const vw = <RSegment.ValueWrapper>o;
                if (vw.codes.length > 0) {
                    codes.push(<RSegment.ValueWrapper>o);
                }
                o = <RSegment.Value>vw.value;
            }
            if (s.type == "MacroValCall") {
                const val = (<RSegment.MacroValCall>s).val;
                if (val.value) {
                    s = val.value;
                } else {
                    api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                }
            }
            if (o.type == "MacroValCall") {
                const val = (<RSegment.MacroValCall>o).val;
                if (val.value) {
                    o = val.value;
                } else {
                    api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                }
            }
            if (!typeCalc.equalsTo(sType, s.valueType)) {
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean)) {
                    const str = (<RSegment.MacroBase>s).toStr().value;
                    if (str == "1") {
                        s = new RSegment.Bool(s.coordinate, true);
                    }
                    if (str == "0") {
                        s = new RSegment.Bool(s.coordinate, false);
                    }
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...s.coordinate,
                        chain: coordinateChain
                    });
                }
                if (typeCalc.equalsTo(sType, BASE_TYPES.int)) {
                    const num = Number((<RSegment.MacroBase>s).toStr().value);
                    if (isNaN(num)) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                            ...s.coordinate,
                            chain: coordinateChain
                        });
                    }
                    s = new RSegment.Int(s.coordinate, num);
                }
            }
            if (!typeCalc.equalsTo(oType, o.valueType)) {
                if (typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                    const str = (<RSegment.MacroBase>o).toStr().value;
                    if (str == "1") {
                        o = new RSegment.Bool(o.coordinate, true);
                    }
                    if (str == "0") {
                        o = new RSegment.Bool(o.coordinate, false);
                    }
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                }
                if (typeCalc.equalsTo(oType, BASE_TYPES.int)) {
                    const num = Number((<RSegment.MacroBase>o).toStr().value);
                    if (isNaN(num)) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                    }
                    o = new RSegment.Int(o.coordinate, num);
                }
            }
            if (v == "+") {
                if (typeCalc.equalsTo(sType, BASE_TYPES.string) ||
                    typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    return wrap(new RSegment.String(seg.coordinate,
                        (<RSegment.MacroBase>s).toStr().value + (<RSegment.MacroBase>o).toStr().value));
                }
            } else {
                if (typeCalc.equalsTo(sType, BASE_TYPES.string) ||
                    typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
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
                return wrap(new RSegment.Int(seg.coordinate, eval(`${l}${v}${r}`)));
            }
            if (["<", ">", ">=", "<=", "==", "!="].indexOf(v) >= 0) {
                return wrap(new RSegment.Bool(seg.coordinate,
                    eval(`${(<RSegment.MacroBase>s).toStr().value}${v}${(<RSegment.MacroBase>o).toStr().value}`)));
            }
            if (v == "&&" || v == "||") {
                if (typeCalc.equalsTo(sType, BASE_TYPES.boolean) && typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                    if (v == "&&") {
                        return wrap(new RSegment.Bool(seg.coordinate, (<RSegment.Bool>s).value && (<RSegment.Bool>o).value));
                    } else {
                        return wrap(new RSegment.Bool(seg.coordinate, (<RSegment.Bool>s).value || (<RSegment.Bool>o).value));
                    }
                }
                api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
        } else {
            const codes: RSegment.ValueWrapper[] = [];
            const sType = s.valueType;
            const oType = o.valueType;

            if (s.type == "ValueWrapper") {
                const vw = <RSegment.ValueWrapper>s;
                if (vw.codes.length > 0) {
                    codes.push(<RSegment.ValueWrapper>s);
                }
                s = <RSegment.Value>vw.value;
            }
            if (o.type == "ValueWrapper") {
                const vw = <RSegment.ValueWrapper>o;
                if (vw.codes.length > 0) {
                    codes.push(<RSegment.ValueWrapper>o);
                }
                o = <RSegment.Value>vw.value;
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
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    type = BASE_TYPES.void;
                } else if (["-", "*", "/", "%", ">>", "<<"].indexOf(v) >= 0) {
                    type = BASE_TYPES.int;
                } else if (["<", ">", ">=", "<="].indexOf(v) >= 0) {
                    type = BASE_TYPES.boolean;
                } else if (v == "&&" || v == "||") {
                    if (typeCalc.equalsTo(sType, BASE_TYPES.boolean) && typeCalc.equalsTo(oType, BASE_TYPES.boolean)) {
                        type = BASE_TYPES.boolean;
                    } else {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                        type = BASE_TYPES.void;
                    }
                } else {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(v), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    type = BASE_TYPES.void;
                }
            }
            const value = new RSegment.ExpressionSVO(seg.coordinate, s, v, o, type);

            if (codes.length == 0) {
                return value;
            }
            if (codes.length == 1) {
                codes[0].value = value;
                codes[0].valueType = value.valueType;
                return codes[0];
            }
            return new RSegment.ValueWrapper(
                seg.coordinate,
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

    if (segmentRaw.type == "ExpressionSV") {
        const seg = <Segment.ExpressionSV>segmentRaw;
        let s = preprocessValue(seg.s, coordinateChain, requirement, context);
        if (s.type == "EmptyValue") {
            reportError();
            return new RSegment.EmptyValue(seg.coordinate);
        }
        let v = seg.v;

        if (!typeCalc.equalsTo(s.valueType, BASE_TYPES.int)) {
            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                ...seg.coordinate,
                chain: coordinateChain
            });
        }

        if (s.type == "MacroValCall") {
            const val = (<RSegment.MacroValCall>s).val;
            if (val.value) {
                if (typeCalc.equalsTo(val.type, BASE_TYPES.int)) {
                    const ret = new RSegment.Int(seg.coordinate, (<RSegment.Int>val.value).value);
                    if (v == "++") {
                        val.value = new RSegment.Int(seg.coordinate, (<RSegment.Int>val.value).value + 1);
                        return ret;
                    }
                    if (v == "--") {
                        val.value = new RSegment.Int(seg.coordinate, (<RSegment.Int>val.value).value - 1);
                        return ret;
                    }
                }
                if (typeCalc.equalsTo(val.type, BASE_TYPES.string)) {
                    const num = Number((<RSegment.String>val.value).value);
                    if (isNaN(num)) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                            ...s.coordinate,
                            chain: coordinateChain
                        });
                    }
                    const ret = new RSegment.Int(seg.coordinate, num);
                    if (v == "++") {
                        val.value = new RSegment.String(seg.coordinate, (num + 1).toString());
                        return ret;
                    }
                    if (v == "--") {
                        val.value = new RSegment.String(seg.coordinate, (num - 1).toString());
                        return ret;
                    }
                }
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(v), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            } else {
                api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
            }
        }
        if (s.type == "ValCall") {
            if ((<RSegment.ValCall>s).val.prop.isConst) {
                api.logger.errorInterrupt(LOG_ERROR.notAVar(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
            }
            return new RSegment.ExpressionSV(seg.coordinate, s, seg.v, s.valueType);
        }
        if (s.type == "GetProperty") {
            if ((<RSegment.GetProperty>s).valObj && (!(<RSegment.GetProperty>s).valObj?.prop.isConst)) {
                return new RSegment.ExpressionSV(seg.coordinate, s, seg.v, s.valueType);
            } else {
                api.logger.errorInterrupt(LOG_ERROR.notAVar(), {
                    ...s.coordinate,
                    chain: coordinateChain
                });
            }
        }
    }

    if (segmentRaw.type == "ExpressionVO") {
        const seg = <Segment.ExpressionVO>segmentRaw;
        let v = seg.v;
        let o = preprocessValue(seg.o, coordinateChain, requirement, context);
        if (o.type == "EmptyValue") {
            reportError();
            return new RSegment.EmptyValue(seg.coordinate);
        }

        if (v == "!") {
            if (!typeCalc.equalsTo(o.valueType, BASE_TYPES.boolean)) {
                api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                ...seg.coordinate,
                chain: coordinateChain
            });
            if (o.isMacro) {
                let vw: RSegment.ValueWrapper | undefined;
                if (o.type == "ValueWrapper") {
                    if ((<RSegment.ValueWrapper>o).codes.length > 0) {
                        vw = <RSegment.ValueWrapper>o;
                    }
                    o = <RSegment.Value>(<RSegment.ValueWrapper>o).value;
                }
                if (o.type == "MacroValCall") {
                    const val = (<RSegment.MacroValCall>o).val;
                    if (val.value) {
                        o = val.value;
                    } else {
                        api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                            ...o.coordinate,
                            chain: coordinateChain
                        });
                    }
                }
                if (!typeCalc.equalsTo(o.valueType, BASE_TYPES.boolean)) {
                    const str = (<RSegment.MacroBase>o).toStr().value;
                    if (str == "1") {
                        o = new RSegment.Bool(o.coordinate, true);
                    }
                    if (str == "0") {
                        o = new RSegment.Bool(o.coordinate, false);
                    }
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                }
                if (vw) {
                    vw.value = new RSegment.Bool(seg.coordinate, !(<RSegment.Bool>o).value);
                    return vw;
                } else {
                    return new RSegment.Bool(seg.coordinate, !(<RSegment.Bool>o).value);
                }
            } else {
                let vw: RSegment.ValueWrapper | undefined;
                const oType = o.valueType;

                if (o.type == "ValueWrapper") {
                    if ((<RSegment.ValueWrapper>o).codes.length > 0) {
                        vw = <RSegment.ValueWrapper>o;
                    }
                    o = <RSegment.Value>(<RSegment.ValueWrapper>o).value;
                }
                if (typeCalc.equalsTo(oType, BASE_TYPES.string)) {
                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    const value = new RSegment.ExpressionVO(seg.coordinate, v, o, BASE_TYPES.boolean);
                    if (vw) {
                        vw.value = value;
                        return vw;
                    } else {
                        return value;
                    }
                }
            }
        }
        if (v == "++" || v == "--") {
            if (!typeCalc.equalsTo(o.valueType, BASE_TYPES.int)) {
                api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            if (o.type == "MacroValCall") {
                const val = (<RSegment.MacroValCall>o).val;
                if (val.value) {
                    if (typeCalc.equalsTo(val.type, BASE_TYPES.int)) {
                        const ret = new RSegment.Int(seg.coordinate, (<RSegment.Int>val.value).value);
                        if (v == "++") {
                            val.value = new RSegment.Int(seg.coordinate, (<RSegment.Int>val.value).value + 1);
                            return ret;
                        }
                        if (v == "--") {
                            val.value = new RSegment.Int(seg.coordinate, (<RSegment.Int>val.value).value - 1);
                            return ret;
                        }
                    }
                    if (typeCalc.equalsTo(val.type, BASE_TYPES.string)) {
                        const num = Number((<RSegment.String>val.value).value);
                        if (isNaN(num)) {
                            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                ...o.coordinate,
                                chain: coordinateChain
                            });
                        }
                        if (v == "++") {
                            val.value = new RSegment.String(seg.coordinate, (num + 1).toString());
                            return val.value;
                        }
                        if (v == "--") {
                            val.value = new RSegment.String(seg.coordinate, (num - 1).toString());
                            return val.value;
                        }
                    }
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(v), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                } else {
                    api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                }
            }
            if (o.type == "ValCall") {
                if ((<RSegment.ValCall>o).val.prop.isConst) {
                    api.logger.errorInterrupt(LOG_ERROR.notAVar(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                }
                return new RSegment.ExpressionSV(seg.coordinate, o, seg.v, o.valueType);
            }
            if (o.type == "GetProperty") {
                if ((<RSegment.GetProperty>o).valObj && (!(<RSegment.GetProperty>o).valObj?.prop.isConst)) {
                    return new RSegment.ExpressionSV(seg.coordinate, o, seg.v, o.valueType);
                } else {
                    api.logger.errorInterrupt(LOG_ERROR.notAVar(), {
                        ...o.coordinate,
                        chain: coordinateChain
                    });
                }
            }
        }
    }
    api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), segmentRaw.coordinate);
    return <RSegment.Value>{};
}