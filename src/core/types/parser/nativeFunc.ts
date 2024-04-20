import Type from "./type";
import { ASTN } from "./astn";

type Args = {
    name: string,
    type: Type,
    defaultValue?: ASTN.Value
}[];

type NativeFunctionProp = {
    deprecated: boolean
}

export default class NativeFunc {
    readonly name: string;
    readonly args: Args;
    readonly type: Type;
    readonly body: Function;
    readonly prop: NativeFunctionProp;

    constructor(name: string, type: Type, args: Args, body: Function, prop: NativeFunctionProp) {
        this.name = name;
        this.type = type;
        this.args = args;
        this.body = body;
        this.prop = prop;
    }
}