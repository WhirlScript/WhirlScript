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
    for (const segment of segments) {
        const r = preprocessSegment(segment, coordinateChain, requirement, {
            api,
            hasError,
            namespace: [],
            pools
        });
        if (r.type == "Empty" || r.type == "EmptyValue") {
            continue;
        }
        if (r.type == "Block" && !(<RSegment.Block>r).hasScope) {
            result.push(...(<RSegment.Block>r).inside);
        } else {
            result.push(r);
        }
    }
    return result;
}