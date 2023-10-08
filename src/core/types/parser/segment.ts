namespace Segment {
    export interface Segment {
        type: string | "FunctionCall" | "MacroFunctionCall" | "Expression" | "Val";
    }

    type Expression = Segment.ExpressionSV;
    type Value = Expression | Segment.Val | Segment.Int | Segment.Bool | Segment.String

    export class Assignment implements Segment {
        readonly type = "Assignment";

        s: Val;
        assignWith: "" | "+" | "-" | "*" | "/";
        o: Value;

        constructor(s: Val, assignWith: "" | "+" | "-" | "*" | "/", o: Value) {
            this.s = s;
            this.assignWith = assignWith;
            this.o = o;
        }
    }

    export class ExpressionSVO implements Segment {
        readonly type = "ExpressionSVO";

        s: Value;
        v: string;
        o: Value;

        constructor(s: Value, v: string, o: Value) {
            this.s = s;
            this.v = v;
            this.o = o;
        }
    }

    export class ExpressionSV implements Segment {
        readonly type = "ExpressionSV";

        s: Value;
        v: string;

        constructor(s: Value, v: string) {
            this.s = s;
            this.v = v;
        }
    }

    export class ExpressionVO implements Segment {
        readonly type = "ExpressionVO";

        v: string;
        o: Value;

        constructor(v: string, o: Value) {
            this.v = v;
            this.o = o;
        }
    }

    export class Val implements Segment {
        readonly type = "Val";
        valName: string;

        constructor(valName: string) {
            this.valName = valName;
        }
    }

    export class Int implements Segment {
        readonly type = "Int";
        value: number;

        constructor(value: number) {
            this.value = value;
        }
    }

    export class Bool implements Segment {
        readonly type = "Bool";
        value: boolean;

        constructor(value: boolean) {
            this.value = value;
        }
    }

    export class String implements Segment {
        readonly type = "String";
        value: string;

        constructor(value: string) {
            this.value = value;
        }
    }

    export class FunctionCall implements Segment {
        readonly type = "FunctionCall";
        functionName: string;
        args: string[];

        constructor(functionName: string, args: string[]) {
            this.functionName = functionName;
            this.args = args;
        }
    }

    export class MacroFunctionCall implements Segment {
        readonly type = "MacroFunctionCall";
        functionName: string;
        args: string[];

        constructor(functionName: string, args: string[]) {
            this.functionName = functionName;
            this.args = args;
        }
    }

    export class ValDefine implements Segment {
        readonly type = "ValDefine";
        valName: string;
        valType: string | undefined;
        props: string[];
        initialValue: Value | undefined;

        constructor(valName: string, valType: string | undefined, args: string[] = [], initialValue?: Value) {
            this.valName = valName;
            this.valType = valType;
            this.props = args;
            this.initialValue = initialValue;
        }
    }

    export class MacroValDefine implements Segment {
        readonly type = "MacroValDefine";
        valName: string;
        valType: string | undefined;
        props: string[];
        initialValue: Value | undefined;

        constructor(valName: string, valType: string | undefined, args: string[] = [], initialValue?: Value) {
            this.valName = valName;
            this.valType = valType;
            this.props = args;
            this.initialValue = initialValue;
        }
    }

    export class ValDeclaration implements Segment {
        readonly type = "ValDeclaration";
        valName: string;
        valType: string;

        constructor(valName: string, valType: string) {
            this.valName = valName;
            this.valType = valType;
        }
    }

    export class FunctionDefine implements Segment {
        readonly type = "FunctionDefine";
        functionName: string;
        args: ValDeclaration[];

        constructor(functionName: string, args: ValDeclaration[]) {
            this.functionName = functionName;
            this.args = args;
        }
    }

    export class MacroFunctionDefine implements Segment {
        readonly type = "MacroFunctionDefine";
        functionName: string;
        args: ValDeclaration[];

        constructor(functionName: string, args: ValDeclaration[]) {
            this.functionName = functionName;
            this.args = args;
        }
    }

    export class Block implements Segment {
        readonly type = "Block";
        inside: Segment[];

        constructor(inside: Segment[]) {
            this.inside = inside;
        }
    }
}