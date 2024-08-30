import { AST } from "../../types/parser/AST";
import ApiWrapper from "../../types/api/apiWrapper";
import LOG_ERROR from "../../logger/logError";
import { LineGenerator, Lines } from "../../types/parser/line";

/**
 * return like "aaa_bbb" "_temp123"
 * @param context
 * @param value
 */
export default function flattenGetProperty(value: AST.GetProperty, context: {
    api: ApiWrapper,
    lineGenerator: LineGenerator,
    setTempValue: (
        segment: AST.Value,
        context: {
            api: ApiWrapper,
            lineGenerator: LineGenerator
        }) => { lines: Lines, id: number }
}): { lines: Lines, name: string } {
    const { api, setTempValue } = context;
    if (value.structValue.valueType.type == "base" || value.structValue.valueType.struct.def[value.property] == undefined) {
        api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), value.coordinate);
    }
    if (value.structValue instanceof AST.ValCall) {
        return { lines: new Lines(), name: `${value.structValue.val.name}_${value.property}` };
    } else if (value.structValue instanceof AST.GetProperty) {
        return { lines: new Lines(), name: `${flattenGetProperty(value.structValue, context).name}_${value.property}` };
    } else {
        let v = setTempValue(value.structValue, context);
        return { lines: v.lines, name: `_temp${v.id}_${value.property}` };
    }
}