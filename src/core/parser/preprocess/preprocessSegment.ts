import { Segment } from "../../types/parser/segment";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";
import Pools, { SYMBOL_SEPARATOR } from "../../util/parser/pools";
import { RSegment } from "../../types/parser/rSegment";
import Annotation from "../../types/parser/annotation";
import LOG_ERROR from "../../logger/logError";
import { BUILTIN_ANNOTATIONS } from "../../builtin/annotations/builtinAnnotations";
import Type, { BASE_TYPES, BASE_TYPES_NAME } from "../../types/parser/type";
import Struct from "../../types/parser/struct";
import typeCalc from "../../util/parser/typeCalc";
import MacroVal from "../../types/parser/macroVal";
import Val from "../../types/parser/val";
import preprocessValue from "./preprocessValue";
import LOG_WARNING from "../../logger/logWarning";
import MacroFunc from "../../types/parser/macroFunc";
import Func from "../../types/parser/func";
import Name = Segment.Name;

export default function preprocessSegment(
    segmentRaw: Segment.SegmentInterface,
    coordinateChain: Coordinate[],
    requirement: {
        target: "sh" | "bat";
    },
    context: {
        api: ApiWrapper,
        pools: Pools,
        hasError: { v: boolean },
        namespace: string[]
    }
): RSegment.SegmentInterface {
    const { api, pools, namespace } = context;
    let segment = segmentRaw;
    let annotations: Annotation[] = [];


    function reportError() {
        context.hasError.v = true;
    }

    let constStatement = false;
    let deprecated = false;
    let optional = false;
    if (segment.type == "AnnotationSegment") {
        const seg = <Segment.AnnotationSegment>segment;
        let sh = false;
        let bat = false;
        for (const annotation of seg.annotations) {
            const symbol = pools.getSymbol(annotation.annotation, {
                ...annotation.coordinate,
                chain: coordinateChain
            }, { api, namespace });
            if (symbol.type != "Annotation") {
                api.logger.error(LOG_ERROR.notAnAnnotation(), {
                    ...annotation.coordinate,
                    chain: coordinateChain
                });
                continue;
            }
            annotations.push(<Annotation>symbol);
            if (<Annotation>symbol == BUILTIN_ANNOTATIONS["@bat"]) {
                bat = true;
            }
            if (<Annotation>symbol == BUILTIN_ANNOTATIONS["@sh"]) {
                sh = true;
            }
            if (<Annotation>symbol == BUILTIN_ANNOTATIONS["@const"]) {
                constStatement = true;
            }
            if (<Annotation>symbol == BUILTIN_ANNOTATIONS["@deprecated"]) {
                deprecated = true;
            }
            if (<Annotation>symbol == BUILTIN_ANNOTATIONS["@optional"]) {
                optional = true;
            }
        }
        if (
            (sh && !bat && requirement.target == "bat") ||
            (!sh && bat && requirement.target == "sh")
        ) {
            return new RSegment.Empty({
                ...segment.coordinate,
                chain: coordinateChain
            });
        }
    }
    if (segment.type == "Empty") {
        return new RSegment.Empty({
            ...segment.coordinate,
            chain: coordinateChain
        });
    }
    if (segment.type == "ValDefine") {
        const seg = <Segment.ValDefine>segment;
        if (seg.props.native) {
            api.logger.error(LOG_ERROR.nativeVal(), {
                ...seg.coordinate,
                chain: coordinateChain
            });
            reportError();
        }
        if (!seg.valType && !seg.initialValue) {
            api.logger.errorInterrupt(LOG_ERROR.missingType(), {
                ...seg.coordinate,
                chain: coordinateChain
            });
        }
        let type: Type | undefined;
        if (seg.valType) {
            if (
                seg.valType.namespaces.length == 0 &&
                BASE_TYPES_NAME.indexOf(seg.valType.value) >= 0
            ) {
                type = {
                    type: "base",
                    base: <"string" | "boolean" | "int" | "void">seg.valType.value
                };
            } else {
                const t = pools.getSymbol(
                    seg.valType,
                    {
                        ...seg.valType.coordinate,
                        chain: coordinateChain
                    },
                    { api, namespace }
                );
                if (t.type == "Struct") {
                    type = {
                        type: "struct",
                        struct: <Struct>t.value
                    };
                } else {
                    type = BASE_TYPES.void;
                }
            }
            if (typeCalc.equalsTo(type, BASE_TYPES.void)) {
                api.logger.error(LOG_ERROR.voidVal(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
        }
        if (seg.props.macro) {
            if (seg.initialValue) {
                const i = preprocessValue(seg.initialValue, coordinateChain, requirement, context);
                if (i.type == "EmptyValue") {
                    reportError();
                    return new RSegment.Empty(seg.coordinate);
                }
                if (!i.isMacro) {
                    api.logger.errorInterrupt(LOG_ERROR.notMacro(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                }
                if (type) {
                    if (!typeCalc.contains(i.valueType, type)) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                            ...seg.coordinate,
                            chain: coordinateChain
                        });
                    }
                } else {
                    type = i.valueType;
                }
                let i1 = i;
                let iType = i1.valueType;
                if (i1.type == "ValueWrapper") {
                    if ((<RSegment.ValueWrapper>i1).codes) {
                        const vw = <RSegment.ValueWrapper>i1;
                        if (!vw.value) {
                            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        if (!typeCalc.contains(iType, type)) {
                            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        const val = new MacroVal(type, {
                                isConst: !seg.props.var,
                                deprecated
                            },
                            <RSegment.Value>vw.value);
                        pools.pushSymbol(
                            "MacroVal",
                            seg.valName,
                            val,
                            namespace
                        );
                        vw.isMacro = false;
                        vw.value = undefined;
                        return vw;
                    } else {
                        if (!(<RSegment.ValueWrapper>i1).value) {
                            api.logger.errorInterrupt(LOG_ERROR.missingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        i1 = <RSegment.Value>(<RSegment.ValueWrapper>i1).value;
                    }
                }
                if (i1.type == "MacroValCall") {
                    if ((<RSegment.MacroValCall>i).val.value) {
                        i1 = <RSegment.Value>(<RSegment.MacroValCall>i).val.value;
                    } else {
                        api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                            ...i.coordinate,
                            chain: coordinateChain
                        });
                    }
                }
                const v = MacroVal.fromValue(i1, !seg.props.var, { api });
                const val = new MacroVal(type, {
                        isConst: !seg.props.var,
                        deprecated
                    },
                    v.val.value
                );
                pools.pushSymbol("MacroVal", seg.valName, val, namespace);

                if (v.wrapper) {
                    v.wrapper.valueType = val.type;
                    v.wrapper.value = val.value;
                    return v.wrapper;
                }
                return new RSegment.Empty(seg.coordinate);
            } else {
                if (!type) {
                    api.logger.error(LOG_ERROR.missingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.Empty(seg.coordinate);
                }
                if (!seg.props.var) {
                    api.logger.error(LOG_ERROR.missingInitialValue(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                }
                const val = new MacroVal(type, {
                        isConst: !seg.props.var,
                        deprecated
                    }
                );
                pools.pushSymbol("MacroVal", seg.valName, val, namespace);
            }
        } else {
            const i = seg.initialValue ? preprocessValue(seg.initialValue, coordinateChain, requirement, context) : undefined;
            if (i) {
                if (i.type == "EmptyValue") {
                    reportError();
                    return new RSegment.Empty(seg.coordinate);
                }
                if (type && !typeCalc.contains(i.valueType, type)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                }
                if (!type) {
                    type = i.valueType;
                }
            } else {
                if (!type) {
                    api.logger.error(LOG_ERROR.missingType(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.Empty(seg.coordinate);
                }
                if (!seg.props.var) {
                    api.logger.error(LOG_ERROR.missingInitialValue(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                }
            }

            const val = new Val(seg.valName.value, type, {
                isConst: !seg.props.var,
                optional,
                deprecated
            });

            pools.pushSymbol("Val", seg.valName, val, namespace);

            if (i) {
                val.isInit = true;
                return new RSegment.ExpressionSVO(seg.coordinate, new RSegment.ValCall(seg.coordinate, val), "=", i, type);
            } else {
                return new RSegment.Empty(seg.coordinate);
            }

        }
    }
    if (segment.type == "FunctionDefine") {
        const seg = <Segment.FunctionDefine>segment;
        if (pools.flags.defineFunction) {
            api.logger.errorInterrupt(LOG_ERROR.functionInFunction(), {
                ...seg.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.Empty(seg.coordinate);
        }
        pools.flags.defineFunction = true;
        type Arg = {
            name: string,
            type: Type,
            isMacro: boolean,
            defaultValue?: RSegment.Value
        }
        const args: Arg[] = [];
        const codes: RSegment.SegmentInterface[] = [];
        for (const arg of seg.args) {
            if (!arg.valType) {
                api.logger.errorInterrupt(LOG_ERROR.missingType(), {
                    ...arg.coordinate,
                    chain: coordinateChain
                });
                reportError();
                pools.flags.defineFunction = false;
                return new RSegment.Empty(seg.coordinate);
            }
            let isMacro = arg.props.macro;
            if (!seg.props.macro && arg.props.macro) {
                api.logger.warning(LOG_WARNING.macroArgInRuntimeFunction(), {
                    ...arg.coordinate,
                    chain: coordinateChain
                });
                isMacro = false;
            }
            let type = typeCalc.getTypeWithName(arg.valType, context);
            if (arg.initialValue) {
                let i = preprocessValue(arg.initialValue, coordinateChain, requirement, context);
                if (i.type == "EmptyValue") {
                    reportError();
                    pools.flags.defineFunction = false;
                    return new RSegment.Empty(seg.coordinate);
                }

                if (arg.props.macro && !i.isMacro) {
                    api.logger.error(LOG_ERROR.notMacro(), {
                        ...seg.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    pools.flags.defineFunction = false;
                    return new RSegment.Empty(seg.coordinate);
                }
                if (i.isMacro) {
                    let t = i.valueType;
                    if (i.type == "ValueWrapper") {
                        if ((<RSegment.ValueWrapper>i).codes) {
                            const vw = <RSegment.ValueWrapper>i;
                            if (!vw.value) {
                                api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                    ...i.coordinate,
                                    chain: coordinateChain
                                });
                            }
                            i = <RSegment.Value>vw.value;
                            codes.push(...vw.codes);
                        }
                        if (!(<RSegment.ValueWrapper>i).value) {
                            api.logger.error(LOG_ERROR.reallyWeird(), {
                                ...i.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            pools.flags.defineFunction = false;
                            return new RSegment.Empty(seg.coordinate);
                        }
                        if (!typeCalc.equalsTo(t, i.valueType)) {
                            if (typeCalc.equalsTo(t, BASE_TYPES.boolean)) {
                                const str = (<RSegment.MacroBase>i).toStr().value;
                                if (str == "1") {
                                    i = new RSegment.Bool(i.coordinate, true);
                                }
                                if (str == "0") {
                                    i = new RSegment.Bool(i.coordinate, false);
                                }
                                api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                    ...i.coordinate,
                                    chain: coordinateChain
                                });
                            }
                            if (typeCalc.equalsTo(t, BASE_TYPES.int)) {
                                const num = Number((<RSegment.MacroBase>i).toStr().value);
                                if (isNaN(num)) {
                                    api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                        ...i.coordinate,
                                        chain: coordinateChain
                                    });
                                }
                                i = new RSegment.Int(i.coordinate, num);
                            }
                        }
                    }
                    if (i.type == "MacroValCall") {
                        if ((<RSegment.MacroValCall>i).val.value) {
                            i = <RSegment.Value>(<RSegment.MacroValCall>i).val.value;
                        } else {
                            api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), {
                                ...i.coordinate,
                                chain: coordinateChain
                            });
                        }
                    }

                    if (!typeCalc.contains(t, type)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...i.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        pools.flags.defineFunction = false;
                        return new RSegment.Empty(seg.coordinate);
                    }
                }
                if (isMacro && !i.isMacro) {
                    api.logger.error(LOG_ERROR.notMacro(), {
                        ...arg.initialValue.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    isMacro = false;
                }

                args.push({
                    name: arg.valName.value,
                    type: type,
                    isMacro: isMacro,
                    defaultValue: i
                });
            } else {
                if (!arg.valType) {
                    api.logger.errorInterrupt(LOG_ERROR.missingType(), {
                        ...arg.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    pools.flags.defineFunction = false;
                    return new RSegment.Empty(seg.coordinate);
                }
                type = typeCalc.getTypeWithName(arg.valType, context);
                args.push({
                    name: arg.valName.value,
                    type: type,
                    isMacro: isMacro
                });
            }
        }
        const returnType = seg.functionType ? typeCalc.getTypeWithName(seg.functionType, context) : BASE_TYPES.void;
        if (!seg.block) {
            pools.flags.defineFunction = false;
            return new RSegment.Empty(seg.coordinate);
            //TODO-implement native function
        }
        if (seg.props.macro) {
            pools.flags.defineFunction = false;
            const func = new MacroFunc(seg.functionName.value, returnType, args, seg.block, {
                deprecated,
                hasScope: !(annotations.indexOf(BUILTIN_ANNOTATIONS["@noScope"]) >= 0),
                isConstexpr: annotations.indexOf(BUILTIN_ANNOTATIONS["@constexpr"]) >= 0
            }, pools.symbolTable.length);
            pools.pushSymbol("MacroFunction", seg.functionName, func, namespace);
            if (codes.length == 0) {
                return new RSegment.Empty(seg.coordinate);
            }
            if (codes.length == 1) {
                return codes[0];
            }
            return new RSegment.Block(seg.coordinate, codes, undefined).noScope();
        }
        pools.symbolTable.push(SYMBOL_SEPARATOR.scope);
        for (const arg of args) {
            const val = new Val(arg.name, arg.type, {
                isConst: false,
                optional: false,
                deprecated: false
            });
            val.isInit = true;
            pools.pushSymbol("Val", new Name(seg.coordinate, arg.name), val, []);
        }
        const body = preprocessSegment(seg.block, coordinateChain, requirement, context);
        pools.popScope();
        const func = new Func(seg.functionName.value, returnType, args,
            body.type == "Block" ? <RSegment.Block>body : new RSegment.Block(seg.coordinate, [body], undefined), {
                deprecated,
                optional
            });
        pools.pushSymbol("Function", seg.functionName, func, namespace);
        pools.flags.defineFunction = false;
        return new RSegment.Empty(seg.coordinate);
        //TODO
        // return value: unwrap, check, ?
    }
    if (segment.type == "Block") {
        const seg = <Segment.Block>segment;
        const inside: RSegment.SegmentInterface[] = [];
        let macroReturnValue: RSegment.Value | undefined;
        pools.symbolTable.push(SYMBOL_SEPARATOR.scope);
        for (const insideSegment of seg.inside) {
            const s = preprocessSegment(insideSegment, coordinateChain, requirement, context);
            if (s.type != "Empty") {
                inside.push(s);
            }
            if (s.macroReturnValue) {
                macroReturnValue = s.macroReturnValue;
                break;
            }
        }
        pools.popScope();
        if (inside.length == 0) {
            return new RSegment.Empty(seg.coordinate);
        }
        if (inside.length == 1) {
            return inside[0];
        }
        const b = new RSegment.Block(seg.coordinate, inside, macroReturnValue);
        b.hasScope = false;
        return b;
    }
    if (segment.type == "StructDefine") {
        const seg = <Segment.StructDefine>segment;
        const def: { [key: string]: Type } = {};
        for (const key in seg.inside) {
            def[key] = typeCalc.getTypeWithName(seg.inside[key], context);
        }
        pools.pushSymbol("Struct", seg.structName, new Struct(seg.structName.value, def), namespace);
        return new RSegment.Empty(seg.coordinate);
    }
    if (segment.type == "If") {
        const seg = <Segment.If>segment;
        let valueWrapper: RSegment.ValueWrapper | undefined;
        const condition = preprocessValue(seg.condition, coordinateChain, requirement, context);
        if (condition.type == "EmptyValue") {
            reportError();
            return new RSegment.Empty(seg.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...seg.condition.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.Empty(seg.coordinate);
        }
        if (constStatement && condition.isMacro) {
            let c1 = condition;
            if (c1.type == "ValueWrapper") {
                if ((<RSegment.ValueWrapper>c1).codes) {
                    const vw = <RSegment.ValueWrapper>c1;
                    if (!vw.value) {
                        api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                            ...c1.coordinate,
                            chain: coordinateChain
                        });
                    }
                    if ((<RSegment.Bool>vw.value).value) {
                        c1 = <RSegment.Bool>vw.value;
                        valueWrapper = vw;
                    } else {
                        vw.isMacro = false;
                        vw.value = undefined;
                        valueWrapper = vw;
                    }
                } else {
                    if (!(<RSegment.ValueWrapper>c1).value) {
                        api.logger.errorInterrupt(LOG_ERROR.missingType(), {
                            ...c1.coordinate,
                            chain: coordinateChain
                        });
                    }
                    c1 = <RSegment.Value>(<RSegment.ValueWrapper>c1).value;
                }
            }
            let va = typeCalc.valueToObj(c1, {
                ...c1.coordinate,
                chain: coordinateChain
            }, { api });
            let statement: RSegment.SegmentInterface;
            if (va) {
                statement = preprocessSegment(seg.statement, coordinateChain, requirement, context);
            } else {
                if (seg.elseStatement) {
                    statement = preprocessSegment(seg.elseStatement, coordinateChain, requirement, context);
                } else {
                    if (valueWrapper) {
                        return valueWrapper;
                    }
                    return new RSegment.Empty(seg.coordinate);
                }
            }
            if (statement.type == "Empty") {
                if (valueWrapper) {
                    return valueWrapper;
                }
                return new RSegment.Empty(seg.coordinate);
            } else {
                if (valueWrapper) {
                    return new RSegment.ValueWrapper(seg.coordinate, BASE_TYPES.void, [valueWrapper, statement], {
                        isMacro: false,
                        hasScope: false
                    });
                }
                return statement;
            }
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement = preprocessSegment(seg.statement, coordinateChain, requirement, context);
            const elseStatement = seg.elseStatement ? preprocessSegment(seg.elseStatement, coordinateChain, requirement, context) : undefined;
            pools.popMacroScope();
            return new RSegment.If(seg.coordinate, condition, statement, elseStatement, undefined);
        }
    }
    if (segment.type == "For") {
        const seg = <Segment.For>segment;
        let codes: RSegment.SegmentInterface[] = [];
        pools.symbolTable.push(SYMBOL_SEPARATOR.scope);
        const statement1 = preprocessSegment(seg.statement1, coordinateChain, requirement, context);
        const condition = preprocessValue(seg.statement2, coordinateChain, requirement, context);
        if (condition.type == "EmptyValue") {
            reportError();
            pools.popScope();
            return new RSegment.Empty(seg.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...seg.statement2.coordinate,
                chain: coordinateChain
            });
            reportError();
            pools.popScope();
            return new RSegment.Empty(seg.coordinate);
        }
        if (constStatement && condition.isMacro) {
            let c1 = condition;
            const getCondition = (): boolean => {
                if (c1.type == "ValueWrapper") {
                    if ((<RSegment.ValueWrapper>c1).codes) {
                        const vw = <RSegment.ValueWrapper>c1;
                        if (!vw.value) {
                            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        if ((<RSegment.Bool>vw.value).value) {
                            c1 = <RSegment.Bool>vw.value;
                            codes.push(vw);
                        } else {
                            vw.isMacro = false;
                            vw.value = undefined;
                            codes.push(vw);
                        }
                    } else {
                        if (!(<RSegment.ValueWrapper>c1).value) {
                            api.logger.errorInterrupt(LOG_ERROR.missingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        c1 = <RSegment.Value>(<RSegment.ValueWrapper>c1).value;
                    }
                }
                return typeCalc.valueToObj(c1, {
                    ...c1.coordinate,
                    chain: coordinateChain
                }, { api });
            };
            let macroReturnValue: RSegment.Value | undefined;
            while (getCondition()) {
                let statement = preprocessSegment(seg.statement, coordinateChain, requirement, context);
                if (statement.type != "Empty") {
                    codes.push(statement);
                }
                if (statement.macroReturnValue) {
                    macroReturnValue = statement.macroReturnValue;
                    break;
                }
                c1 = preprocessValue(seg.statement2, coordinateChain, requirement, context);
                const statement2 = preprocessSegment(seg.statement3, coordinateChain, requirement, context);
                if (statement2.type != "Empty") {
                    codes.push(statement2);
                }
            }
            pools.popScope();
            return new RSegment.Block(seg.coordinate, codes, macroReturnValue);
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement3 = preprocessSegment(seg.statement3, coordinateChain, requirement, context);
            const statement = preprocessSegment(seg.statement, coordinateChain, requirement, context);
            pools.popMacroScope();
            pools.popScope();
            return new RSegment.For(seg.coordinate, statement1, condition, statement3, statement, undefined);
        }
    }
    if (segment.type == "While") {
        const seg = <Segment.While>segment;
        let codes: RSegment.SegmentInterface[] = [];
        const condition = preprocessValue(seg.condition, coordinateChain, requirement, context);
        if (condition.type == "EmptyValue") {
            reportError();
            return new RSegment.Empty(seg.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...seg.condition.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.Empty(seg.coordinate);
        }
        if (constStatement && condition.isMacro) {
            let c1 = condition;
            const getCondition = (): boolean => {
                if (c1.type == "ValueWrapper") {
                    if ((<RSegment.ValueWrapper>c1).codes) {
                        const vw = <RSegment.ValueWrapper>c1;
                        if (!vw.value) {
                            api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        if ((<RSegment.Bool>vw.value).value) {
                            c1 = <RSegment.Bool>vw.value;
                            codes.push(vw);
                        } else {
                            vw.isMacro = false;
                            vw.value = undefined;
                            codes.push(vw);
                        }
                    } else {
                        if (!(<RSegment.ValueWrapper>c1).value) {
                            api.logger.errorInterrupt(LOG_ERROR.missingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                        }
                        c1 = <RSegment.Value>(<RSegment.ValueWrapper>c1).value;
                    }
                }

                return typeCalc.valueToObj(c1, {
                    ...c1.coordinate,
                    chain: coordinateChain
                }, { api });
            };
            let macroReturnValue: RSegment.Value | undefined;
            while (getCondition()) {
                let statement = preprocessSegment(seg.statement, coordinateChain, requirement, context);
                if (statement.type != "Empty") {
                    codes.push(statement);
                }
                if (statement.macroReturnValue) {
                    macroReturnValue = statement.macroReturnValue;
                    break;
                }
                c1 = preprocessValue(seg.condition, coordinateChain, requirement, context);
            }
            return new RSegment.Block(seg.coordinate, codes, macroReturnValue);
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...seg.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement = preprocessSegment(seg.statement, coordinateChain, requirement, context);
            pools.popMacroScope();
            return new RSegment.While(seg.coordinate, condition, statement, undefined);
        }
    }
    if (segment.type == "Namespace") {
        const seg = <Segment.Namespace>segment;
        const ns = [...namespace, ...seg.namespaceName.namespaces, seg.namespaceName.value];
        const inside: RSegment.SegmentInterface[] = [];
        let macroReturnValue: RSegment.Value | undefined;
        for (const insideSegment of seg.block.inside) {
            const s = preprocessSegment(insideSegment, coordinateChain, requirement, {
                ...context,
                namespace: ns
            });
            if (s.type != "Empty") {
                inside.push(s);
            }
            if (s.macroReturnValue) {
                macroReturnValue = s.macroReturnValue;
                break;
            }
        }
        if (inside.length == 0) {
            return new RSegment.Empty(seg.coordinate);
        }
        if (inside.length == 1) {
            return inside[0];
        }
        const b = new RSegment.Block(seg.coordinate, inside, macroReturnValue);
        b.hasScope = false;
        return b;
    }
    if (segment.type == "Using") {
        const seg = <Segment.Using>segment;
        const symbol = pools.getSymbol(seg.definingName, {
            ...seg.definingName.coordinate,
            chain: coordinateChain
        }, { api, namespace });
        pools.symbolTable.push({
            ...symbol,
            name: seg.definingName.value
        });
        return new RSegment.Empty(seg.coordinate);
    }
    if (segment.type == "UsingNamespace") {
        const seg = <Segment.UsingNamespace>segment;
        const ns = seg.namespaceName.namespaces.join("_") + "_";
        for (const symbol of pools.symbolTable) {
            if (symbol.name.startsWith(ns)) {
                pools.symbolTable.push({
                    ...symbol,
                    name: symbol.name.slice(ns.length)
                });
            }
        }
        return new RSegment.Empty(seg.coordinate);
    }
    if (segment.type == "Return") {
        const seg = <Segment.Return>segment;
        if (!seg.value) {
            return new RSegment.Return(seg.coordinate, undefined, true);
        }
        const value = preprocessValue(seg.value, coordinateChain, requirement, context);
        if (typeCalc.equalsTo(value.valueType, BASE_TYPES.void)) {
            api.logger.error(LOG_ERROR.mismatchingType(), seg.coordinate);
            reportError();
            return new RSegment.Return(seg.coordinate, undefined, true);
        }
        return new RSegment.Return(seg.coordinate, value, value.isMacro);
    }
    const value = preprocessValue(segment, coordinateChain, requirement, context);
    if (value.type == "EmptyValue") {
        reportError();
        return new RSegment.Empty(segment.coordinate);
    }
    if (value.isMacro && value.type != "ValueWrapper") {
        return new RSegment.Empty(segment.coordinate);
    }
    return value;
}