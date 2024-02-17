import Type from "./type";

export default class Struct {
    readonly name: string;
    readonly def: { [key: string]: Type };

    constructor(name: string, def: { [key: string]: Type }) {
        this.name = name;
        this.def = def;
    }
}