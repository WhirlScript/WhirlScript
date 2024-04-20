import { ASTN } from "../../types/parser/astn";
import ApiWrapper from "../../types/api/apiWrapper";
import shOutput from "./shOutput";
import batOutput from "./batOutput";
import { CompileConfig } from "../../types/config/compileConfig";

export default function output(
    segments: ASTN.AbstractSyntaxTreeNode[],
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
            script += batOutput(segment, {
                api: context.api,
                indent: 0,
                config: new CompileConfig({})
            });
        }
    }

    return script;
}