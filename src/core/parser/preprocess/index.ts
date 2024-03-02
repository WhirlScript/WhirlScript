import { Segment } from "../../types/parser/segment";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";
import Pools from "../../util/parser/pools";
import { RSegment } from "../../types/parser/rSegment";
import preprocessSegment from "./preprocessSegment";

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
        if (segment.type == "Empty" || segment.type == "EmptyValue") {
            return;
        }
        if (segment.type == "Block" && !(<RSegment.Block>segment).hasScope) {
            for (const s of (<RSegment.Block>segment).inside) {
                push(s);
            }
        }
        if (segment.type == "ValueWrapper" && (<RSegment.ValueWrapper>segment).codes.length != 0) {
            const seg = <RSegment.ValueWrapper>segment;
            for (const s of seg.codes) {
                push(s);
            }
            if (seg.value) {
                push(seg.value);
            }
        }
        if (segment.type == "Int" || segment.type == "Bool" || segment.type == "String") {
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
    if (hasError.v) {
        throw new Error();
    }
    return result;
}