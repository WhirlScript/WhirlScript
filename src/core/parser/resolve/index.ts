import Deque from "../../util/deque";
import LightDeque from "../../util/lightDeque";
import Token from "../../types/parser/token";
import Pools from "../../util/parser/Pools";
import Api from "../../types/api";
import Coordinate from "../../types/parser/Coordinate";
import { Segment } from "../../types/parser/segment";
import LOG_ERROR from "../../logger/logError";
import CODE_TYPES from "../../types/parser/codeTypes";
import WORD_TEST from "../../util/wordTest";
import RawCode from "../../util/parser/rawCode";
import readFile from "../../util/api/readFile";
import tokenize from "../tokenize";

export default function resolve(tokens: Deque<Token>, context: {
    pools: Pools,
    api: Api
}): Deque<Segment.SegmentInterface> {
    const { pools, api } = context;
    const segments: Deque<Segment.SegmentInterface> = new Deque<Segment.SegmentInterface>();
    tokens.pushRear({
        value: "",
        coordinate: {
            file: "",
            line: -1,
            column: -1
        },
        flag: "EOF"
    });
    let cursor = tokens.peekFront();
    let hasError = false;

    function reportError() {
        hasError = true;
    }

    function pop(): Token {
        if (tokens.isEmpty()) {
            api.loggerApi.error(LOG_ERROR.unexpectedFileEnd(), cursor.coordinate, true);
        }
        let a = tokens.popFront();
        while (a.flag == "comment" || a.flag == "docs") { //TODO: resolve comment
            a = tokens.popFront();
        }
        return a;
    }

    function getExpression(): Segment.Value {
        const expr: Deque<Segment.Value | { type: "o", value: string, level: number }> = new Deque();
        const opLevel: LightDeque<number> = new LightDeque();// Operation levels
        let hLOperation: Token | undefined;// Hanging leading operation
        let hLAssertion: { type: Segment.Name, coordinate: Coordinate } | undefined;// Hanging leading assertion
        while (cursor.value != "," && cursor.value != ";" && cursor.value != ")" && cursor.value != "}") {
            if (cursor.value == "(") {
                if (!expr.isEmpty() && expr.peekRear()?.type != "o") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                cursor = pop();
                let exp = getExpression();
                if (hLAssertion) {
                    exp = new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, exp);
                    hLAssertion = undefined;
                }
                if (hLOperation) {
                    exp = new Segment.ExpressionVO(hLOperation.coordinate, hLOperation.value, exp);
                    hLOperation = undefined;
                }
                expr.pushRear(exp);
                if (cursor.value != ")") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                cursor = pop();
                continue;
            }
            if (cursor.value == "true") {
                if (hLOperation) {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate, true);
                }
                if (!expr.isEmpty() && expr.peekRear()?.type != "o") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                if (hLAssertion) {
                    expr.pushRear(new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, new Segment.Bool(cursor.coordinate, true)));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(new Segment.Bool(cursor.coordinate, true));
                }
                cursor = pop();
                continue;
            }
            if (cursor.value == "false") {
                if (hLOperation) {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate, true);
                }
                if (!expr.isEmpty() && expr.peekRear()?.type != "o") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                if (hLAssertion) {
                    expr.pushRear(new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, new Segment.Bool(cursor.coordinate, false)));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(new Segment.Bool(cursor.coordinate, false));
                }
                cursor = pop();
                continue;
            }
            if (WORD_TEST.isInt(cursor.value)) {
                if (hLOperation) {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate, true);
                }
                if (!expr.isEmpty() && expr.peekRear()?.type != "o") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                if (hLAssertion) {
                    expr.pushRear(new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, new Segment.Int(cursor.coordinate, parseInt(cursor.value))));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(new Segment.Int(cursor.coordinate, parseInt(cursor.value)));
                }
                cursor = pop();
                continue;
            }
            if (cursor.value == "\"" || cursor.value == "'") {
                if (hLOperation) {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate, true);
                }
                if (!expr.isEmpty() && expr.peekRear()?.type != "o") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                cursor = pop();
                if (hLAssertion) {
                    expr.pushRear(new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, new Segment.String(cursor.coordinate, cursor.value)));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(new Segment.String(cursor.coordinate, cursor.value));
                }
                pop(); // another ' | "
                cursor = pop();
                continue;
            }
            if (cursor.value == "`") {
                if (hLOperation) {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate, true);
                }
                if (!expr.isEmpty() && expr.peekRear()?.type != "o") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                const seg = new Segment.TemplateString(cursor.coordinate);
                cursor = pop();
                while (cursor.value != "`") {
                    if (cursor.flag == "string") {
                        seg.values.pushRear(new Segment.String(cursor.coordinate, cursor.value));
                        cursor = pop();
                    } else {
                        if (cursor.value == "${") {
                            cursor = pop();
                            seg.values.pushRear(getExpression());
                            if (cursor.value == "}") {
                                cursor = pop();
                                continue;
                            }
                            api.loggerApi.error(LOG_ERROR.notAnExpression(), cursor.coordinate, true);
                        }
                    }
                }
                if (hLAssertion) {
                    expr.pushRear(new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, seg));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(seg);
                }
                cursor = pop();
                continue;
            }
            if (cursor.value == "{") {
                if (hLOperation) {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate, true);
                }
                if (!expr.isEmpty() && expr.peekRear()?.type != "o") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                const coo = cursor.coordinate;
                cursor = pop();
                let end = false;
                const inside: { [key: string]: Segment.Value } = {};
                while (cursor.value != "}") {
                    if (end) {
                        api.loggerApi.error(LOG_ERROR.missingExpectedColon(), cursor.coordinate, false);
                        reportError();
                        end = false;
                    }
                    const n1 = cursor.value;
                    cursor = pop();
                    if (cursor.value != ":") {
                        api.loggerApi.error(LOG_ERROR.missingExpectedColon(), cursor.coordinate, false);
                        reportError();
                    } else {
                        cursor = pop();
                    }
                    inside[n1] = getExpression();
                    if (cursor.value != ",") {
                        end = true;
                    } else {
                        cursor = pop();
                    }
                }
                const seg = new Segment.StructBlock(coo, inside);
                if (hLAssertion) {
                    expr.pushRear(new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, seg));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(seg);
                }
                cursor = pop();
                continue;
            }
            if (cursor.flag == "operator") {
                if (hLOperation) {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate, true);
                }
                if (hLAssertion) {
                    api.loggerApi.error(LOG_ERROR.invalidAssertion(), hLAssertion.coordinate, true);
                }
                const level = (<{ [key: string]: number }>CODE_TYPES.operatorPrecedence)?.[cursor.value];
                if (level <= 2 && level >= 1) {
                    if (expr.isEmpty() || expr.peekRear()?.type == "o") {
                        hLOperation = cursor;
                    } else {
                        if (cursor.value == "!") {
                            api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                        }
                        const pref = <Segment.Value>expr.popRear();
                        expr.pushRear(new Segment.ExpressionSV(pref.coordinate, pref, cursor.value));
                    }
                    cursor = pop();
                    continue;
                }
                if (expr.isEmpty() || expr.peekRear()?.type == "o") {
                    if (cursor.value == "<") {
                        const coo = cursor.coordinate;
                        cursor = pop();
                        const n = getName();
                        if (hLAssertion == undefined) {
                            hLAssertion = {
                                coordinate: coo,
                                type: n
                            };
                        }
                        if (cursor.value != ">") {
                            api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                        }
                        cursor = pop();
                        continue;
                    }
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                if (opLevel.isEmpty()) {
                    opLevel.pushRear(level);
                    expr.pushRear({ type: "o", value: cursor.value, level });
                    cursor = pop();
                    continue;
                }
                if (opLevel.size() >= 1 && opLevel.peekRear() < level) {
                    while (opLevel.size() >= 1 && opLevel.peekRear() < level) {
                        const temp: Deque<Segment.Value | { type: "o", value: string, level: number }> = new Deque();
                        const levelPref = opLevel.peekRear();
                        temp.pushFront(expr.popRear());
                        while (!opLevel.isEmpty() && opLevel.peekRear() == levelPref) {
                            temp.pushFront(expr.popRear());
                            temp.pushFront(expr.popRear());
                            opLevel.popRear();
                        }
                        while (temp.size() > 1) {
                            temp.pushFront(
                                new Segment.ExpressionSVO(
                                    (<Segment.Value>temp.peekFront()).coordinate,
                                    <Segment.Value>temp.popFront(),
                                    (<{ type: "o", value: string, level: number }>temp.popFront()).value,
                                    <Segment.Value>temp.popFront()
                                )
                            );
                        }
                        expr.pushRear(<Segment.Value>temp.peekFront());
                    }
                    expr.pushRear({ type: "o", value: cursor.value, level });
                    cursor = pop();
                    continue;
                } else {
                    opLevel.pushRear(level);
                    expr.pushRear({ type: "o", value: cursor.value, level });
                    cursor = pop();
                    continue;
                }
            }
            if (cursor.flag == "word") {
                if (!expr.isEmpty() && expr.peekRear()?.type != "o") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                }
                const coo = cursor.coordinate;
                const n = getName();
                if (cursor.value == "(") {
                    cursor = pop();
                    const args: Segment.Value[] = [];
                    while (cursor.value != ")") {
                        args.push(getExpression());
                        if (cursor.value == "," || cursor.value == ")") {
                            continue;
                        }
                        api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                        // never goes below
                        return <Segment.FunctionCall>{};
                    }
                    cursor = pop();
                    let exp: Segment.Value = new Segment.FunctionCall(coo, n, args);
                    if (hLAssertion) {
                        exp = new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, exp);
                        hLAssertion = undefined;
                    }
                    expr.pushRear(exp);
                    continue;
                }
                let exp: Segment.Value = new Segment.ValCall(cursor.coordinate, n);
                if (hLOperation) {
                    exp = new Segment.ExpressionVO(hLOperation.coordinate, hLOperation.value, exp);
                    hLOperation = undefined;
                }
                if (hLAssertion) {
                    exp = new Segment.Assertion(hLAssertion.coordinate, hLAssertion.type, exp);
                    hLAssertion = undefined;
                }
                expr.pushRear(exp);
            }
        }
        while (opLevel.size() >= 1) {
            const temp: Deque<Segment.Value | { type: "o", value: string, level: number }> = new Deque();
            const levelPref = opLevel.peekRear();
            temp.pushFront(expr.popRear());
            while (opLevel.size() > 0 && opLevel.peekRear() == levelPref) {
                temp.pushFront(expr.popRear());
                temp.pushFront(expr.popRear());
                opLevel.popRear();
            }
            while (temp.size() > 1) {
                temp.pushFront(
                    new Segment.ExpressionSVO(
                        (<Segment.Value>temp.peekFront()).coordinate,
                        <Segment.Value>temp.popFront(),
                        (<{ type: "o", value: string, level: number }>temp.popFront()).value,
                        <Segment.Value>temp.popFront()
                    )
                );
            }
            expr.pushRear(<Segment.Value>temp.peekFront());
        }
        return <Segment.Value>expr.peekFront();
    }

    function getName(): Segment.Name {
        const s: string[] = [];
        const coo = cursor.coordinate;
        if (cursor.flag == "operator" || WORD_TEST.isInt(cursor.value)) {
            api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
            return new Segment.Name(coo, "", []);
        }
        s.push(cursor.value);
        cursor = pop();
        while (cursor.value == "::") {
            cursor = pop();
            if (cursor.flag == "operator" || WORD_TEST.isInt(cursor.value)) {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                return new Segment.Name(coo, "", []);
            }
            s.push(cursor.value);
            cursor = pop();
        }
        return new Segment.Name(coo, <string>s.pop(), s);
    }

    function getBlock(context: { block: number }): Segment.Block {
        const coo = cursor.coordinate;
        const statements: Segment.SegmentInterface[] = [];
        cursor = pop();
        while (cursor.value != "}") {
            statements.push(getStatement({ block: context.block + 1 }, {
                withBlock: true,
                isSingle: true,
                isBlock: true,
                withoutSemi: false
            }));
        }
        cursor = pop();
        return new Segment.Block(coo, statements);
    }

    function getStatement(context: { block: number }, requirements: {
        withBlock?: boolean,
        isBlock: boolean,
        isSingle: boolean //TODO: figure out when it will be false
        withoutSemi: boolean
    }): Segment.SegmentInterface {
        const { block } = context;
        const annotations: Segment.Annotation[] = [];

        // Empty `;`
        if (cursor.value == ";") {
            if (!requirements.isSingle) {
                api.loggerApi.error(LOG_ERROR.reallyWeird(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            cursor = pop();
            return new Segment.Empty(cursor.coordinate);
        }

        // Import `import "xxx";`
        if (cursor.value == "import") {
            if (!requirements.isSingle) {
                api.loggerApi.error(LOG_ERROR.reallyWeird(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            let valid = true;
            if (block > 0) {
                api.loggerApi.error(LOG_ERROR.importInBlock(), cursor.coordinate, false);
                reportError();
                valid = false;
            }
            const lineCoordinate = cursor.coordinate;
            cursor = pop();
            if (cursor.flag != "string") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, false);
                reportError();
                // valid = false;
            } else {
                const filePath = cursor.value;
                cursor = pop();
                if (requirements.withoutSemi || cursor.value != ";") {
                    api.loggerApi.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate, false);
                    reportError();
                    return new Segment.Empty(lineCoordinate);
                }
                if (!requirements.withoutSemi) {
                    cursor = pop();
                }
                if (pools.importPool.indexOf(filePath) >= 0) {
                    valid = false;
                }
                if (valid) {
                    const file = readFile(filePath, { api, coordinate: lineCoordinate });
                    if (!file.success) {
                        api.loggerApi.error(LOG_ERROR.unknownFile(filePath), lineCoordinate, false);
                        reportError();
                        return new Segment.Empty(lineCoordinate);
                    }
                    const tokensImported = tokenize(new RawCode({
                            coordinate: {
                                file: file.path,
                                line: 1,
                                column: 1,
                                chain: [...cursor.coordinate.chain ?? [], lineCoordinate]
                            },
                            value: file.value
                        }),
                        { api });
                    while (!tokensImported.isEmpty()) {
                        tokens.pushFront(tokensImported.popRear());
                    }
                }
            }
            return new Segment.Empty(lineCoordinate);
        }

        // Annotation `@xxx`
        while (cursor.value.startsWith("@")) {
            const coo = cursor.coordinate;
            annotations.push(new Segment.Annotation(coo, getName()));
            cursor = pop();
        }

        // Block `{...}`
        if (cursor.value == "{") {
            if (!requirements.isBlock) {
                api.loggerApi.error(LOG_ERROR.unexpectedBlock(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            if (annotations.length > 0) {
                return new Segment.AnnotationSegment(annotations, getBlock(context));
            }
            return getBlock(context);
        }

        // Struct `struct xxx {xxx: Xxx}`
        if (cursor.value == "struct") {
            if (!requirements.isBlock) {
                api.loggerApi.error(LOG_ERROR.unexpectedBlock(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            let valid = true;
            const inside: { [key: string]: Segment.Name } = {};
            cursor = pop();
            const n = getName();
            if (cursor.value != "{") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            cursor = pop();
            let end = false;
            while (cursor.value != "}") {
                if (end) {
                    api.loggerApi.error(LOG_ERROR.missingExpectedColon(), cursor.coordinate, false);
                    reportError();
                    valid = false;
                    end = false;
                }
                const n1 = cursor.value;
                cursor = pop();
                if (cursor.value != ":") {
                    api.loggerApi.error(LOG_ERROR.missingExpectedColon(), cursor.coordinate, false);
                    reportError();
                    valid = false;
                } else {
                    cursor = pop();
                }
                inside[n1] = getName();
                if (cursor.value != ",") {
                    end = true;
                } else {
                    cursor = pop();
                }
            }
            cursor = pop();
            if (valid) {
                return new Segment.StructDefine(coo, n, inside);
            } else {
                return new Segment.Empty(coo);
            }
        }

        // Var define & function define
        const definingProps = {
            native: false,
            macro: false
        };
        let nativeCoo: Coordinate | undefined;
        let macroCoo: Coordinate | undefined;
        if (cursor.value == "native") {
            definingProps.native = true;
            cursor = pop();
        }
        if (cursor.value == "macro") {
            definingProps.macro = true;
            cursor = pop();
        }

        // Var Define `var xxx: Xxx = xxx;`
        if (cursor.value == "var" || cursor.value == "const") {
            if (!requirements.isSingle) {
                api.loggerApi.error(LOG_ERROR.reallyWeird(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            const valProps = {
                var: false
            };
            if (cursor.value == "var") {
                valProps.var = true;
            }
            cursor = pop();
            const n = getName();
            let t: Segment.Name | undefined;
            let v: Segment.Value | undefined;
            if (cursor.value == ":") {
                cursor = pop();
                t = getName();
            }
            if (cursor.value == "=") {
                cursor = pop();
                v = getExpression();
            }
            if (requirements.withoutSemi || cursor.value != ";") {
                api.loggerApi.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate, false);
                reportError();
            } else {
                if (!requirements.withoutSemi) {
                    cursor = pop();
                }
            }
            return new Segment.ValDefine(coo, n, t, { ...definingProps, ...valProps }, v);
        }

        // Function Define `function xxx(xxx: Xxx): Xxx { xxx; }`
        if (cursor.value == "function") {
            if (!requirements.isBlock) {
                api.loggerApi.error(LOG_ERROR.unexpectedBlock(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            const n = getName();
            const args: Segment.ValDefine[] = [];
            let t: Segment.Name | undefined;
            if (cursor.value != "(") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                return new Segment.Empty(coo);
            }
            cursor = pop();
            while (cursor.value != ")") {
                const n = getName();
                let t: Segment.Name | undefined;
                let v: Segment.Value | undefined;
                if (cursor.value == ":") {
                    cursor = pop();
                    t = getName();
                }
                if (cursor.value == "=") {
                    cursor = pop();
                    v = getExpression();
                }
                if (cursor.value != "," && cursor.value != ")") {
                    api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate, true);
                    return new Segment.Empty(coo);
                }
                if (cursor.value == ",") {
                    cursor = pop();
                }
                args.push(new Segment.ValDefine(coo, n, t, { native: false, macro: false, var: true }, v));
            }
            cursor = pop();
            if (cursor.value == ":") {
                cursor = pop();
                t = getName();
            }
            if (cursor.value == ";") {
                cursor = pop();
                return new Segment.FunctionDefine(coo, n, t, args);
            } else {
                const block = getBlock({ block: context.block + 1 });
                return new Segment.FunctionDefine(coo, n, t, args, block);
            }
        }

        // if not defining...
        if (definingProps.native && nativeCoo) {
            api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken("native"), nativeCoo, false);
            reportError();
        }
        if (definingProps.macro && macroCoo) {
            api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken("native"), macroCoo, false);
            reportError();
        }

        // If `if (xxx) xxx;` `else xxx;`
        if (cursor.value == "if") {
            if (!requirements.isBlock) {
                api.loggerApi.error(LOG_ERROR.unexpectedBlock(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            if (cursor.value != "(") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo, true);
                return new Segment.Empty(coo);
            }
            cursor = pop();
            const condition = getExpression();
            if (cursor.value != ")") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo, true);
                return new Segment.Empty(coo);
            }
            cursor = pop();
            const statement = getStatement(context, {
                withBlock: true,
                isBlock: true,
                isSingle: true,
                withoutSemi: false
            });
            let elseStatement: Segment.SegmentInterface | undefined;
            if (cursor.value == "else") {
                cursor = pop();
                elseStatement = getStatement(context, {
                    withBlock: true,
                    isBlock: true,
                    isSingle: true,
                    withoutSemi: false
                });
            }
            return new Segment.If(coo, condition, statement, elseStatement);
        }

        // For `for (xxx; xxx; xxx) xxx;`
        if (cursor.value == "for") {
            if (!requirements.isBlock) {
                api.loggerApi.error(LOG_ERROR.unexpectedBlock(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            if (cursor.value != "(") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo, true);
                return new Segment.Empty(coo);
            }
            cursor = pop();
            const statement1 = getStatement(context, {
                withBlock: true,
                isSingle: true,
                isBlock: false,
                withoutSemi: false
            });
            const statement2 = getStatement(context, {
                withBlock: true,
                isSingle: true,
                isBlock: false,
                withoutSemi: false
            });
            let statement3: Segment.SegmentInterface = new Segment.Empty(cursor.coordinate);
            if (cursor.value != ")") {
                statement3 = getStatement(context, {
                    withBlock: true,
                    isSingle: true,
                    isBlock: false,
                    withoutSemi: true
                });
            }
            if (cursor.value != ")") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo, true);
                return new Segment.Empty(coo);
            }
            cursor = pop();
            const statement = getStatement(context, {
                withBlock: true,
                isBlock: true,
                isSingle: true,
                withoutSemi: false
            });
            return new Segment.For(coo, statement1, statement2, statement3, statement);
        }

        // While `while (xxx) xxx;`
        if (cursor.value == "while") {
            if (!requirements.isBlock) {
                api.loggerApi.error(LOG_ERROR.unexpectedBlock(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            if (cursor.value != "(") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo, true);
                return new Segment.Empty(coo);
            }
            cursor = pop();
            const condition = getExpression();
            if (cursor.value != ")") {
                api.loggerApi.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo, true);
                return new Segment.Empty(coo);
            }
            cursor = pop();
            const statement = getStatement(context, {
                withBlock: true,
                isBlock: true,
                isSingle: true,
                withoutSemi: false
            });
            return new Segment.While(coo, condition, statement);
        }

        // Namespace `namespace xx { xxx; }`
        if (cursor.value == "namespace") {
            if (!requirements.isBlock) {
                api.loggerApi.error(LOG_ERROR.unexpectedBlock(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            const n = getName();
            cursor = pop();
            const block = getBlock(context);
            return new Segment.Namespace(coo, n, block);
        }

        // Using
        if (cursor.value == "using") {
            if (!requirements.isSingle) {
                api.loggerApi.error(LOG_ERROR.reallyWeird(), cursor.coordinate, true);
                return new Segment.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();

            // `using namespace xxx;`
            if (cursor.value == "namespace") {
                cursor = pop();
                const n = getName();
                return new Segment.UsingNamespace(coo, n);
            }

            // `using xxx;`
            const n = getName();
            if (cursor.value != ";") {
                api.loggerApi.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate, false);
                reportError();
            } else {
                cursor = pop();
            }
            return new Segment.Using(coo, n);
        }

        // xxx;
        const expr = getExpression();
        if (!requirements.withoutSemi) {
            if (cursor.value != ";") {
                api.loggerApi.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate, false);
                reportError();
            } else {
                cursor = pop();
            }
        }
        return expr;
    }

    while (cursor.flag != "EOF") {
        segments.pushRear(getStatement({ block: 0 }, {
            withBlock: true,
            isBlock: true,
            isSingle: true,
            withoutSemi: false
        }));
    }

    if (hasError) {
        throw new Error();
    }

    return segments;
}
