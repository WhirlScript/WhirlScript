import ApiWrapper from "../../../types/api/apiWrapper";
import { AST } from "../../../types/parser/AST";
import LOG_WARNING from "../../../logger/logWarning";
import Line, { LineGenerator, Lines } from "../../../types/parser/line";

export default function batCodegen(
    segment: AST.AbstractSyntaxTreeNode,
    context: {
        api: ApiWrapper,
        lineGenerator: LineGenerator
    }): Lines {
    const { api } = context;
    const lines = new Lines();
    const lg = new LineGenerator(lines, undefined, context.lineGenerator);

    if (segment instanceof AST.Empty) {
        api.logger.warning(LOG_WARNING.internalWarning("Empty segment in codegen"), segment.coordinate);
        return lines;
    }

    if (segment instanceof AST.EmptyValue) {
        api.logger.warning(LOG_WARNING.internalWarning("Empty segment in codegen"), segment.coordinate);
        return lines;
    }

    if (segment instanceof AST.Int || segment instanceof AST.Bool || segment instanceof AST.String) {
        return lines;
    }

    if (segment instanceof AST.MacroValCall) {
        return lines;
    }

    if (segment instanceof AST.ValCall || segment instanceof AST.MacroValCall) {
        return lines;
    }

    if (segment instanceof AST.If) {
        // TODO
    }
    // TODO

    return lines;
}