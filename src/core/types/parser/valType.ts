export default class ValType {
    protected name: string;
    protected def: { [key: string]: ValType };

    constructor(name: string, def: { [key: string]: ValType }) {
        this.name = name;
        this.def = def;
    }
}