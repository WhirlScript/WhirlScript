import ApiWrapper from "../../types/api/apiWrapper";
import { AST } from "../../types/parser/AST";
import Line, { LineGenerator, Lines } from "../../types/parser/line";

export default function shCodegen(
    segment: AST.AbstractSyntaxTreeNode,
    context: {
        api: ApiWrapper,
        lineGenerator: LineGenerator
    }): Lines {
    const { api } = context;
    const lines = new Lines();
    const lg = new LineGenerator(lines, undefined, context.lineGenerator);

    return lines;
}