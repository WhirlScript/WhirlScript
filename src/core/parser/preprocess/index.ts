import { PTN } from "../../types/parser/ptn";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";
import Pools from "../../util/parser/pools";
import { ASTN } from "../../types/parser/astn";
import preprocessSegment from "./preprocessSegment";
import * as crypto from "crypto";
import LOG_WARNING from "../../logger/logWarning";

export default function preprocess(
    parseTrees: PTN.ParseTreeNode[],
    requirement: {
        target: "sh" | "bat";
    },
    context: {
        api: ApiWrapper
    }) {
    const { api } = context;
    const coordinateChain: Coordinate[] = [];
    const pools = new Pools();
    const result: ASTN.AbstractSyntaxTreeNode[] = [];
    const hasError = { v: false };

    function push(ast: ASTN.AbstractSyntaxTreeNode) {
        if (ast instanceof ASTN.Empty || ast instanceof ASTN.EmptyValue) {
            return;
        }
        if (ast instanceof ASTN.Block && !ast.hasScope) {
            for (const s of ast.inside) {
                push(s);
            }
        }
        if (ast instanceof ASTN.ValueWrapper && ast.codes.length != 0) {
            for (const s of ast.codes) {
                push(s);
            }
            if (ast.value) {
                push(ast.value);
            }
        }
        if (ast instanceof ASTN.Int || ast instanceof ASTN.Bool || ast instanceof ASTN.String) {
            return;
        }
        result.push(ast);
    }

    for (const parseTree of parseTrees) {
        push(preprocessSegment(parseTree, coordinateChain, requirement, {
            api,
            hasError,
            namespace: [],
            pools
        }));
    }

    for (const e of pools.requirePool[0]) {
        e.require();
    }

    for (const e of pools.definePool[0]) {
        if (!e.used && !e.prop.optional) {
            api.logger.warning(LOG_WARNING.notUsed(e.name.v), e.coordinate);
        }
    }
    const usedNames: { [key: string]: true | undefined } = {};
    const mangle = (name: string, i: number) =>
        crypto.createHash("sha1").update(name + i).digest("hex").slice(0, 6);

    for (let i = 0; i < pools.renamePool.length; i++) {
        const rename = pools.renamePool[i];
        let i2 = i;
        let n = rename.v + "_" + mangle(rename.v, i2);
        while (usedNames[n] != undefined) {
            i2++;
            n = rename.v + "_" + mangle(rename.v, i2);
        }
        rename.v = n;
        usedNames[n] = true;
    }
    if (hasError.v) {
        throw new Error();
    }
    return result;
}