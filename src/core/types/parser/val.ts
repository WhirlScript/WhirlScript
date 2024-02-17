import Type from "./type";


type ValProp = {
    isConst: boolean,
    deprecated: boolean,
    optional: boolean
}

export default class Val {
    readonly name: string;
    readonly type: Type;
    readonly prop: ValProp;
    isInit: boolean = false;
    used: boolean = false;


    constructor(name: string, type: Type, prop: ValProp) {
        this.name = name;
        this.type = type;
        this.prop = prop;
    }

    use() {
        this.used = true;
    }
}