import Coordinate from "./coordinate";
import Val from "./val";
import Func from "./func";
import Type, { BASE_TYPES } from "./type";
import MacroVal from "./macroVal";

export namespace RSegment {
    export interface SegmentInterface {
        coordinate: Coordinate;
        returned: boolean;
        macroReturnValue: Value | undefined;
    }

    export interface Value extends SegmentInterface {
        valueType: Type;
        isMacro: boolean;
    }

    interface MacroBaseInterface extends Value {
        toStr(): String;
    }

    export type MacroBase = Void | Int | Bool | String


    export class Empty implements SegmentInterface {
        readonly coordinate: Coordinate;

        readonly returned = false;
        readonly macroReturnValue: undefined;


        constructor(coordinate: Coordinate) {
            this.coordinate = coordinate;
        }
    }

    export class EmptyValue implements Value {
        readonly coordinate: Coordinate;


        readonly isMacro = false;
        readonly valueType = BASE_TYPES.void;

        readonly returned = false;
        readonly macroReturnValue: undefined;


        constructor(coordinate: Coordinate) {
            this.coordinate = coordinate;
        }
    }

    export class ExpressionSVO implements Value {
        readonly coordinate: Coordinate;

        readonly s: Value;
        readonly v: string;
        readonly o: Value;

        readonly isMacro = false;
        readonly valueType: Type;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, s: Value, v: string, o: Value, valueType: Type) {
            this.coordinate = coordinate;
            this.s = s;
            this.v = v;
            this.o = o;
            this.valueType = valueType;
        }

    }

    export class ExpressionSV implements Value {
        readonly coordinate: Coordinate;

        readonly s: Value;
        readonly v: string;

        readonly isMacro = false;
        readonly valueType: Type;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, s: Value, v: string, valueType: Type) {
            this.coordinate = coordinate;
            this.s = s;
            this.v = v;
            this.valueType = valueType;
        }
    }

    export class ExpressionVO implements Value {
        readonly coordinate: Coordinate;

        readonly v: string;
        readonly o: Value;

        readonly isMacro = false;
        readonly valueType: Type;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, v: string, o: Value, valueType: Type) {
            this.coordinate = coordinate;
            this.v = v;
            this.o = o;
            this.valueType = valueType;
        }
    }

    export class Void implements MacroBaseInterface {
        readonly coordinate: Coordinate;

        readonly value: undefined;

        readonly isMacro = true;
        readonly valueType: Type = BASE_TYPES.void;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate) {
            this.coordinate = coordinate;
        }

        toStr(): String {
            return new RSegment.String(this.coordinate, "");
        }
    }

    export class Int implements MacroBaseInterface {
        readonly coordinate: Coordinate;

        readonly value: number;

        readonly isMacro = true;
        readonly valueType: Type = BASE_TYPES.int;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, value: number) {
            this.coordinate = coordinate;
            this.value = value;
        }

        toStr(): String {
            return new RSegment.String(this.coordinate, this.value.toString());
        }
    }

    export class Bool implements MacroBaseInterface {
        readonly coordinate: Coordinate;

        readonly value: boolean;

        readonly isMacro = true;
        readonly valueType: Type = BASE_TYPES.boolean;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, value: boolean) {
            this.coordinate = coordinate;
            this.value = value;
        }

        toInt(): Int {
            return new Int(this.coordinate, this.value ? 1 : 0);
        }

        toStr(): String {
            return new RSegment.String(this.coordinate, this.value ? "1" : "0");
        }
    }

    export class String implements MacroBaseInterface {
        readonly coordinate: Coordinate;

        readonly value: string;

        readonly isMacro = true;
        readonly valueType: Type = BASE_TYPES.string;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, value: string) {
            this.coordinate = coordinate;
            this.value = value;
        }

        toStr(): String {
            return this;
        }
    }

    export class TemplateString implements Value {
        readonly coordinate: Coordinate;
        readonly values: Value[];

        readonly isMacro = false;
        readonly valueType: Type = {
            type: "base",
            base: "string"
        };

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, values: Value[]) {
            this.coordinate = coordinate;
            this.values = values;
        }
    }

    export class ValCall implements Value {
        readonly coordinate: Coordinate;

        readonly val: Val;

        readonly isMacro = false;
        readonly valueType: Type;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, val: Val) {
            this.coordinate = coordinate;
            this.val = val;
            this.valueType = val.type;
        }
    }

    export class MacroValCall implements Value {
        readonly coordinate: Coordinate;

        readonly val: MacroVal;

        readonly isMacro = true;
        readonly valueType: Type;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, val: MacroVal) {
            this.coordinate = coordinate;
            this.val = val;
            this.valueType = val.type;
        }
    }

    export class FunctionCall implements Value {
        readonly coordinate: Coordinate;

        readonly func: Func;
        readonly args: Value[];

        readonly isMacro = false;
        readonly valueType: Type;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, func: Func, args: Value[]) {
            this.coordinate = coordinate;
            this.func = func;
            this.args = args;
            this.valueType = func.type;
        }
    }

    export class MacroFunction implements SegmentInterface {
        readonly coordinate: Coordinate;

        codes: RSegment.SegmentInterface[];
        hasScope: boolean;
        valueType: Type;

        isMacro: boolean;

        readonly returned = false;
        value: RSegment.Value | undefined;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, valueType: Type, codes: SegmentInterface[], prop: {
            isMacro: boolean,
            hasScope: boolean
        }, value?: Value) {
            this.coordinate = coordinate;
            this.valueType = valueType;
            this.codes = codes;
            this.isMacro = prop.isMacro;
            this.hasScope = prop.hasScope;
            this.value = value;
        }
    }

    export class ValueWrapper implements Value {
        readonly coordinate: Coordinate;

        codes: RSegment.SegmentInterface[];
        hasScope: boolean;
        valueType: Type;

        isMacro: boolean;

        readonly returned: boolean;
        value: RSegment.Value | undefined;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, valueType: Type, codes: SegmentInterface[], prop: {
            isMacro: boolean,
            hasScope: boolean
        }, value?: Value) {
            this.coordinate = coordinate;
            this.valueType = valueType;
            this.codes = codes;
            this.isMacro = prop.isMacro;
            this.hasScope = prop.hasScope;
            this.value = value;

            this.returned = false;
            for (const code of codes) {
                if (code.returned) {
                    this.returned = true;
                }
            }
        }
    }

    export class GetProperty implements Value {
        readonly coordinate: Coordinate;

        readonly isMacro = false;
        readonly valueType: Type;

        readonly returned = false;
        readonly macroReturnValue: undefined;
        readonly structValue: Value;
        readonly property: string;

        readonly valObj: Val | undefined;

        constructor(coordinate: Coordinate, structValue: Value, property: string, valueType: Type, valObj?: Val) {
            this.coordinate = coordinate;
            this.structValue = structValue;
            this.property = property;
            this.valueType = valueType;
            this.valObj = valObj;
        }
    }

    export class Block implements SegmentInterface {
        readonly coordinate: Coordinate;

        readonly inside: SegmentInterface[];

        readonly returned: boolean;
        readonly macroReturnValue: Value | undefined;

        hasScope: boolean = true;

        constructor(coordinate: Coordinate, inside: SegmentInterface[], macroReturnValue: Value | undefined) {
            this.coordinate = coordinate;
            this.inside = inside;
            this.macroReturnValue = macroReturnValue;
            this.returned = false;
            for (const segmentInterface of inside) {
                if (segmentInterface.returned) {
                    this.returned = true;
                }
            }
        }

        noScope() {
            this.hasScope = false;
            return this;
        }
    }

    export class StructBlock implements Value {
        readonly coordinate: Coordinate;

        readonly inside: { [key: string]: Value };

        readonly isMacro: boolean;
        readonly valueType: Type;

        readonly returned = false;
        readonly macroReturnValue: undefined;

        constructor(coordinate: Coordinate, inside: { [key: string]: Value }, valueType: Type) {
            this.coordinate = coordinate;
            this.inside = inside;
            let isMacro = true;
            for (const key in inside) {
                if (!inside[key].isMacro) {
                    isMacro = false;
                }
            }
            this.isMacro = isMacro;
            this.valueType = valueType;
        }
    }

    export class If implements SegmentInterface {
        readonly coordinate: Coordinate;

        readonly condition: Value;
        readonly statement: SegmentInterface;
        readonly elseStatement: SegmentInterface | undefined;

        readonly returned: boolean;
        readonly macroReturnValue: Value | undefined;

        constructor(coordinate: Coordinate, condition: Value, statement: SegmentInterface, elseStatement: SegmentInterface | undefined, macroReturnValue: Value | undefined) {
            this.coordinate = coordinate;
            this.condition = condition;
            this.statement = statement;
            this.elseStatement = elseStatement;
            this.macroReturnValue = macroReturnValue;

            this.returned = statement.returned && (elseStatement?.returned ?? false);
        }
    }

    export class For implements SegmentInterface {
        readonly coordinate: Coordinate;

        // for (st1; st2; st3) st
        readonly statement1: SegmentInterface | undefined;
        readonly statement2: Value;
        readonly statement3: SegmentInterface | undefined;
        readonly statement: SegmentInterface;

        readonly returned: boolean;
        readonly macroReturnValue: Value | undefined;

        constructor(coordinate: Coordinate,
                    statement1: SegmentInterface | undefined,
                    statement2: Value,
                    statement3: SegmentInterface | undefined,
                    statement: SegmentInterface,
                    macroReturnValue: Value | undefined) {
            this.coordinate = coordinate;
            this.statement1 = statement1;
            this.statement2 = statement2;
            this.statement3 = statement3;
            this.statement = statement;
            this.macroReturnValue = macroReturnValue;

            this.returned = this.statement.returned;
        }
    }

    export class While implements SegmentInterface {
        readonly coordinate: Coordinate;

        readonly condition: Value;
        readonly statement: SegmentInterface;

        readonly returned: boolean;
        readonly macroReturnValue: Value | undefined;

        constructor(coordinate: Coordinate,
                    condition: Value,
                    statement: SegmentInterface,
                    macroReturnValue: Value | undefined) {
            this.coordinate = coordinate;
            this.condition = condition;
            this.statement = statement;
            this.macroReturnValue = macroReturnValue;

            this.returned = statement.returned;
        }
    }

    export class Return implements SegmentInterface {
        readonly coordinate: Coordinate;

        readonly value: Value | undefined;
        readonly valueWrapper: ValueWrapper | undefined;

        readonly returned = true;
        readonly macroReturnValue: Value | undefined;

        constructor(coordinate: Coordinate, value: Value | undefined, macroReturn: boolean) {
            this.coordinate = coordinate;
            this.value = value;
            if (value?.isMacro && value instanceof ValueWrapper) {
                this.valueWrapper = value;
                this.value = new ValueWrapper(
                    value.coordinate,
                    value.valueType,
                    [],
                    {
                        isMacro: value.isMacro,
                        hasScope: false
                    },
                    value.value
                );
            } else if (value instanceof MacroValCall) {
                this.value = value.val.value;
            }

            if (macroReturn) {
                this.macroReturnValue = value;
            }
        }
    }
}