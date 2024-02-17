import RawCode from "../core/util/parser/rawCode";
import tokenize from "../core/parser/tokenize";
import * as fs from "fs";
import CliApi from "./types/api";
import resolve from "../core/parser/resolve";
import Pools from "../core/util/parser/pools";
import ApiWrapper from "../core/types/api/apiWrapper";

const path = process.cwd() + "\\src\\tests\\resource\\resolve.wrs";
const script = fs.readFileSync(path).toString();

const codeNode = new RawCode({
    coordinate: {
        file: "F",
        line: 1,
        column: 1,
        chain: undefined
    }, value: script
});

const api = new ApiWrapper(new CliApi());

const s = resolve(tokenize(codeNode, { api }), { api, importPool: [] });

console.log(JSON.stringify(s));