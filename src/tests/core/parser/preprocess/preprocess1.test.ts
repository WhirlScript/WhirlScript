import * as fs from "fs";
import RawCode from "../../../../core/util/parser/rawCode";
import tokenize from "../../../../core/parser/tokenize";
import CliApi from "../../../../cli/types/api";
import resolve from "../../../../core/parser/resolve";
import ApiWrapper from "../../../../core/types/api/apiWrapper";
import preprocess from "../../../../core/parser/preprocess";

describe("test preprocess method", () => {
    const api = new ApiWrapper(new CliApi());
    test("script preprocess", () => {
        const srcPath = process.cwd() + "/src/tests/resource/preprocess.wrs";
        const valuePath = process.cwd() + "/src/tests/resource/preprocess.json";
        const script = fs.readFileSync(srcPath).toString();
        const rawCode = new RawCode({
            coordinate: {
                line: 1,
                column: 1,
                file: "F",
                chain: undefined
            }, value: script
        });
        const expectedValue = JSON.parse(fs.readFileSync(valuePath).toString());
        const s = resolve(tokenize(rawCode, { api }), { api, importPool: [] });
        expect(preprocess(s, { target: "sh" }, { api })).toEqual(expectedValue);
    });
});
