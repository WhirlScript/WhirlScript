import { AST } from "../../types/parser/AST";
import ApiWrapper from "../../types/api/apiWrapper";
import shCodegen from "./shCodegen";
import batCodegen from "./bat/batCodegen";
import { CompileConfig } from "../../types/config/compileConfig";
import Line, { LineGenerator, Lines } from "../../types/parser/line";

export default function codegen(
    segments: AST.AbstractSyntaxTreeNode[],
    requirement: {
        target: "sh" | "bat";
    },
    context: {
        api: ApiWrapper
        config: CompileConfig
    }) {
    const { api, config } = context;
    const lines: Lines = new Lines();
    const lg = new LineGenerator(lines,config.indent);
    if (requirement.target == "sh") {
        lg.lineAdd("#!/bin/bash").require();
    } else {
        lg.lineAdd("@echo off").require();
    }

    for (const segment of segments) {
        if (requirement.target == "sh") {
            lines.merge(shCodegen(segment, {
                api: context.api,
                lineGenerator: lg
            }));
        } else {
            lines.merge(batCodegen(segment, {
                api: context.api,
                lineGenerator: lg
            }));
        }
    }

    return lines;
}