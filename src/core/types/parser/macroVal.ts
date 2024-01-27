import { ValType } from "./codeTypes";

export default class MacroVal<T> {
    protected props: string[];
    protected name: string;
    protected type: ValType;
    protected _isConst: boolean;
    value: T | undefined;
    protected init: boolean = false;

    constructor(name: string, type: ValType, isConst: boolean, props: string[]) {
        this.name = name;
        this.type = type;
        this._isConst = isConst;
        this.props = props;
    }

    hasProp(prop: string): boolean {
        return this.props.indexOf(prop) >= 0;
    }

    setInit(): void {
        this.init = true;
    }

    getName(): string {
        return this.name;
    }

    getType(): ValType {
        return this.type;
    }

    isConst(): boolean {
        return this._isConst;
    }

}