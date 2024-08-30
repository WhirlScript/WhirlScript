import { AST } from "../../../types/parser/AST";
import ApiWrapper from "../../../types/api/apiWrapper";
import LOG_ERROR from "../../../logger/logError";
import Type from "../../../types/parser/type";
import { LineGenerator, Lines } from "../../../types/parser/line";
import flattenName from "../../../util/parser/flattenGetProperty";
import batTempValue from "./batTempValue";

function assignVal(lg: LineGenerator, to: string, from: string, type: Type) {
    if (type.type == "base") {
        lg.lineAdd(`set ${to}=%${from}%`);
    } else {
        for (const key in type.struct.def) {
            assignVal(lg, `${to}_${key}`, `${from}_${key}`, type.struct.def[key]);
        }
    }
}

export function batSetValue(
    valName: string,
    value: AST.Value,
    context: {
        api: ApiWrapper,
        lineGenerator: LineGenerator
    }): Lines {
    const { api } = context;
    const lines = new Lines();
    const lg = new LineGenerator(lines, undefined, context.lineGenerator);


    if (value instanceof AST.MacroValCall) {
        if (!value.val.value) {
            api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), value.coordinate);
            throw new Error();
        }
        lines.merge(batSetValue(valName, value.val.value, context));
    }

    if (value instanceof AST.ValCall) {
        assignVal(lg, valName, value.val.name.v, value.valueType);
    }

    if (value instanceof AST.Int || value instanceof AST.Bool || value instanceof AST.String) {
        lg.lineAdd(`set ${valName}=${value.value}`);
    }

    if (value instanceof AST.GetProperty) {
        const f = flattenName(value, { api, lineGenerator: lg, setTempValue: batTempValue });
        lg.lineAdd(`set ${valName}=${f.name}`).depsOn(f.lines);
    }

    if (value instanceof AST.StructBlock) {
        for (const key in value.inside) {
            const child = value.inside[key];
            const childName = `${valName}_${key}`;
            lines.merge(batSetValue(childName, child, context));
        }
    }




    // TODO

    return lines;
}