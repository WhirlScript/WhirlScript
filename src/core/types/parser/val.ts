import { ValType } from "./codeTypes";
import Annotation from "./annotation";

export default class Val {
    protected props: string[];
    readonly name: string;
    readonly type: ValType;
    protected _isConst: boolean;
    protected init: boolean = false;

    readonly annotations: Annotation[];

    constructor(name: string, type: ValType, isConst: boolean, props: string[], annotations: Annotation[] = []) {
        this.name = name;
        this.type = type;
        this._isConst = isConst;
        this.props = props;
        this.annotations = annotations;
    }

    hasProp(prop: string): boolean {
        return this.props.indexOf(prop) >= 0;
    }

    setInit(): void {
        this.init = true;
    }

    isInit(): boolean {
        return this.init;
    }

    isConst(): boolean {
        return this._isConst;
    }

}