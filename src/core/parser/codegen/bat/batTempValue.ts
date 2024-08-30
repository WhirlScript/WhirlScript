import { AST } from "../../../types/parser/AST";
import ApiWrapper from "../../../types/api/apiWrapper";
import { LineGenerator, Lines } from "../../../types/parser/line";
import { batSetValue } from "./batSetValue";

// /**
//  * val name: `_temp${valIndex}`
//  * @param segment
//  * @param context
//  */
export default function batTempValue(
    segment: AST.Value,
    context: {
        api: ApiWrapper,
        lineGenerator: LineGenerator
    }): { lines: Lines, id: number } {
    const { api } = context;
    const lines = new Lines();
    const lg = new LineGenerator(lines, undefined, context.lineGenerator);

    let valIndex = -1;
    for (let i = 0; i < tempVal.length; i++) {
        if (!tempVal[i]) {
            valIndex = i;
            tempVal[i] = true;
            break;
        }
    }
    if (valIndex == -1) {
        valIndex = tempVal.length;
        tempVal.push(true);
    }

    // if (segment instanceof ASTN.Int || segment instanceof ASTN.Bool || segment instanceof ASTN.String) {
    //     lg.lineAdd(`set _temp${valIndex}=${segment.value}`);
    // }

    // if (segment instanceof ASTN.MacroValCall) {
    //     if (!segment.val.value) {
    //         api.logger.errorInterrupt(LOG_ERROR.reallyWeird(), segment.coordinate);
    //         throw new Error();
    //     }
    //     if (segment.val.value.valueType.type == "base") {
    //         lg.lineAdd(`set _temp${valIndex}=${(<ASTN.MacroBase>segment.val.value).value}`);
    //     } else {
    //
    //         // TODO
    //     }
    // }
    return {
        lines: batSetValue(`_temp${valIndex}`, segment, { api, lineGenerator: context.lineGenerator }),
        id: valIndex
    };


}

/**
 * true as occupied
 */
export const tempVal: boolean[] = [];