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
    if (segment instanceof Segment.AnnotationSegment) {
        let sh = false;
        let bat = false;
        for (const annotation of segment.annotations) {
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
            if (symbol.value == BUILTIN_ANNOTATIONS["@bat"]) {
                bat = true;
            }
            if (symbol.value == BUILTIN_ANNOTATIONS["@sh"]) {
                sh = true;
            }
            if (symbol.value == BUILTIN_ANNOTATIONS["@const"]) {
                constStatement = true;
            }
            if (symbol.value == BUILTIN_ANNOTATIONS["@deprecated"]) {
                deprecated = true;
            }
            if (symbol.value == BUILTIN_ANNOTATIONS["@optional"]) {
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
        segment = segment.value;
    }
    if (segment instanceof Segment.Empty) {
        return new RSegment.Empty({
            ...segment.coordinate,
            chain: coordinateChain
        });
    }
    if (segment instanceof Segment.ValDefine) {
        if (segment.props.native) {
            api.logger.error(LOG_ERROR.nativeVal(), {
                ...segment.coordinate,
                chain: coordinateChain
            });
            reportError();
        }
        if (!segment.valType && !segment.initialValue) {
            api.logger.error(LOG_ERROR.missingType(), {
                ...segment.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.Empty(segment.coordinate);
        }
        let type: Type | undefined;
        if (segment.valType) {
            if (
                segment.valType.namespaces.length == 0 &&
                BASE_TYPES_NAME.indexOf(segment.valType.value) >= 0
            ) {
                type = {
                    type: "base",
                    base: <"string" | "boolean" | "int" | "void">segment.valType.value
                };
            } else {
                const t = pools.getSymbol(
                    segment.valType,
                    {
                        ...segment.valType.coordinate,
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
                    ...segment.coordinate,
                    chain: coordinateChain
                });
            }
        }
        if (segment.props.macro) {
            if (segment.initialValue) {
                const i = preprocessValue(segment.initialValue, coordinateChain, requirement, context);
                if (i instanceof RSegment.EmptyValue) {
                    reportError();
                    return new RSegment.Empty(segment.coordinate);
                }
                if (typeCalc.equalsTo(i.valueType, BASE_TYPES.command)) {
                    api.logger.error(LOG_ERROR.disabledType(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.Empty(segment.coordinate);
                }
                if (!i.isMacro) {
                    api.logger.error(LOG_ERROR.notMacro(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.Empty(segment.coordinate);
                }
                if (type) {
                    if (!typeCalc.contains(i.valueType, type)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...segment.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.Empty(segment.coordinate);
                    }
                } else {
                    type = i.valueType;
                }
                let i1 = i;
                let iType = i1.valueType;
                if (i1 instanceof RSegment.ValueWrapper) {
                    if ((<RSegment.ValueWrapper>i1).codes) {
                        const vw = <RSegment.ValueWrapper>i1;
                        if (!vw.value) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.Empty(segment.coordinate);
                        }
                        if (!typeCalc.contains(iType, type)) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.Empty(segment.coordinate);
                        }
                        const val = new MacroVal(type, {
                                isConst: !segment.props.var,
                                deprecated
                            },
                            <RSegment.Value>vw.value);
                        pools.pushSymbol(
                            "MacroVal",
                            segment.valName,
                            val,
                            namespace
                        );
                        vw.isMacro = false;
                        vw.value = undefined;
                        return vw;
                    } else {
                        if (!(<RSegment.ValueWrapper>i1).value) {
                            api.logger.error(LOG_ERROR.missingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.Empty(segment.coordinate);
                        }
                        i1 = <RSegment.Value>(<RSegment.ValueWrapper>i1).value;
                    }
                }
                if (i1 instanceof RSegment.MacroValCall) {
                    if ((<RSegment.MacroValCall>i).val.value) {
                        i1 = <RSegment.Value>(<RSegment.MacroValCall>i).val.value;
                    } else {
                        api.logger.error(LOG_ERROR.useBeforeInit(), {
                            ...i.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.Empty(segment.coordinate);
                    }
                }
                const v = MacroVal.fromValue(i1, !segment.props.var, { api });
                const val = new MacroVal(type, {
                        isConst: !segment.props.var,
                        deprecated
                    },
                    v.val.value
                );
                pools.pushSymbol("MacroVal", segment.valName, val, namespace);

                if (v.wrapper) {
                    v.wrapper.valueType = val.type;
                    v.wrapper.value = val.value;
                    return v.wrapper;
                }
                return new RSegment.Empty(segment.coordinate);
            } else {
                if (!type) {
                    api.logger.error(LOG_ERROR.missingType(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.Empty(segment.coordinate);
                }
                if (!segment.props.var) {
                    api.logger.error(LOG_ERROR.missingInitialValue(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                }
                const val = new MacroVal(type, {
                        isConst: !segment.props.var,
                        deprecated
                    }
                );
                pools.pushSymbol("MacroVal", segment.valName, val, namespace);
            }
        } else {
            const i = segment.initialValue ? preprocessValue(segment.initialValue, coordinateChain, requirement, context) : undefined;
            if (i) {
                if (i instanceof RSegment.EmptyValue) {
                    reportError();
                    return new RSegment.Empty(segment.coordinate);
                }
                if (typeCalc.equalsTo(i.valueType, BASE_TYPES.command)) {
                    api.logger.error(LOG_ERROR.disabledType(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.Empty(segment.coordinate);
                }
                if (type && !typeCalc.contains(i.valueType, type)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...segment.coordinate,
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
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new RSegment.Empty(segment.coordinate);
                }
                if (!segment.props.var) {
                    api.logger.error(LOG_ERROR.missingInitialValue(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                }
            }

            const val = new Val(segment.valName.value, {
                ...segment.coordinate,
                chain: coordinateChain
            }, type, {
                isConst: !segment.props.var,
                optional,
                deprecated
            });
            pools.renamePool.push(val.name);
            pools.pushDefinePool(val);

            pools.pushSymbol("Val", segment.valName, val, namespace);

            if (i) {
                val.isInit = true;
                return new RSegment.ExpressionSVO(segment.coordinate, new RSegment.ValCall(segment.coordinate, val), "=", i, type);
            } else {
                return new RSegment.Empty(segment.coordinate);
            }

        }
    }
    if (segment instanceof Segment.FunctionDefine) {
        if (pools.flags.defineFunction) {
            api.logger.error(LOG_ERROR.functionInFunction(), {
                ...segment.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.Empty(segment.coordinate);
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
        for (const arg of segment.args) {
            if (!arg.valType) {
                api.logger.error(LOG_ERROR.missingType(), {
                    ...arg.coordinate,
                    chain: coordinateChain
                });
                reportError();
                pools.flags.defineFunction = false;
                return new RSegment.Empty(segment.coordinate);
            }
            let isMacro = arg.props.macro;
            if (!segment.props.macro && arg.props.macro) {
                api.logger.warning(LOG_WARNING.macroArgInRuntimeFunction(), {
                    ...arg.coordinate,
                    chain: coordinateChain
                });
                isMacro = false;
            }
            let type = typeCalc.getTypeWithName(arg.valType, context);
            if (arg.initialValue) {
                let i = preprocessValue(arg.initialValue, coordinateChain, requirement, context);
                if (i instanceof RSegment.EmptyValue) {
                    reportError();
                    pools.flags.defineFunction = false;
                    return new RSegment.Empty(segment.coordinate);
                }

                if (arg.props.macro && !i.isMacro) {
                    api.logger.error(LOG_ERROR.notMacro(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    pools.flags.defineFunction = false;
                    return new RSegment.Empty(segment.coordinate);
                }
                if (i.isMacro) {
                    let t = i.valueType;
                    if (i instanceof RSegment.ValueWrapper) {
                        if (i.codes) {
                            const vw = i;
                            if (!vw.value) {
                                api.logger.error(LOG_ERROR.mismatchingType(), {
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
                            return new RSegment.Empty(segment.coordinate);
                        }
                        if (!typeCalc.equalsTo(t, i.valueType)) {
                            if (typeCalc.equalsTo(t, BASE_TYPES.boolean)) {
                                const str = (<RSegment.MacroBase>i).toStr().value;
                                if (str == "1") {
                                    i = new RSegment.Bool(i.coordinate, true);
                                } else if (str == "0") {
                                    i = new RSegment.Bool(i.coordinate, false);
                                } else {
                                    api.logger.error(LOG_ERROR.mismatchingType(), {
                                        ...i.coordinate,
                                        chain: coordinateChain
                                    });
                                    reportError();
                                    i = new RSegment.Bool(i.coordinate, true);
                                }
                            } else if (typeCalc.equalsTo(t, BASE_TYPES.int)) {
                                if (i instanceof RSegment.Bool) {
                                    i = i.toInt();
                                } else {
                                    const num = Number((<RSegment.MacroBase>i).toStr().value);
                                    if (isNaN(num)) {
                                        api.logger.error(LOG_ERROR.mismatchingType(), {
                                            ...i.coordinate,
                                            chain: coordinateChain
                                        });
                                        i = new RSegment.Int(i.coordinate, 0);
                                    } else {
                                        i = new RSegment.Int(i.coordinate, num);
                                    }
                                }
                            } else {
                                i = (<RSegment.MacroBase>i).toStr();
                            }
                        }
                    }
                    if (i instanceof RSegment.MacroValCall) {
                        if (i.val.value) {
                            i = i.val.value;
                        } else {
                            api.logger.error(LOG_ERROR.useBeforeInit(), {
                                ...i.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.Empty(segment.coordinate);
                        }
                    }

                    if (!typeCalc.contains(t, type)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...i.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        pools.flags.defineFunction = false;
                        return new RSegment.Empty(segment.coordinate);
                    }
                }
                if (typeCalc.equalsTo(type, BASE_TYPES.command)) {
                    api.logger.error(LOG_ERROR.disabledType(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    pools.flags.defineFunction = false;
                    return new RSegment.Empty(segment.coordinate);
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
                    api.logger.error(LOG_ERROR.missingType(), {
                        ...arg.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    pools.flags.defineFunction = false;
                    return new RSegment.Empty(segment.coordinate);
                }
                type = typeCalc.getTypeWithName(arg.valType, context);
                args.push({
                    name: arg.valName.value,
                    type: type,
                    isMacro: isMacro
                });
            }
        }
        const returnType = segment.functionType ? typeCalc.getTypeWithName(segment.functionType, context) : BASE_TYPES.void;
        if (!segment.block) {
            pools.flags.defineFunction = false;
            return new RSegment.Empty(segment.coordinate);
            //TODO-implement native function
        }
        if (segment.props.macro) {
            pools.flags.defineFunction = false;
            const func = new MacroFunc(segment.functionName.value, segment.coordinate, returnType, args, segment.block, {
                deprecated,
                hasScope: !(annotations.indexOf(BUILTIN_ANNOTATIONS["@noScope"]) >= 0),
                isConstexpr: annotations.indexOf(BUILTIN_ANNOTATIONS["@constexpr"]) >= 0
            }, pools.symbolTable.length);
            pools.pushSymbol("MacroFunction", segment.functionName, func, namespace);
            if (codes.length == 0) {
                return new RSegment.Empty(segment.coordinate);
            }
            if (codes.length == 1) {
                return codes[0];
            }
            return new RSegment.Block(segment.coordinate, codes, undefined).noScope();
        }
        pools.symbolTable.push(SYMBOL_SEPARATOR.scope);
        pools.pushReturnType(returnType);
        pools.definePool.push([]);
        pools.requirePool.push([]);
        const beforeReturn = () => {
            pools.flags.defineFunction = false;
            pools.popScope();
            pools.returnTypeStack.pop();
        };
        for (const arg of args) {
            const val = new Val(arg.name, {
                ...segment.coordinate,
                chain: coordinateChain
            }, arg.type, {
                isConst: false,
                optional: false,
                deprecated: false
            });
            val.isInit = true;
            pools.renamePool.push(val.name);
            pools.pushSymbol("Val", new Name(segment.coordinate, arg.name), val, []);
            pools.pushDefinePool(val);
        }
        const body = preprocessSegment(segment.block, coordinateChain, requirement, context);
        for (const e of (<(Val | Func)[]>pools.definePool.pop())) {
            if (!e.used && !e.prop.optional) {
                api.logger.warning(LOG_WARNING.notUsed(e.name.v), {
                    ...e.coordinate,
                    chain: coordinateChain
                });
            }
        }
        beforeReturn();
        const func = new Func(segment.functionName.value, {
                ...segment.coordinate,
                chain: coordinateChain
            }, <(Val | Func)[]>pools.requirePool.pop(), returnType, args,
            body instanceof RSegment.Block ? body : new RSegment.Block(segment.coordinate, [body], undefined), {
                deprecated,
                optional
            });
        pools.pushSymbol("Function", segment.functionName, func, namespace);
        pools.renamePool.push(func.name);
        pools.pushDefinePool(func);
        return new RSegment.Empty(segment.coordinate);
        //TODO
        // return value: unwrap, check, ?
    }
    if (segment instanceof Segment.Block) {
        const inside: RSegment.SegmentInterface[] = [];
        let macroReturnValue: RSegment.Value | undefined;
        pools.symbolTable.push(SYMBOL_SEPARATOR.scope);
        for (const insideSegment of segment.inside) {
            const s = preprocessSegment(insideSegment, coordinateChain, requirement, context);
            if (!(s instanceof RSegment.Empty)) {
                inside.push(s);
            }
            if (s.macroReturnValue) {
                macroReturnValue = s.macroReturnValue;
                break;
            }
        }
        pools.popScope();
        if (inside.length == 0) {
            return new RSegment.Empty(segment.coordinate);
        }
        if (inside.length == 1) {
            return inside[0];
        }
        const b = new RSegment.Block(segment.coordinate, inside, macroReturnValue);
        b.hasScope = false;
        return b;
    }
    if (segment instanceof Segment.StructDefine) {
        const def: { [key: string]: Type } = {};
        for (const key in segment.inside) {
            def[key] = typeCalc.getTypeWithName(segment.inside[key], context);
        }
        pools.pushSymbol("Struct", segment.structName, new Struct(segment.structName.value, def), namespace);
        return new RSegment.Empty(segment.coordinate);
    }
    if (segment instanceof Segment.If) {
        let valueWrapper: RSegment.ValueWrapper | undefined;
        const condition = preprocessValue(segment.condition, coordinateChain, requirement, context);
        if (condition instanceof RSegment.EmptyValue) {
            reportError();
            return new RSegment.Empty(segment.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...segment.condition.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.Empty(segment.coordinate);
        }
        if (condition.isMacro) {
            let c1 = condition;
            if (c1 instanceof RSegment.ValueWrapper) {
                if (c1.codes) {
                    const vw = c1;
                    if (!vw.value) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...c1.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.Empty(segment.coordinate);
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
                    if (!c1.value) {
                        api.logger.error(LOG_ERROR.missingType(), {
                            ...c1.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new RSegment.Empty(segment.coordinate);
                    }
                    c1 = c1.value;
                }
            }
            let va = typeCalc.valueToObj(c1, {
                ...c1.coordinate,
                chain: coordinateChain
            }, { api });
            let statement: RSegment.SegmentInterface;
            if (va) {
                statement = preprocessSegment(segment.statement, coordinateChain, requirement, context);
            } else {
                if (segment.elseStatement) {
                    statement = preprocessSegment(segment.elseStatement, coordinateChain, requirement, context);
                } else {
                    if (valueWrapper) {
                        return valueWrapper;
                    }
                    return new RSegment.Empty(segment.coordinate);
                }
            }
            if (statement instanceof RSegment.Empty) {
                if (valueWrapper) {
                    return valueWrapper;
                }
                return new RSegment.Empty(segment.coordinate);
            } else {
                if (valueWrapper) {
                    return new RSegment.ValueWrapper(segment.coordinate, BASE_TYPES.void, [valueWrapper, statement], {
                        isMacro: false,
                        hasScope: false
                    });
                }
                return statement;
            }
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement = preprocessSegment(segment.statement, coordinateChain, requirement, context);
            const elseStatement = segment.elseStatement ? preprocessSegment(segment.elseStatement, coordinateChain, requirement, context) : undefined;
            pools.popMacroScope();
            return new RSegment.If(segment.coordinate, condition, statement, elseStatement, undefined);
        }
    }
    if (segment instanceof Segment.For) {
        let codes: RSegment.SegmentInterface[] = [];
        pools.symbolTable.push(SYMBOL_SEPARATOR.scope);
        const statement1 = preprocessSegment(segment.statement1, coordinateChain, requirement, context);
        const condition = preprocessValue(segment.statement2, coordinateChain, requirement, context);
        if (condition instanceof RSegment.EmptyValue) {
            reportError();
            pools.popScope();
            return new RSegment.Empty(segment.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...segment.statement2.coordinate,
                chain: coordinateChain
            });
            reportError();
            pools.popScope();
            return new RSegment.Empty(segment.coordinate);
        }
        if (constStatement && condition.isMacro) {
            let c1 = condition;
            let macroReturnValue: RSegment.Value | undefined;
            let whileCount = 0;
            while (true) {
                whileCount++;
                if (whileCount > 9999) {
                    api.logger.errorInterrupt(LOG_ERROR.infiniteLoop(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                }
                if (c1 instanceof RSegment.ValueWrapper) {
                    if (c1.codes) {
                        const vw = c1;
                        if (!vw.value) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.Empty(segment.coordinate);
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
                        if (!c1.value) {
                            api.logger.error(LOG_ERROR.missingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.Empty(segment.coordinate);
                        }
                        c1 = c1.value;
                    }
                }
                if (!typeCalc.valueToObj(c1, {
                    ...c1.coordinate,
                    chain: coordinateChain
                }, { api })) {
                    break;
                }
                let statement = preprocessSegment(segment.statement, coordinateChain, requirement, context);
                if (statement instanceof RSegment.Empty) {
                    codes.push(statement);
                }
                if (statement.macroReturnValue) {
                    macroReturnValue = statement.macroReturnValue;
                    break;
                }
                const statement3 = preprocessSegment(segment.statement3, coordinateChain, requirement, context);
                if (!(statement3 instanceof RSegment.Empty)) {
                    codes.push(statement3);
                }
                c1 = preprocessValue(segment.statement2, coordinateChain, requirement, context);
            }
            pools.popScope();
            return new RSegment.Block(segment.coordinate, codes, macroReturnValue);
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement3 = preprocessSegment(segment.statement3, coordinateChain, requirement, context);
            const statement = preprocessSegment(segment.statement, coordinateChain, requirement, context);
            pools.popMacroScope();
            pools.popScope();
            return new RSegment.For(segment.coordinate,
                statement1 instanceof RSegment.Empty || statement1 instanceof RSegment.EmptyValue ? undefined : statement1,
                condition,
                statement3 instanceof RSegment.Empty || statement3 instanceof RSegment.EmptyValue ? undefined : statement3,
                statement,
                undefined);
        }
    }
    if (segment instanceof Segment.While) {
        let codes: RSegment.SegmentInterface[] = [];
        const condition = preprocessValue(segment.condition, coordinateChain, requirement, context);
        if (condition instanceof RSegment.EmptyValue) {
            reportError();
            return new RSegment.Empty(segment.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...segment.condition.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new RSegment.Empty(segment.coordinate);
        }
        if (constStatement && condition.isMacro) {
            let c1 = condition;
            let macroReturnValue: RSegment.Value | undefined;
            let whileCount = 0;
            while (true) {
                whileCount++;
                if (whileCount > 9999) {
                    api.logger.errorInterrupt(LOG_ERROR.infiniteLoop(), {
                        ...segment.coordinate,
                        chain: coordinateChain
                    });
                }
                if (c1 instanceof RSegment.ValueWrapper) {
                    if (c1.codes) {
                        const vw = c1;
                        if (!vw.value) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.Empty(segment.coordinate);
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
                        if (!c1.value) {
                            api.logger.error(LOG_ERROR.missingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new RSegment.Empty(segment.coordinate);
                        }
                        c1 = c1.value;
                    }
                }

                if (!typeCalc.valueToObj(c1, {
                    ...c1.coordinate,
                    chain: coordinateChain
                }, { api })) {
                    break;
                }
                let statement = preprocessSegment(segment.statement, coordinateChain, requirement, context);
                if (!(statement instanceof RSegment.Empty)) {
                    codes.push(statement);
                }
                if (statement.macroReturnValue) {
                    macroReturnValue = statement.macroReturnValue;
                    break;
                }
                c1 = preprocessValue(segment.condition, coordinateChain, requirement, context);
            }
            return new RSegment.Block(segment.coordinate, codes, macroReturnValue);
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...segment.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement = preprocessSegment(segment.statement, coordinateChain, requirement, context);
            pools.popMacroScope();
            return new RSegment.While(segment.coordinate, condition, statement, undefined);
        }
    }
    if (segment instanceof Segment.Namespace) {
        const ns = [...namespace, ...segment.namespaceName.namespaces, segment.namespaceName.value];
        const inside: RSegment.SegmentInterface[] = [];
        let macroReturnValue: RSegment.Value | undefined;
        for (const insideSegment of segment.block.inside) {
            const s = preprocessSegment(insideSegment, coordinateChain, requirement, {
                ...context,
                namespace: ns
            });
            if (!(s instanceof RSegment.Empty)) {
                inside.push(s);
            }
            if (s.macroReturnValue) {
                macroReturnValue = s.macroReturnValue;
                break;
            }
        }
        if (inside.length == 0) {
            return new RSegment.Empty(segment.coordinate);
        }
        if (inside.length == 1) {
            return inside[0];
        }
        const b = new RSegment.Block(segment.coordinate, inside, macroReturnValue);
        b.hasScope = false;
        return b;
    }
    if (segment instanceof Segment.Using) {
        const symbol = pools.getSymbol(segment.definingName, {
            ...segment.definingName.coordinate,
            chain: coordinateChain
        }, { api, namespace });
        pools.symbolTable.push({
            ...symbol,
            name: segment.definingName.value
        });
        return new RSegment.Empty(segment.coordinate);
    }
    if (segment instanceof Segment.UsingNamespace) {
        const ns = segment.namespaceName.namespaces.join("_") + "_";
        for (const symbol of pools.symbolTable) {
            if (symbol.name.startsWith(ns)) {
                pools.symbolTable.push({
                    ...symbol,
                    name: symbol.name.slice(ns.length)
                });
            }
        }
        return new RSegment.Empty(segment.coordinate);
    }
    if (segment instanceof Segment.Return) {
        if (pools.returnTypeStack.length == 0) {
            api.logger.error(LOG_ERROR.returnOutsideFunction(), segment.coordinate);
            reportError();
            return new RSegment.Empty(segment.coordinate);
        }
        if (!segment.value) {
            return new RSegment.Return(segment.coordinate, undefined, true);
        }
        const value = preprocessValue(segment.value, coordinateChain, requirement, context);
        if (typeCalc.equalsTo(value.valueType, BASE_TYPES.void)) {
            api.logger.error(LOG_ERROR.mismatchingType(), segment.coordinate);
            reportError();
            return new RSegment.Return(segment.coordinate, undefined, true);
        }
        if (typeCalc.contains(value.valueType, pools.returnTypeStack[pools.returnTypeStack.length - 1].type)) {
            pools.returnTypeStack[pools.returnTypeStack.length - 1].cnt++;
        } else {
            api.logger.error(LOG_ERROR.mismatchingType(), segment.coordinate);
            reportError();
        }
        return new RSegment.Return(segment.coordinate, value, value.isMacro);
    }
    const value = preprocessValue(segment, coordinateChain, requirement, context);
    if (value instanceof RSegment.EmptyValue) {
        reportError();
        return new RSegment.Empty(segment.coordinate);
    }
    if (value.isMacro && !(value instanceof RSegment.ValueWrapper)) {
        return new RSegment.Empty(segment.coordinate);
    }
    return value;
}