import Type from "./type";
import { SName } from "../../util/parser/pools";


type ValProp = {
    isConst: boolean,
    deprecated: boolean,
    optional: boolean
}

export default class Val {
    readonly name: SName;
    readonly type: Type;
    readonly prop: ValProp;
    isInit: boolean = false;
    used: boolean = false;


    constructor(name: string, type: Type, prop: ValProp) {
        this.name = { v: name };
        this.type = type;
        this.prop = prop;
    }

    use() {
        this.used = true;
    }
}