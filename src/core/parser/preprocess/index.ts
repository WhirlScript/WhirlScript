import { Segment } from "../../types/parser/segment";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";
import Pools from "../../util/parser/pools";
import { RSegment } from "../../types/parser/rSegment";
import preprocessSegment from "./preprocessSegment";
import * as crypto from "crypto";

export default function preprocess(
    segments: Segment.SegmentInterface[],
    requirement: {
        target: "sh" | "bat";
    },
    context: {
        api: ApiWrapper
    }) {
    const { api } = context;
    const coordinateChain: Coordinate[] = [];
    const pools = new Pools();
    const result: RSegment.SegmentInterface[] = [];
    const hasError = { v: false };

    function push(segment: RSegment.SegmentInterface) {
        if (segment instanceof RSegment.Empty || segment instanceof RSegment.EmptyValue) {
            return;
        }
        if (segment instanceof RSegment.Block && !segment.hasScope) {
            for (const s of segment.inside) {
                push(s);
            }
        }
        if (segment instanceof RSegment.ValueWrapper && segment.codes.length != 0) {
            for (const s of segment.codes) {
                push(s);
            }
            if (segment.value) {
                push(segment.value);
            }
        }
        if (segment instanceof RSegment.Int || segment instanceof RSegment.Bool || segment instanceof RSegment.String) {
            return;
        }
        result.push(segment);
    }

    for (const segment of segments) {
        push(preprocessSegment(segment, coordinateChain, requirement, {
            api,
            hasError,
            namespace: [],
            pools
        }));
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