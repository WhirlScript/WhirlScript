import Coordinate from "./coordinate";

export namespace PTN {
    export interface ParseTreeNode {
        coordinate: Coordinate;
    }

    export interface Value extends ParseTreeNode {
    }

    export class Empty implements ParseTreeNode {
        readonly coordinate: Coordinate;


        constructor(coordinate: Coordinate) {
            this.coordinate = coordinate;
        }
    }

    export class Annotation implements ParseTreeNode {
        readonly coordinate: Coordinate;
        readonly annotation: Name;

        constructor(coordinate: Coordinate, annotation: Name) {
            this.coordinate = coordinate;
            this.annotation = annotation;
        }
    }

    export class AnnotationWrapper implements ParseTreeNode {
        readonly coordinate: Coordinate;
        readonly annotations: Annotation[];
        readonly value: ParseTreeNode;

        constructor(annotations: Annotation[], value: ParseTreeNode) {
            this.coordinate = (annotations[0] ?? value).coordinate;
            this.annotations = annotations;
            this.value = value;
        }
    }

    export class ExpressionSVO implements ParseTreeNode, Value {
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

    export class ExpressionSV implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly s: Value;
        readonly v: string;

        constructor(coordinate: Coordinate, s: Value, v: string) {
            this.coordinate = coordinate;
            this.s = s;
            this.v = v;
        }
    }

    export class ExpressionVO implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly v: string;
        readonly o: Value;

        constructor(coordinate: Coordinate, v: string, o: Value) {
            this.coordinate = coordinate;
            this.v = v;
            this.o = o;
        }
    }

    export class Int implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly value: number;

        constructor(coordinate: Coordinate, value: number) {
            this.coordinate = coordinate;
            this.value = value;
        }
    }

    export class Bool implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly value: boolean;

        constructor(coordinate: Coordinate, value: boolean) {
            this.coordinate = coordinate;
            this.value = value;
        }
    }

    export class String implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly value: string;

        constructor(coordinate: Coordinate, value: string) {
            this.coordinate = coordinate;
            this.value = value;
        }
    }

    export class TemplateString implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;
        readonly values: Value[];

        constructor(coordinate: Coordinate, values: Value[]) {
            this.coordinate = coordinate;
            this.values = values;
        }
    }

    export class Name implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly value: string;
        readonly namespaces: string[];

        constructor(coordinate: Coordinate, value: string, namespaces: string[] = []) {
            this.coordinate = coordinate;
            this.value = value;
            this.namespaces = namespaces;
        }
    }

    export class ValCall implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly valName: Name;

        constructor(coordinate: Coordinate, valName: Name) {
            this.coordinate = coordinate;
            this.valName = valName;
        }
    }

    export class FunctionCall implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly functionName: Name;
        readonly args: Value[];

        constructor(coordinate: Coordinate, functionName: Name, args: Value[]) {
            this.coordinate = coordinate;
            this.functionName = functionName;
            this.args = args;
        }
    }

    export class Exec implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly command: Value;

        constructor(coordinate: Coordinate, command: Value) {
            this.coordinate = coordinate;
            this.command = command;
        }
    }

    interface DefiningProps {
        native: boolean;
        macro: boolean;
    }

    type ValProps = DefiningProps & {
        var: boolean
    }

    interface FunctionProps {
        macro: boolean;
    }

    export class ValDefine implements ParseTreeNode {
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

    export class FunctionDefine implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly functionName: Name;
        readonly functionType: Name | undefined;
        readonly props: FunctionProps;
        readonly args: ValDefine[];
        readonly block: Block | undefined;

        constructor(coordinate: Coordinate, functionName: Name, functionType: Name | undefined, props: FunctionProps, args: ValDefine[], block: Block | undefined) {
            this.coordinate = coordinate;
            this.functionName = functionName;
            this.functionType = functionType;
            this.props = props;
            this.args = args;
            this.block = block;
        }
    }

    export class Block implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly inside: ParseTreeNode[];

        constructor(coordinate: Coordinate, inside: ParseTreeNode[]) {
            this.coordinate = coordinate;
            this.inside = inside;
        }
    }


    export class StructBlock implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly inside: { [key: string]: Value };

        constructor(coordinate: Coordinate, inside: { [key: string]: Value }) {
            this.coordinate = coordinate;
            this.inside = inside;
        }
    }

    export class StructDefine implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly structName: Name;
        readonly inside: { [key: string]: Name };

        constructor(coordinate: Coordinate, structName: Name, inside: { [key: string]: Name }) {
            this.coordinate = coordinate;
            this.structName = structName;
            this.inside = inside;
        }
    }

    export class Assertion implements ParseTreeNode, Value {
        readonly coordinate: Coordinate;

        readonly toType: Name;
        readonly value: Value;

        constructor(coordinate: Coordinate, toType: Name, value: Value) {
            this.coordinate = coordinate;
            this.toType = toType;
            this.value = value;
        }
    }

    export class If implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly condition: Value;
        readonly statement: ParseTreeNode;
        readonly elseStatement: ParseTreeNode | undefined;

        constructor(coordinate: Coordinate, condition: Value, statement: ParseTreeNode, elseStatement?: ParseTreeNode) {
            this.coordinate = coordinate;
            this.condition = condition;
            this.statement = statement;
            this.elseStatement = elseStatement;
        }
    }

    export class For implements ParseTreeNode {
        readonly coordinate: Coordinate;

        // for (st1; st2; st3) st
        readonly statement1: ParseTreeNode;
        readonly statement2: Value;
        readonly statement3: ParseTreeNode;
        readonly statement: ParseTreeNode;

        constructor(coordinate: Coordinate, statement1: ParseTreeNode, statement2: Value, statement3: ParseTreeNode, statement: ParseTreeNode) {
            this.coordinate = coordinate;
            this.statement1 = statement1;
            this.statement2 = statement2;
            this.statement3 = statement3;
            this.statement = statement;
        }
    }

    export class While implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly condition: Value;
        readonly statement: ParseTreeNode;

        constructor(coordinate: Coordinate, condition: Value, statement: ParseTreeNode) {
            this.coordinate = coordinate;
            this.condition = condition;
            this.statement = statement;
        }
    }

    export class Namespace implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly namespaceName: Name;
        readonly block: Block;

        constructor(coordinate: Coordinate, namespaceName: Name, block: Block) {
            this.coordinate = coordinate;
            this.namespaceName = namespaceName;
            this.block = block;
        }
    }

    export class Using implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly definingName: Name;

        constructor(coordinate: Coordinate, definingName: Name) {
            this.coordinate = coordinate;
            this.definingName = definingName;
        }
    }

    export class UsingNamespace implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly namespaceName: Name;

        constructor(coordinate: Coordinate, namespaceName: Name) {
            this.coordinate = coordinate;
            this.namespaceName = namespaceName;
        }
    }

    export class Return implements ParseTreeNode {
        readonly coordinate: Coordinate;

        readonly value: Value | undefined;

        constructor(coordinate: Coordinate, value?: Value) {
            this.coordinate = coordinate;
            this.value = value;
        }
    }
}