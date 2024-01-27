import Coordinate from "./Coordinate";
import LightDeque from "../../util/lightDeque";

export namespace Segment {
    type Types =
        "Empty"
        | "Annotation"
        | "AnnotationSegment"
        | "Assignment"
        | "ExpressionSVO"
        | "ExpressionSV"
        | "ExpressionVO"
        | "MacroValCall"
        | "Int"
        | "Bool"
        | "String"
        | "TemplateString"
        | "Name"
        | "ValCall"
        | "FunctionCall"
        | "MacroFunctionCall"
        | "ValDefine"
        | "FunctionDefine"
        | "Block"
        | "StructBlock"
        | "StructDefine"
        | "Assertion"
        | "If"
        | "For"
        | "While"
        | "Namespace"
        | "Using"
        | "UsingNamespace";

    export interface SegmentInterface {
        type: Types;
        coordinate: Coordinate;
    }

    export interface Value extends SegmentInterface {
    }

    export class Empty implements SegmentInterface {
        readonly type = "Empty";
        readonly coordinate: Coordinate;


        constructor(coordinate: Coordinate) {
            this.coordinate = coordinate;
        }
    }
    export class Annotation implements SegmentInterface {
        readonly type = "Annotation";
        readonly coordinate: Coordinate;
        readonly annotation: Name;

        constructor(coordinate: Coordinate, annotation: Name) {
            this.coordinate = coordinate;
            this.annotation = annotation;
        }
    }

    export class AnnotationSegment implements SegmentInterface {
        readonly type = "AnnotationSegment";
        readonly coordinate: Coordinate;
        readonly annotations: Annotation[];
        readonly value: SegmentInterface;

        constructor(annotations: Annotation[], value: SegmentInterface) {
            this.coordinate = (annotations[0] ?? value).coordinate;
            this.annotations = annotations;
            this.value = value;
        }
    }

    export class ExpressionSVO implements SegmentInterface, Value {
        readonly type = "ExpressionSVO";
        readonly coordinate: Coordinate;

        readonly s: Value;
        readonly v: string;
        readonly o: Value;

        constructor(coordinate: Coordinate, s: Value, v: string, o: Value) {
            this.coordinate = coordinate;
            this.s = s;
            this.v = v;
            this.o = o;
        }
    }

    export class ExpressionSV implements SegmentInterface, Value {
        readonly type = "ExpressionSV";
        readonly coordinate: Coordinate;

        readonly s: Value;
        readonly v: string;

        constructor(coordinate: Coordinate, s: Value, v: string) {
            this.coordinate = coordinate;
            this.s = s;
            this.v = v;
        }
    }

    export class ExpressionVO implements SegmentInterface, Value {
        readonly type = "ExpressionVO";
        readonly coordinate: Coordinate;

        readonly v: string;
        readonly o: Value;

        constructor(coordinate: Coordinate, v: string, o: Value) {
            this.coordinate = coordinate;
            this.v = v;
            this.o = o;
        }
    }

    export class Int implements SegmentInterface, Value {
        readonly type = "Int";
        readonly coordinate: Coordinate;

        readonly value: number;

        constructor(coordinate: Coordinate, value: number) {
            this.coordinate = coordinate;
            this.value = value;
        }
    }

    export class Bool implements SegmentInterface, Value {
        readonly type = "Bool";
        readonly coordinate: Coordinate;

        readonly value: boolean;

        constructor(coordinate: Coordinate, value: boolean) {
            this.coordinate = coordinate;
            this.value = value;
        }
    }

    export class String implements SegmentInterface, Value {
        readonly type = "String";
        readonly coordinate: Coordinate;

        readonly value: string;

        constructor(coordinate: Coordinate, value: string) {
            this.coordinate = coordinate;
            this.value = value;
        }
    }

    export class TemplateString implements SegmentInterface, Value {
        readonly type = "TemplateString";
        readonly coordinate: Coordinate;
        values: LightDeque<Segment.Value> = new LightDeque();

        constructor(coordinate: Coordinate) {
            this.coordinate = coordinate;
        }
    }

    export class Name implements SegmentInterface {
        readonly type = "Name";
        readonly coordinate: Coordinate;

        readonly value: string;
        readonly namespaces: string[];

        constructor(coordinate: Coordinate, value: string, namespaces: string[] = []) {
            this.coordinate = coordinate;
            this.value = value;
            this.namespaces = namespaces;
        }
    }

    export class ValCall implements SegmentInterface, Value {
        readonly type = "ValCall";
        readonly coordinate: Coordinate;

        readonly valName: Name;

        constructor(coordinate: Coordinate, valName: Name) {
            this.coordinate = coordinate;
            this.valName = valName;
        }
    }

    export class FunctionCall implements SegmentInterface, Value {
        readonly type = "FunctionCall";
        readonly coordinate: Coordinate;

        readonly functionName: Name;
        readonly args: Value[];

        constructor(coordinate: Coordinate, functionName: Name, args: Value[]) {
            this.coordinate = coordinate;
            this.functionName = functionName;
            this.args = args;
        }
    }

    interface DefiningProps {
        native: boolean;
        macro: boolean;
    }

    type ValProps = DefiningProps & {
        var: boolean
    }

    export class ValDefine implements SegmentInterface {
        readonly type = "ValDefine";
        readonly coordinate: Coordinate;

        readonly valName: Name;
        readonly valType: Name | undefined;
        readonly props: ValProps;
        readonly initialValue: Value | undefined;

        constructor(coordinate: Coordinate, valName: Name, valType: Name | undefined, props: ValProps, initialValue?: Value) {
            this.coordinate = coordinate;
            this.valName = valName;
            this.valType = valType;
            this.props = props;
            this.initialValue = initialValue;
        }
    }

    export class FunctionDefine implements SegmentInterface {
        readonly type = "FunctionDefine";
        readonly coordinate: Coordinate;

        readonly functionName: Name;
        readonly functionType: Name | undefined;
        readonly args: ValDefine[];
        readonly block: Block | undefined;

        constructor(coordinate: Coordinate, functionName: Name, functionType: Name | undefined, args: ValDefine[], block?: Block) {
            this.coordinate = coordinate;
            this.functionName = functionName;
            this.functionType = functionName;
            this.args = args;
            this.block = block;
        }
    }

    export class Block implements SegmentInterface {
        readonly type = "Block";
        readonly coordinate: Coordinate;

        readonly inside: SegmentInterface[];

        constructor(coordinate: Coordinate, inside: SegmentInterface[]) {
            this.coordinate = coordinate;
            this.inside = inside;
        }
    }


    export class StructBlock implements SegmentInterface {
        readonly type = "StructBlock";
        readonly coordinate: Coordinate;

        readonly inside: { [key: string]: Value };

        constructor(coordinate: Coordinate, inside: { [key: string]: Value }) {
            this.coordinate = coordinate;
            this.inside = inside;
        }
    }

    export class StructDefine implements SegmentInterface {
        readonly type = "StructDefine";
        readonly coordinate: Coordinate;

        readonly structName: Name;
        readonly inside: { [key: string]: Name };

        constructor(coordinate: Coordinate, structName: Name, inside: { [key: string]: Name }) {
            this.coordinate = coordinate;
            this.structName = structName;
            this.inside = inside;
        }
    }

    export class Assertion implements SegmentInterface, Value {
        readonly type = "Assertion";
        readonly coordinate: Coordinate;

        readonly toType: Name;
        readonly value: Value;

        constructor(coordinate: Coordinate, toType: Name, value: Value) {
            this.coordinate = coordinate;
            this.toType = toType;
            this.value = value;
        }
    }

    export class If implements SegmentInterface {
        readonly type = "If";
        readonly coordinate: Coordinate;

        readonly condition: Value;
        readonly statement: SegmentInterface;

        constructor(coordinate: Coordinate, condition: Value, statement: SegmentInterface) {
            this.coordinate = coordinate;
            this.condition = condition;
            this.statement = statement;
        }
    }

    export class For implements SegmentInterface {
        readonly type = "For";
        readonly coordinate: Coordinate;

        // for (st1; st2; st3) st
        readonly statement1: SegmentInterface;
        readonly statement2: SegmentInterface;
        readonly statement3: SegmentInterface;
        readonly statement: SegmentInterface;

        constructor(coordinate: Coordinate, statement1: SegmentInterface, statement2: SegmentInterface, statement3: SegmentInterface, statement: SegmentInterface) {
            this.coordinate = coordinate;
            this.statement1 = statement1;
            this.statement2 = statement2;
            this.statement3 = statement3;
            this.statement = statement;
        }
    }

    export class While implements SegmentInterface {
        readonly type = "While";
        readonly coordinate: Coordinate;

        readonly condition: Value;
        readonly statement: SegmentInterface;

        constructor(coordinate: Coordinate, condition: Value, statement: SegmentInterface) {
            this.coordinate = coordinate;
            this.condition = condition;
            this.statement = statement;
        }
    }

    export class Namespace implements SegmentInterface {
        readonly type = "Namespace";
        readonly coordinate: Coordinate;

        readonly namespaceName: Name;
        readonly block: Block;

        constructor(coordinate: Coordinate, namespaceName: Name, block: Block) {
            this.coordinate = coordinate;
            this.namespaceName = namespaceName;
            this.block = block;
        }
    }

    export class Using implements SegmentInterface {
        readonly type = "Using";
        readonly coordinate: Coordinate;

        readonly definingName: Name;

        constructor(coordinate: Coordinate, definingName: Name) {
            this.coordinate = coordinate;
            this.definingName = definingName;
        }
    }

    export class UsingNamespace implements SegmentInterface {
        readonly type = "UsingNamespace";
        readonly coordinate: Coordinate;

        readonly namespaceName: Name;

        constructor(coordinate: Coordinate, namespaceName: Name) {
            this.coordinate = coordinate;
            this.namespaceName = namespaceName;
        }
    }
}