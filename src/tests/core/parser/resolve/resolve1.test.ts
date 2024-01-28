import * as fs from "fs";
import RawCode from "../../../../core/util/parser/rawCode";
import tokenize from "../../../../core/parser/tokenize";
import CliApi from "../../../../cli/types/api";
import Pools from "../../../../core/util/parser/Pools";
import resolve from "../../../../core/parser/resolve";

describe("test tokenize method", () => {
    const api = new CliApi();
    const pools = new Pools();
    test("script tokenize", () => {
        const srcPath = process.cwd() + "/src/tests/resource/resolve.wrs";
        const valuePath = process.cwd() + "/src/tests/resource/resolve.json";
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
        expect(resolve(tokenize(rawCode, { api }), { api, pools })).toEqual(expectedValue);
    });
});
