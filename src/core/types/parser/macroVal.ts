import { ValType } from "./codeTypes";

export default class MacroVal<T> {
    protected props: string[];
    protected type: ValType;
    value: T | undefined;
    protected init: boolean = false;

    constructor(type: ValType, props: string[]) {
        this.type = type;
        this.props = props;
    }

    hasProp(prop: string): boolean {
        return this.props.indexOf(prop) >= 0;
    }

}