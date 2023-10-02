import Val from "../../types/parser/val";
import Func from "../../types/parser/func";

export default class Pools {
    map: {
        [key: string]: string
    } = {};
    valPool: Val[] = [];
    constPool: Val[] = [];
    functionPool: Func[] = [];
    importPool: string[] = [];
}