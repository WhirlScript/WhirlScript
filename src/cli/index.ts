import RawCode from "../core/util/parser/rawCode";
import tokenize from "../core/parser/tokenize";
import * as fs from "fs";
import CliApi from "./types/api";
import resolve from "../core/parser/resolve";
import ApiWrapper from "../core/types/api/apiWrapper";
import preprocess from "../core/parser/preprocess";

const path = process.cwd() + "\\src\\tests\\resource\\preprocess.wrs";
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

const p = preprocess(s, { target: "sh" }, { api });
// console.log(p);
console.log(JSON.stringify(p));