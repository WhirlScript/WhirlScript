import { ValType } from "./codeTypes";

export default class Val {
    protected props: string[];
    protected type: ValType;
    protected init: boolean = false;

    constructor(type: ValType, props: string[]) {
        this.type = type;
        this.props = props;
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
}