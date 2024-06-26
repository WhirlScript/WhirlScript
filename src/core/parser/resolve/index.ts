import Deque from "../../util/deque";
import LightDeque from "../../util/lightDeque";
import Token from "../../types/parser/token";
import ApiWrapper from "../../types/api/apiWrapper";
import Coordinate from "../../types/parser/coordinate";
import { PTN } from "../../types/parser/ptn";
import LOG_ERROR from "../../logger/logError";
import CODE_TYPES from "../../types/parser/codeTypes";
import WORD_TEST from "../../util/wordTest";
import RawCode from "../../util/parser/rawCode";
import readFile from "../../util/api/readFile";
import tokenize from "../tokenize";

class O {
    constructor(value: string, level: number) {
        this.value = value;
        this.level = level;
    }

    value: string;
    level: number;
}

export default function resolve(tokens: Deque<Token>, context: {
    importPool: string[],
    api: ApiWrapper
}): PTN.ParseTreeNode[] {
    const { importPool, api } = context;
    const parseTrees: PTN.ParseTreeNode[] = [];
    tokens.pushRear({
        value: "",
        coordinate: {
            file: "",
            line: -1,
            column: -1
        },
        flag: "EOF"
    });
    let hasError = false;

    function reportError() {
        hasError = true;
    }

    function pop(): Token {
        if (tokens.isEmpty()) {
            api.logger.errorInterrupt(LOG_ERROR.unexpectedFileEnd(), cursor.coordinate);
        }
        let a = tokens.popFront();
        while (a.flag == "comment" || a.flag == "docs") { //TODO: resolve comment
            a = tokens.popFront();
        }
        return a;
    }

    let cursor = pop();

    function getExpression(): PTN.Value {
        const expr: Deque<PTN.Value | O> = new Deque();
        const opLevel: LightDeque<number> = new LightDeque();// Operation levels
        let hLOperation: Token | undefined;// Hanging leading operation
        let hLAssertion: { type: PTN.Name, coordinate: Coordinate } | undefined;// Hanging leading assertion
        while (cursor.value != "," && cursor.value != ";" && cursor.value != ")" && cursor.value != "}" && cursor.flag != "EOF") {
            if (cursor.value == "(") {
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                cursor = pop();
                let exp = getExpression();
                if (hLAssertion) {
                    exp = new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, exp);
                    hLAssertion = undefined;
                }
                if (hLOperation) {
                    exp = new PTN.ExpressionVO(hLOperation.coordinate, hLOperation.value, exp);
                    hLOperation = undefined;
                }
                expr.pushRear(exp);
                if (cursor.value != ")") {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                cursor = pop();
                continue;
            }
            if (cursor.value == "true") {
                if (hLOperation) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate);
                }
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                if (hLAssertion) {
                    expr.pushRear(new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, new PTN.Bool(cursor.coordinate, true)));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(new PTN.Bool(cursor.coordinate, true));
                }
                cursor = pop();
                continue;
            }
            if (cursor.value == "false") {
                if (hLOperation) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate);
                }
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                if (hLAssertion) {
                    expr.pushRear(new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, new PTN.Bool(cursor.coordinate, false)));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(new PTN.Bool(cursor.coordinate, false));
                }
                cursor = pop();
                continue;
            }
            if (WORD_TEST.isInt(cursor.value)) {
                if (hLOperation) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate);
                }
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                if (hLAssertion) {
                    expr.pushRear(new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, new PTN.Int(cursor.coordinate, parseInt(cursor.value))));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(new PTN.Int(cursor.coordinate, parseInt(cursor.value)));
                }
                cursor = pop();
                continue;
            }
            if (cursor.value == "\"" || cursor.value == "'") {
                if (hLOperation) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate);
                }
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                cursor = pop();
                if (hLAssertion) {
                    expr.pushRear(new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, new PTN.String(cursor.coordinate, cursor.value)));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(new PTN.String(cursor.coordinate, cursor.value));
                }
                pop(); // another ' | "
                cursor = pop();
                continue;
            }
            if (cursor.value == "`") {
                if (hLOperation) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate);
                }
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                const values: PTN.Value[] = [];
                cursor = pop();
                while (cursor.value != "`") {
                    if (cursor.flag == "string") {
                        values.push(new PTN.String(cursor.coordinate, cursor.value));
                        cursor = pop();
                    } else {
                        if (cursor.value == "${") {
                            cursor = pop();
                            values.push(getExpression());
                            if (cursor.value == "}") {
                                cursor = pop();
                                continue;
                            }
                            api.logger.errorInterrupt(LOG_ERROR.notAnExpression(), cursor.coordinate);
                        }
                    }
                }
                const seg = new PTN.TemplateString(cursor.coordinate, values);
                if (hLAssertion) {
                    expr.pushRear(new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, seg));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(seg);
                }
                cursor = pop();
                continue;
            }
            if (cursor.value == "$") {
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                const coo = cursor.coordinate;
                cursor = pop();
                const n = new PTN.Name(coo, "exec", []);
                const c = getExpression();
                let exp: PTN.Value = new PTN.FunctionCall(coo, n, [c]);
                if (hLAssertion) {
                    exp = new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, exp);
                    hLAssertion = undefined;
                }
                expr.pushRear(exp);
                continue;
            }
            if (cursor.value == "{") {
                if (hLOperation) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate);
                }
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                const coo = cursor.coordinate;
                cursor = pop();
                let end = false;
                const inside: { [key: string]: PTN.Value } = {};
                while (cursor.value != "}") {
                    if (end) {
                        api.logger.error(LOG_ERROR.missingExpectedColon(), cursor.coordinate);
                        reportError();
                        end = false;
                    }
                    const n1 = cursor.value;
                    cursor = pop();
                    if (cursor.value != ":") {
                        api.logger.error(LOG_ERROR.missingExpectedColon(), cursor.coordinate);
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
                const seg = new PTN.StructBlock(coo, inside);
                if (hLAssertion) {
                    expr.pushRear(new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, seg));
                    hLAssertion = undefined;
                } else {
                    expr.pushRear(seg);
                }
                cursor = pop();
                continue;
            }
            if (cursor.flag == "operator") {
                if (hLOperation) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(hLOperation.value), hLOperation.coordinate);
                }
                if (hLAssertion) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidAssertion(), hLAssertion.coordinate);
                }
                const level = (<{ [key: string]: number }>CODE_TYPES.operatorPrecedence)?.[cursor.value];
                if (level == 1 || level == 2) {
                    if (expr.isEmpty() || expr.peekRear() instanceof O) {
                        hLOperation = cursor;
                    } else {
                        if (cursor.value == "!") {
                            api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                        }
                        const pref = <PTN.Value>expr.popRear();
                        expr.pushRear(new PTN.ExpressionSV(pref.coordinate, pref, cursor.value));
                    }
                    cursor = pop();
                    continue;
                }
                if (expr.isEmpty() || expr.peekRear() instanceof O) {
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
                            api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                        }
                        cursor = pop();
                        continue;
                    }
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                if (opLevel.isEmpty()) {
                    opLevel.pushRear(level);
                    expr.pushRear(new O(cursor.value, level));
                    cursor = pop();
                    continue;
                }
                if (opLevel.size() >= 1 && opLevel.peekRear() < level) {
                    while (opLevel.size() >= 1 && opLevel.peekRear() < level) {
                        const temp: Deque<PTN.Value | O> = new Deque();
                        const levelPref = opLevel.peekRear();
                        temp.pushFront(expr.popRear());
                        while (!opLevel.isEmpty() && opLevel.peekRear() == levelPref) {
                            temp.pushFront(expr.popRear());
                            temp.pushFront(expr.popRear());
                            opLevel.popRear();
                        }
                        while (temp.size() > 1) {
                            temp.pushFront(
                                new PTN.ExpressionSVO(
                                    (<PTN.Value>temp.peekFront()).coordinate,
                                    <PTN.Value>temp.popFront(),
                                    (<{ type: "o", value: string, level: number }>temp.popFront()).value,
                                    <PTN.Value>temp.popFront()
                                )
                            );
                        }
                        expr.pushRear(<PTN.Value>temp.peekFront());
                    }
                    expr.pushRear(new O(cursor.value, level));
                    cursor = pop();
                    continue;
                } else {
                    opLevel.pushRear(level);
                    expr.pushRear(new O(cursor.value, level));
                    cursor = pop();
                    continue;
                }
            }
            if (cursor.flag == "word") {
                if (!expr.isEmpty() && !(expr.peekRear() instanceof O)) {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                }
                const coo = cursor.coordinate;
                const n = getName();
                if (cursor.value == "(") {
                    cursor = pop();
                    const args: PTN.Value[] = [];
                    while (cursor.value != ")") {
                        args.push(getExpression());
                        if (cursor.value == "," || cursor.value == ")") {
                            continue;
                        }
                        api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                        // never goes below
                        return <PTN.FunctionCall>{};
                    }
                    cursor = pop();
                    let exp: PTN.Value = new PTN.FunctionCall(coo, n, args);
                    if (hLAssertion) {
                        exp = new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, exp);
                        hLAssertion = undefined;
                    }
                    expr.pushRear(exp);
                    continue;
                }
                let exp: PTN.Value = new PTN.ValCall(cursor.coordinate, n);
                if (hLOperation) {
                    exp = new PTN.ExpressionVO(hLOperation.coordinate, hLOperation.value, exp);
                    hLOperation = undefined;
                }
                if (hLAssertion) {
                    exp = new PTN.Assertion(hLAssertion.coordinate, hLAssertion.type, exp);
                    hLAssertion = undefined;
                }
                expr.pushRear(exp);
            }
        }
        while (expr.size() > 1) {
            expr.pushFront(
                new PTN.ExpressionSVO(
                    (<PTN.Value>expr.peekFront()).coordinate,
                    <PTN.Value>expr.popFront(),
                    (<{ type: "o", value: string, level: number }>expr.popFront()).value,
                    <PTN.Value>expr.popFront()
                )
            );
        }
        return <PTN.Value>expr.peekFront();
    }

    function getName(): PTN.Name {
        const s: string[] = [];
        const coo = cursor.coordinate;
        if (cursor.flag == "operator" || WORD_TEST.isInt(cursor.value)) {
            api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
            return new PTN.Name(coo, "", []);
        }
        s.push(cursor.value);
        cursor = pop();
        while (cursor.value == "::") {
            cursor = pop();
            if (cursor.flag == "operator" || WORD_TEST.isInt(cursor.value)) {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                return new PTN.Name(coo, "", []);
            }
            s.push(cursor.value);
            cursor = pop();
        }
        return new PTN.Name(coo, <string>s.pop(), s);
    }

    function getBlock(context: { block: number }): PTN.Block {
        const coo = cursor.coordinate;
        const statements: PTN.ParseTreeNode[] = [];
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
        return new PTN.Block(coo, statements);
    }

    function getStatement(context: { block: number }, requirements: {
        withBlock?: boolean,
        isBlock: boolean,
        isSingle: boolean //TODO: figure out when it will be false
        withoutSemi: boolean
    }): PTN.ParseTreeNode {
        const { block } = context;

        // Empty `;`
        if (cursor.value == ";") {
            const coo = cursor.coordinate;
            if (!requirements.isSingle) {
                api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            cursor = pop();
            return new PTN.Empty(coo);
        }

        // Import `import "xxx";`
        if (cursor.value == "import") {
            if (!requirements.isSingle) {
                api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            let valid = true;
            if (block > 0) {
                api.logger.error(LOG_ERROR.importInBlock(), cursor.coordinate);
                reportError();
                valid = false;
            }
            const lineCoordinate = cursor.coordinate;
            cursor = pop();
            if (cursor.flag != "string") {
                api.logger.error(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                reportError();
                // valid = false;
            } else {
                const filePath = cursor.value;
                cursor = pop();
                if (requirements.withoutSemi || cursor.value != ";") {
                    api.logger.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate);
                    reportError();
                    return new PTN.Empty(lineCoordinate);
                }
                if (!requirements.withoutSemi) {
                    cursor = pop();
                }
                if (importPool.indexOf(filePath) >= 0) {
                    valid = false;
                }
                if (valid) {
                    const file = readFile(filePath, { api, coordinate: lineCoordinate });
                    if (!file.success) {
                        api.logger.error(LOG_ERROR.unknownFile(filePath), lineCoordinate);
                        reportError();
                        return new PTN.Empty(lineCoordinate);
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
            return new PTN.Empty(lineCoordinate);
        }

        // Annotation `@xxx`
        if (cursor.value.startsWith("@")) {
            const annotations: PTN.Annotation[] = [];
            while (cursor.value.startsWith("@")) {
                const coo = cursor.coordinate;
                annotations.push(new PTN.Annotation(coo, getName()));
            }
            return new PTN.AnnotationWrapper(annotations, getStatement(context, requirements));
        }

        // Block `{...}`
        if (cursor.value == "{") {
            if (!requirements.isBlock) {
                api.logger.errorInterrupt(LOG_ERROR.unexpectedBlock(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            return getBlock(context);
        }

        // Struct `struct xxx {xxx: Xxx}`
        if (cursor.value == "struct") {
            if (!requirements.isBlock) {
                api.logger.errorInterrupt(LOG_ERROR.unexpectedBlock(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            let valid = true;
            const inside: { [key: string]: PTN.Name } = {};
            cursor = pop();
            const n = getName();
            if (cursor.value != "{") {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            cursor = pop();
            let end = false;
            while (cursor.value != "}") {
                if (end) {
                    api.logger.error(LOG_ERROR.missingExpectedColon(), cursor.coordinate);
                    reportError();
                    valid = false;
                    end = false;
                }
                const n1 = cursor.value;
                cursor = pop();
                if (cursor.value != ":") {
                    api.logger.error(LOG_ERROR.missingExpectedColon(), cursor.coordinate);
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
                return new PTN.StructDefine(coo, n, inside);
            } else {
                return new PTN.Empty(coo);
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
                api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
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
            let t: PTN.Name | undefined;
            let v: PTN.Value | undefined;
            if (cursor.value == ":") {
                cursor = pop();
                t = getName();
            }
            if (cursor.value == "=") {
                cursor = pop();
                v = getExpression();
            }
            if (requirements.withoutSemi || cursor.value != ";") {
                api.logger.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate);
                reportError();
            } else {
                if (!requirements.withoutSemi) {
                    cursor = pop();
                }
            }
            return new PTN.ValDefine(coo, n, t, { ...definingProps, ...valProps }, v);
        }

        // Function Define `function xxx(xxx: Xxx): Xxx { xxx; }`
        if (cursor.value == "function") {
            if (!requirements.isBlock) {
                api.logger.errorInterrupt(LOG_ERROR.unexpectedBlock(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            const n = getName();
            const args: PTN.ValDefine[] = [];
            let t: PTN.Name | undefined;
            if (cursor.value != "(") {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                return new PTN.Empty(coo);
            }
            cursor = pop();
            while (cursor.value != ")") {
                const n = getName();
                let t: PTN.Name | undefined;
                let v: PTN.Value | undefined;
                if (cursor.value == ":") {
                    cursor = pop();
                    t = getName();
                }
                if (cursor.value == "=") {
                    cursor = pop();
                    v = getExpression();
                }
                if (cursor.value != "," && cursor.value != ")") {
                    api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), cursor.coordinate);
                    return new PTN.Empty(coo);
                }
                if (cursor.value == ",") {
                    cursor = pop();
                }
                args.push(new PTN.ValDefine(coo, n, t, { native: false, macro: false, var: true }, v));
            }
            cursor = pop();
            if (cursor.value == ":") {
                cursor = pop();
                t = getName();
            }
            if (cursor.value == ";") {
                cursor = pop();
                return new PTN.FunctionDefine(coo, n, t, {
                    macro: definingProps.macro
                }, args, undefined);
            } else {
                const block = getBlock({ block: context.block + 1 });
                return new PTN.FunctionDefine(coo, n, t, {
                    macro: definingProps.macro
                }, args, block);
            }
        }

        // if not defining...
        if (definingProps.native && nativeCoo) {
            api.logger.error(LOG_ERROR.invalidCharacterOrToken("native"), nativeCoo);
            reportError();
        }
        if (definingProps.macro && macroCoo) {
            api.logger.error(LOG_ERROR.invalidCharacterOrToken("native"), macroCoo);
            reportError();
        }

        // If `if (xxx) xxx;` `else xxx;`
        if (cursor.value == "if") {
            if (!requirements.isBlock) {
                api.logger.errorInterrupt(LOG_ERROR.unexpectedBlock(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            if (cursor.value != "(") {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo);
                return new PTN.Empty(coo);
            }
            cursor = pop();
            const condition = getExpression();
            if (cursor.value != ")") {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo);
                return new PTN.Empty(coo);
            }
            cursor = pop();
            const statement = getStatement(context, {
                withBlock: true,
                isBlock: true,
                isSingle: true,
                withoutSemi: false
            });
            let elseStatement: PTN.ParseTreeNode | undefined;
            if (cursor.value == "else") {
                cursor = pop();
                elseStatement = getStatement(context, {
                    withBlock: true,
                    isBlock: true,
                    isSingle: true,
                    withoutSemi: false
                });
            }
            return new PTN.If(coo, condition, statement, elseStatement);
        }

        // For `for (xxx; xxx; xxx) xxx;`
        if (cursor.value == "for") {
            if (!requirements.isBlock) {
                api.logger.errorInterrupt(LOG_ERROR.unexpectedBlock(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            if (cursor.value != "(") {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo);
                return new PTN.Empty(coo);
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
            let statement3: PTN.ParseTreeNode = new PTN.Empty(cursor.coordinate);
            if (cursor.value != ")") {
                statement3 = getStatement(context, {
                    withBlock: true,
                    isSingle: true,
                    isBlock: false,
                    withoutSemi: true
                });
            }
            if (cursor.value != ")") {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo);
                return new PTN.Empty(coo);
            }
            cursor = pop();
            const statement = getStatement(context, {
                withBlock: true,
                isBlock: true,
                isSingle: true,
                withoutSemi: false
            });
            return new PTN.For(coo, statement1, statement2, statement3, statement);
        }

        // While `while (xxx) xxx;`
        if (cursor.value == "while") {
            if (!requirements.isBlock) {
                api.logger.errorInterrupt(LOG_ERROR.unexpectedBlock(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            if (cursor.value != "(") {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo);
                return new PTN.Empty(coo);
            }
            cursor = pop();
            const condition = getExpression();
            if (cursor.value != ")") {
                api.logger.errorInterrupt(LOG_ERROR.invalidCharacterOrToken(cursor.value), coo);
                return new PTN.Empty(coo);
            }
            cursor = pop();
            const statement = getStatement(context, {
                withBlock: true,
                isBlock: true,
                isSingle: true,
                withoutSemi: false
            });
            return new PTN.While(coo, condition, statement);
        }

        // Namespace `namespace xx { xxx; }`
        if (cursor.value == "namespace") {
            if (!requirements.isBlock) {
                api.logger.errorInterrupt(LOG_ERROR.unexpectedBlock(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();
            const n = getName();
            const block = getBlock(context);
            return new PTN.Namespace(coo, n, block);
        }

        // Using
        if (cursor.value == "using") {
            if (!requirements.isSingle) {
                api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), cursor.coordinate);
                return new PTN.Empty(cursor.coordinate);
            }
            const coo = cursor.coordinate;
            cursor = pop();

            // `using namespace xxx;`
            if (cursor.value == "namespace") {
                cursor = pop();
                const n = getName();
                return new PTN.UsingNamespace(coo, n);
            }

            // `using xxx;`
            const n = getName();
            if (cursor.value != ";") {
                api.logger.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate);
                reportError();
            } else {
                cursor = pop();
            }
            return new PTN.Using(coo, n);
        }

        // Return `return xxx`;
        if (cursor.value == "return") {
            const coo = cursor.coordinate;
            cursor = pop();
            if (cursor.value == "," || cursor.value == ";" || cursor.value == ")" || cursor.value == "}") {
                if (!requirements.withoutSemi) {
                    if (cursor.value != ";") {
                        api.logger.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate);
                        reportError();
                    } else {
                        cursor = pop();
                    }
                }
                return new PTN.Return(coo);
            }
            const expr = getExpression();
            if (!requirements.withoutSemi) {
                if (cursor.value != ";") {
                    api.logger.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate);
                    reportError();
                } else {
                    cursor = pop();
                }
            }
            return new PTN.Return(coo, expr);
        }

        // xxx;
        const expr = getExpression();
        if (!requirements.withoutSemi) {
            if (cursor.value != ";") {
                api.logger.error(LOG_ERROR.missingExpectedSemicolon(), cursor.coordinate);
                reportError();
            } else {
                cursor = pop();
            }
        }
        return expr;
    }

    while (cursor.flag != "EOF") {
        parseTrees.push(getStatement({ block: 0 }, {
            withBlock: true,
            isBlock: true,
            isSingle: true,
            withoutSemi: false
        }));
    }

    if (hasError) {
        throw new Error();
    }

    return parseTrees;
}
