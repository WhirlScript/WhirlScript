import { PTN } from "../../types/parser/ptn";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";
import Pools, { SYMBOL_SEPARATOR } from "../../util/parser/pools";
import { ASTN } from "../../types/parser/astn";
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
import Name = PTN.Name;

export default function preprocessSegment(
    parseTreeRaw: PTN.ParseTreeNode,
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
): ASTN.AbstractSyntaxTreeNode {
    const { api, pools, namespace } = context;
    let parseTree = parseTreeRaw;
    let annotations: Annotation[] = [];


    function reportError() {
        context.hasError.v = true;
    }

    let constStatement = false;
    let deprecated = false;
    let optional = false;
    if (parseTree instanceof PTN.AnnotationWrapper) {
        let sh = false;
        let bat = false;
        for (const annotation of parseTree.annotations) {
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
            return new ASTN.Empty({
                ...parseTree.coordinate,
                chain: coordinateChain
            });
        }
        parseTree = parseTree.value;
    }
    if (parseTree instanceof PTN.Empty) {
        return new ASTN.Empty({
            ...parseTree.coordinate,
            chain: coordinateChain
        });
    }
    if (parseTree instanceof PTN.ValDefine) {
        if (parseTree.props.native) {
            api.logger.error(LOG_ERROR.nativeVal(), {
                ...parseTree.coordinate,
                chain: coordinateChain
            });
            reportError();
        }
        if (!parseTree.valType && !parseTree.initialValue) {
            api.logger.error(LOG_ERROR.missingType(), {
                ...parseTree.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new ASTN.Empty(parseTree.coordinate);
        }
        let type: Type | undefined;
        if (parseTree.valType) {
            if (
                parseTree.valType.namespaces.length == 0 &&
                BASE_TYPES_NAME.indexOf(parseTree.valType.value) >= 0
            ) {
                type = {
                    type: "base",
                    base: <"string" | "boolean" | "int" | "void">parseTree.valType.value
                };
            } else {
                const t = pools.getSymbol(
                    parseTree.valType,
                    {
                        ...parseTree.valType.coordinate,
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
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
        }
        if (parseTree.props.macro) {
            if (parseTree.initialValue) {
                const i = preprocessValue(parseTree.initialValue, coordinateChain, requirement, context);
                if (i instanceof ASTN.EmptyValue) {
                    reportError();
                    return new ASTN.Empty(parseTree.coordinate);
                }
                if (typeCalc.equalsTo(i.valueType, BASE_TYPES.command)) {
                    api.logger.error(LOG_ERROR.disabledType(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new ASTN.Empty(parseTree.coordinate);
                }
                if (!i.isMacro) {
                    api.logger.error(LOG_ERROR.notMacro(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new ASTN.Empty(parseTree.coordinate);
                }
                if (type) {
                    if (!typeCalc.contains(i.valueType, type)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...parseTree.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new ASTN.Empty(parseTree.coordinate);
                    }
                } else {
                    type = i.valueType;
                }
                let i1 = i;
                let iType = i1.valueType;
                if (i1 instanceof ASTN.ValueWrapper) {
                    if ((<ASTN.ValueWrapper>i1).codes) {
                        const vw = <ASTN.ValueWrapper>i1;
                        if (!vw.value) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new ASTN.Empty(parseTree.coordinate);
                        }
                        if (!typeCalc.contains(iType, type)) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new ASTN.Empty(parseTree.coordinate);
                        }
                        const val = new MacroVal(type, {
                                isConst: !parseTree.props.var,
                                deprecated
                            },
                            <ASTN.Value>vw.value);
                        pools.pushSymbol(
                            "MacroVal",
                            parseTree.valName,
                            val,
                            namespace
                        );
                        vw.isMacro = false;
                        vw.value = undefined;
                        return vw;
                    } else {
                        if (!(<ASTN.ValueWrapper>i1).value) {
                            api.logger.error(LOG_ERROR.missingType(), {
                                ...i1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new ASTN.Empty(parseTree.coordinate);
                        }
                        i1 = <ASTN.Value>(<ASTN.ValueWrapper>i1).value;
                    }
                }
                if (i1 instanceof ASTN.MacroValCall) {
                    if ((<ASTN.MacroValCall>i).val.value) {
                        i1 = <ASTN.Value>(<ASTN.MacroValCall>i).val.value;
                    } else {
                        api.logger.error(LOG_ERROR.useBeforeInit(), {
                            ...i.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new ASTN.Empty(parseTree.coordinate);
                    }
                }
                const v = MacroVal.fromValue(i1, !parseTree.props.var, { api });
                const val = new MacroVal(type, {
                        isConst: !parseTree.props.var,
                        deprecated
                    },
                    v.val.value
                );
                pools.pushSymbol("MacroVal", parseTree.valName, val, namespace);

                if (v.wrapper) {
                    v.wrapper.valueType = val.type;
                    v.wrapper.value = val.value;
                    return v.wrapper;
                }
                return new ASTN.Empty(parseTree.coordinate);
            } else {
                if (!type) {
                    api.logger.error(LOG_ERROR.missingType(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new ASTN.Empty(parseTree.coordinate);
                }
                if (!parseTree.props.var) {
                    api.logger.error(LOG_ERROR.missingInitialValue(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                }
                const val = new MacroVal(type, {
                        isConst: !parseTree.props.var,
                        deprecated
                    }
                );
                pools.pushSymbol("MacroVal", parseTree.valName, val, namespace);
            }
        } else {
            const i = parseTree.initialValue ? preprocessValue(parseTree.initialValue, coordinateChain, requirement, context) : undefined;
            if (i) {
                if (i instanceof ASTN.EmptyValue) {
                    reportError();
                    return new ASTN.Empty(parseTree.coordinate);
                }
                if (typeCalc.equalsTo(i.valueType, BASE_TYPES.command)) {
                    api.logger.error(LOG_ERROR.disabledType(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new ASTN.Empty(parseTree.coordinate);
                }
                if (type && !typeCalc.contains(i.valueType, type)) {
                    api.logger.error(LOG_ERROR.mismatchingType(), {
                        ...parseTree.coordinate,
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
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    return new ASTN.Empty(parseTree.coordinate);
                }
                if (!parseTree.props.var) {
                    api.logger.error(LOG_ERROR.missingInitialValue(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                }
            }

            const val = new Val(parseTree.valName.value, {
                ...parseTree.coordinate,
                chain: coordinateChain
            }, type, {
                isConst: !parseTree.props.var,
                optional,
                deprecated
            });
            pools.renamePool.push(val.name);
            pools.pushDefinePool(val);

            pools.pushSymbol("Val", parseTree.valName, val, namespace);

            if (i) {
                val.isInit = true;
                return new ASTN.ExpressionSVO(parseTree.coordinate, new ASTN.ValCall(parseTree.coordinate, val), "=", i, type);
            } else {
                return new ASTN.Empty(parseTree.coordinate);
            }

        }
    }
    if (parseTree instanceof PTN.FunctionDefine) {
        if (pools.flags.defineFunction) {
            api.logger.error(LOG_ERROR.functionInFunction(), {
                ...parseTree.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new ASTN.Empty(parseTree.coordinate);
        }
        pools.flags.defineFunction = true;
        type Arg = {
            name: string,
            type: Type,
            isMacro: boolean,
            defaultValue?: ASTN.Value
        }
        const args: Arg[] = [];
        const codes: ASTN.AbstractSyntaxTreeNode[] = [];
        for (const arg of parseTree.args) {
            if (!arg.valType) {
                api.logger.error(LOG_ERROR.missingType(), {
                    ...arg.coordinate,
                    chain: coordinateChain
                });
                reportError();
                pools.flags.defineFunction = false;
                return new ASTN.Empty(parseTree.coordinate);
            }
            let isMacro = arg.props.macro;
            if (!parseTree.props.macro && arg.props.macro) {
                api.logger.warning(LOG_WARNING.macroArgInRuntimeFunction(), {
                    ...arg.coordinate,
                    chain: coordinateChain
                });
                isMacro = false;
            }
            let type = typeCalc.getTypeWithName(arg.valType, context);
            if (arg.initialValue) {
                let i = preprocessValue(arg.initialValue, coordinateChain, requirement, context);
                if (i instanceof ASTN.EmptyValue) {
                    reportError();
                    pools.flags.defineFunction = false;
                    return new ASTN.Empty(parseTree.coordinate);
                }

                if (arg.props.macro && !i.isMacro) {
                    api.logger.error(LOG_ERROR.notMacro(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    pools.flags.defineFunction = false;
                    return new ASTN.Empty(parseTree.coordinate);
                }
                if (i.isMacro) {
                    let t = i.valueType;
                    if (i instanceof ASTN.ValueWrapper) {
                        if (i.codes) {
                            const vw = i;
                            if (!vw.value) {
                                api.logger.error(LOG_ERROR.mismatchingType(), {
                                    ...i.coordinate,
                                    chain: coordinateChain
                                });
                            }
                            i = <ASTN.Value>vw.value;
                            codes.push(...vw.codes);
                        }
                        if (!(<ASTN.ValueWrapper>i).value) {
                            api.logger.error(LOG_ERROR.reallyWeird(), {
                                ...i.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            pools.flags.defineFunction = false;
                            return new ASTN.Empty(parseTree.coordinate);
                        }
                        if (!typeCalc.equalsTo(t, i.valueType)) {
                            if (typeCalc.equalsTo(t, BASE_TYPES.boolean)) {
                                const str = (<ASTN.MacroBase>i).toStr().value;
                                if (str == "1") {
                                    i = new ASTN.Bool(i.coordinate, true);
                                } else if (str == "0") {
                                    i = new ASTN.Bool(i.coordinate, false);
                                } else {
                                    api.logger.error(LOG_ERROR.mismatchingType(), {
                                        ...i.coordinate,
                                        chain: coordinateChain
                                    });
                                    reportError();
                                    i = new ASTN.Bool(i.coordinate, true);
                                }
                            } else if (typeCalc.equalsTo(t, BASE_TYPES.int)) {
                                if (i instanceof ASTN.Bool) {
                                    i = i.toInt();
                                } else {
                                    const num = Number((<ASTN.MacroBase>i).toStr().value);
                                    if (isNaN(num)) {
                                        api.logger.error(LOG_ERROR.mismatchingType(), {
                                            ...i.coordinate,
                                            chain: coordinateChain
                                        });
                                        i = new ASTN.Int(i.coordinate, 0);
                                    } else {
                                        i = new ASTN.Int(i.coordinate, num);
                                    }
                                }
                            } else {
                                i = (<ASTN.MacroBase>i).toStr();
                            }
                        }
                    }
                    if (i instanceof ASTN.MacroValCall) {
                        if (i.val.value) {
                            i = i.val.value;
                        } else {
                            api.logger.error(LOG_ERROR.useBeforeInit(), {
                                ...i.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new ASTN.Empty(parseTree.coordinate);
                        }
                    }

                    if (!typeCalc.contains(t, type)) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...i.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        pools.flags.defineFunction = false;
                        return new ASTN.Empty(parseTree.coordinate);
                    }
                }
                if (typeCalc.equalsTo(type, BASE_TYPES.command)) {
                    api.logger.error(LOG_ERROR.disabledType(), {
                        ...i.coordinate,
                        chain: coordinateChain
                    });
                    reportError();
                    pools.flags.defineFunction = false;
                    return new ASTN.Empty(parseTree.coordinate);
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
                    return new ASTN.Empty(parseTree.coordinate);
                }
                type = typeCalc.getTypeWithName(arg.valType, context);
                args.push({
                    name: arg.valName.value,
                    type: type,
                    isMacro: isMacro
                });
            }
        }
        const returnType = parseTree.functionType ? typeCalc.getTypeWithName(parseTree.functionType, context) : BASE_TYPES.void;
        if (!parseTree.block) {
            pools.flags.defineFunction = false;
            return new ASTN.Empty(parseTree.coordinate);
            //TODO-implement native function
        }
        if (parseTree.props.macro) {
            pools.flags.defineFunction = false;
            const func = new MacroFunc(parseTree.functionName.value, parseTree.coordinate, returnType, args, parseTree.block, {
                deprecated,
                hasScope: !(annotations.indexOf(BUILTIN_ANNOTATIONS["@noScope"]) >= 0),
                isConstexpr: annotations.indexOf(BUILTIN_ANNOTATIONS["@constexpr"]) >= 0
            }, pools.symbolTable.length);
            pools.pushSymbol("MacroFunction", parseTree.functionName, func, namespace);
            if (codes.length == 0) {
                return new ASTN.Empty(parseTree.coordinate);
            }
            if (codes.length == 1) {
                return codes[0];
            }
            return new ASTN.Block(parseTree.coordinate, codes, undefined).noScope();
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
                ...parseTree.coordinate,
                chain: coordinateChain
            }, arg.type, {
                isConst: false,
                optional: false,
                deprecated: false
            });
            val.isInit = true;
            pools.renamePool.push(val.name);
            pools.pushSymbol("Val", new Name(parseTree.coordinate, arg.name), val, []);
            pools.pushDefinePool(val);
        }
        const body = preprocessSegment(parseTree.block, coordinateChain, requirement, context);
        for (const e of (<(Val | Func)[]>pools.definePool.pop())) {
            if (!e.used && !e.prop.optional) {
                api.logger.warning(LOG_WARNING.notUsed(e.name.v), {
                    ...e.coordinate,
                    chain: coordinateChain
                });
            }
        }
        beforeReturn();
        const func = new Func(parseTree.functionName.value, {
                ...parseTree.coordinate,
                chain: coordinateChain
            }, <(Val | Func)[]>pools.requirePool.pop(), returnType, args,
            body instanceof ASTN.Block ? body : new ASTN.Block(parseTree.coordinate, [body], undefined), {
                deprecated,
                optional
            });
        pools.pushSymbol("Function", parseTree.functionName, func, namespace);
        pools.renamePool.push(func.name);
        pools.pushDefinePool(func);
        return new ASTN.Empty(parseTree.coordinate);
        //TODO
        // return value: unwrap, check, ?
    }
    if (parseTree instanceof PTN.Block) {
        const inside: ASTN.AbstractSyntaxTreeNode[] = [];
        let macroReturnValue: ASTN.Value | undefined;
        pools.symbolTable.push(SYMBOL_SEPARATOR.scope);
        for (const insideSegment of parseTree.inside) {
            const s = preprocessSegment(insideSegment, coordinateChain, requirement, context);
            if (!(s instanceof ASTN.Empty)) {
                inside.push(s);
            }
            if (s.macroReturnValue) {
                macroReturnValue = s.macroReturnValue;
                break;
            }
        }
        pools.popScope();
        if (inside.length == 0) {
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (inside.length == 1) {
            return inside[0];
        }
        const b = new ASTN.Block(parseTree.coordinate, inside, macroReturnValue);
        b.hasScope = false;
        return b;
    }
    if (parseTree instanceof PTN.StructDefine) {
        const def: { [key: string]: Type } = {};
        for (const key in parseTree.inside) {
            def[key] = typeCalc.getTypeWithName(parseTree.inside[key], context);
        }
        pools.pushSymbol("Struct", parseTree.structName, new Struct(parseTree.structName.value, def), namespace);
        return new ASTN.Empty(parseTree.coordinate);
    }
    if (parseTree instanceof PTN.If) {
        let valueWrapper: ASTN.ValueWrapper | undefined;
        const condition = preprocessValue(parseTree.condition, coordinateChain, requirement, context);
        if (condition instanceof ASTN.EmptyValue) {
            reportError();
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...parseTree.condition.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (condition.isMacro) {
            let c1 = condition;
            if (c1 instanceof ASTN.ValueWrapper) {
                if (c1.codes) {
                    const vw = c1;
                    if (!vw.value) {
                        api.logger.error(LOG_ERROR.mismatchingType(), {
                            ...c1.coordinate,
                            chain: coordinateChain
                        });
                        reportError();
                        return new ASTN.Empty(parseTree.coordinate);
                    }
                    if ((<ASTN.Bool>vw.value).value) {
                        c1 = <ASTN.Bool>vw.value;
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
                        return new ASTN.Empty(parseTree.coordinate);
                    }
                    c1 = c1.value;
                }
            }
            let va = typeCalc.valueToObj(c1, {
                ...c1.coordinate,
                chain: coordinateChain
            }, { api });
            let statement: ASTN.AbstractSyntaxTreeNode;
            if (va) {
                statement = preprocessSegment(parseTree.statement, coordinateChain, requirement, context);
            } else {
                if (parseTree.elseStatement) {
                    statement = preprocessSegment(parseTree.elseStatement, coordinateChain, requirement, context);
                } else {
                    if (valueWrapper) {
                        return valueWrapper;
                    }
                    return new ASTN.Empty(parseTree.coordinate);
                }
            }
            if (statement instanceof ASTN.Empty) {
                if (valueWrapper) {
                    return valueWrapper;
                }
                return new ASTN.Empty(parseTree.coordinate);
            } else {
                if (valueWrapper) {
                    return new ASTN.ValueWrapper(parseTree.coordinate, BASE_TYPES.void, [valueWrapper, statement], {
                        isMacro: false,
                        hasScope: false
                    });
                }
                return statement;
            }
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement = preprocessSegment(parseTree.statement, coordinateChain, requirement, context);
            const elseStatement = parseTree.elseStatement ? preprocessSegment(parseTree.elseStatement, coordinateChain, requirement, context) : undefined;
            pools.popMacroScope();
            return new ASTN.If(parseTree.coordinate, condition, statement, elseStatement, undefined);
        }
    }
    if (parseTree instanceof PTN.For) {
        let codes: ASTN.AbstractSyntaxTreeNode[] = [];
        pools.symbolTable.push(SYMBOL_SEPARATOR.scope);
        const statement1 = preprocessSegment(parseTree.statement1, coordinateChain, requirement, context);
        const condition = preprocessValue(parseTree.statement2, coordinateChain, requirement, context);
        if (condition instanceof ASTN.EmptyValue) {
            reportError();
            pools.popScope();
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...parseTree.statement2.coordinate,
                chain: coordinateChain
            });
            reportError();
            pools.popScope();
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (constStatement && condition.isMacro) {
            let c1 = condition;
            let macroReturnValue: ASTN.Value | undefined;
            let whileCount = 0;
            while (true) {
                whileCount++;
                if (whileCount > 9999) {
                    api.logger.errorInterrupt(LOG_ERROR.infiniteLoop(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                }
                if (c1 instanceof ASTN.ValueWrapper) {
                    if (c1.codes) {
                        const vw = c1;
                        if (!vw.value) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new ASTN.Empty(parseTree.coordinate);
                        }
                        if ((<ASTN.Bool>vw.value).value) {
                            c1 = <ASTN.Bool>vw.value;
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
                            return new ASTN.Empty(parseTree.coordinate);
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
                let statement = preprocessSegment(parseTree.statement, coordinateChain, requirement, context);
                if (statement instanceof ASTN.Empty) {
                    codes.push(statement);
                }
                if (statement.macroReturnValue) {
                    macroReturnValue = statement.macroReturnValue;
                    break;
                }
                const statement3 = preprocessSegment(parseTree.statement3, coordinateChain, requirement, context);
                if (!(statement3 instanceof ASTN.Empty)) {
                    codes.push(statement3);
                }
                c1 = preprocessValue(parseTree.statement2, coordinateChain, requirement, context);
            }
            pools.popScope();
            return new ASTN.Block(parseTree.coordinate, codes, macroReturnValue);
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement3 = preprocessSegment(parseTree.statement3, coordinateChain, requirement, context);
            const statement = preprocessSegment(parseTree.statement, coordinateChain, requirement, context);
            pools.popMacroScope();
            pools.popScope();
            return new ASTN.For(parseTree.coordinate,
                statement1 instanceof ASTN.Empty || statement1 instanceof ASTN.EmptyValue ? undefined : statement1,
                condition,
                statement3 instanceof ASTN.Empty || statement3 instanceof ASTN.EmptyValue ? undefined : statement3,
                statement,
                undefined);
        }
    }
    if (parseTree instanceof PTN.While) {
        let codes: ASTN.AbstractSyntaxTreeNode[] = [];
        const condition = preprocessValue(parseTree.condition, coordinateChain, requirement, context);
        if (condition instanceof ASTN.EmptyValue) {
            reportError();
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (!typeCalc.equalsTo(condition.valueType, BASE_TYPES.boolean)) {
            api.logger.error(LOG_ERROR.mismatchingType(), {
                ...parseTree.condition.coordinate,
                chain: coordinateChain
            });
            reportError();
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (constStatement && condition.isMacro) {
            let c1 = condition;
            let macroReturnValue: ASTN.Value | undefined;
            let whileCount = 0;
            while (true) {
                whileCount++;
                if (whileCount > 9999) {
                    api.logger.errorInterrupt(LOG_ERROR.infiniteLoop(), {
                        ...parseTree.coordinate,
                        chain: coordinateChain
                    });
                }
                if (c1 instanceof ASTN.ValueWrapper) {
                    if (c1.codes) {
                        const vw = c1;
                        if (!vw.value) {
                            api.logger.error(LOG_ERROR.mismatchingType(), {
                                ...c1.coordinate,
                                chain: coordinateChain
                            });
                            reportError();
                            return new ASTN.Empty(parseTree.coordinate);
                        }
                        if ((<ASTN.Bool>vw.value).value) {
                            c1 = <ASTN.Bool>vw.value;
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
                            return new ASTN.Empty(parseTree.coordinate);
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
                let statement = preprocessSegment(parseTree.statement, coordinateChain, requirement, context);
                if (!(statement instanceof ASTN.Empty)) {
                    codes.push(statement);
                }
                if (statement.macroReturnValue) {
                    macroReturnValue = statement.macroReturnValue;
                    break;
                }
                c1 = preprocessValue(parseTree.condition, coordinateChain, requirement, context);
            }
            return new ASTN.Block(parseTree.coordinate, codes, macroReturnValue);
        } else {
            if (constStatement) {
                api.logger.warning(LOG_WARNING.notExpandable(), {
                    ...parseTree.coordinate,
                    chain: coordinateChain
                });
            }
            pools.symbolTable.push(SYMBOL_SEPARATOR.macro);
            const statement = preprocessSegment(parseTree.statement, coordinateChain, requirement, context);
            pools.popMacroScope();
            return new ASTN.While(parseTree.coordinate, condition, statement, undefined);
        }
    }
    if (parseTree instanceof PTN.Namespace) {
        const ns = [...namespace, ...parseTree.namespaceName.namespaces, parseTree.namespaceName.value];
        const inside: ASTN.AbstractSyntaxTreeNode[] = [];
        let macroReturnValue: ASTN.Value | undefined;
        for (const insideSegment of parseTree.block.inside) {
            const s = preprocessSegment(insideSegment, coordinateChain, requirement, {
                ...context,
                namespace: ns
            });
            if (!(s instanceof ASTN.Empty)) {
                inside.push(s);
            }
            if (s.macroReturnValue) {
                macroReturnValue = s.macroReturnValue;
                break;
            }
        }
        if (inside.length == 0) {
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (inside.length == 1) {
            return inside[0];
        }
        const b = new ASTN.Block(parseTree.coordinate, inside, macroReturnValue);
        b.hasScope = false;
        return b;
    }
    if (parseTree instanceof PTN.Using) {
        const symbol = pools.getSymbol(parseTree.definingName, {
            ...parseTree.definingName.coordinate,
            chain: coordinateChain
        }, { api, namespace });
        pools.symbolTable.push({
            ...symbol,
            name: parseTree.definingName.value
        });
        return new ASTN.Empty(parseTree.coordinate);
    }
    if (parseTree instanceof PTN.UsingNamespace) {
        const ns = parseTree.namespaceName.namespaces.join("_") + "_";
        for (const symbol of pools.symbolTable) {
            if (symbol.name.startsWith(ns)) {
                pools.symbolTable.push({
                    ...symbol,
                    name: symbol.name.slice(ns.length)
                });
            }
        }
        return new ASTN.Empty(parseTree.coordinate);
    }
    if (parseTree instanceof PTN.Return) {
        if (pools.returnTypeStack.length == 0) {
            api.logger.error(LOG_ERROR.returnOutsideFunction(), parseTree.coordinate);
            reportError();
            return new ASTN.Empty(parseTree.coordinate);
        }
        if (!parseTree.value) {
            return new ASTN.Return(parseTree.coordinate, undefined, true);
        }
        const value = preprocessValue(parseTree.value, coordinateChain, requirement, context);
        if (typeCalc.equalsTo(value.valueType, BASE_TYPES.void)) {
            api.logger.error(LOG_ERROR.mismatchingType(), parseTree.coordinate);
            reportError();
            return new ASTN.Return(parseTree.coordinate, undefined, true);
        }
        if (typeCalc.contains(value.valueType, pools.returnTypeStack[pools.returnTypeStack.length - 1].type)) {
            pools.returnTypeStack[pools.returnTypeStack.length - 1].cnt++;
        } else {
            api.logger.error(LOG_ERROR.mismatchingType(), parseTree.coordinate);
            reportError();
        }
        return new ASTN.Return(parseTree.coordinate, value, value.isMacro);
    }
    const value = preprocessValue(parseTree, coordinateChain, requirement, context);
    if (value instanceof ASTN.EmptyValue) {
        reportError();
        return new ASTN.Empty(parseTree.coordinate);
    }
    if (value.isMacro && !(value instanceof ASTN.ValueWrapper)) {
        return new ASTN.Empty(parseTree.coordinate);
    }
    return value;
}