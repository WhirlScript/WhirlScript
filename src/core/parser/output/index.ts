import { RSegment } from "../../types/parser/rSegment";
import ApiWrapper from "../../types/api/apiWrapper";
import shOutput from "./shOutput";
import batOutput from "./batOutput";

export default function output(
    segments: RSegment.SegmentInterface[],
    requirement: {
        target: "sh" | "bat";
    },
    context: {
        api: ApiWrapper
    }) {
    let script: string;
    if (requirement.target == "sh") {
        script = "#!/bin/bash\n";
    } else {
        script = "@echo off\n";
    }

    for (const segment of segments) {
        if (requirement.target == "sh") {
            script += shOutput(segment, context);
        } else {
            script += batOutput(segment, context);
        }
    }

    return script;
}