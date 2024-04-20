import Type from "./type";
import { ASTN } from "./astn";
import ApiWrapper from "../api/apiWrapper";
import LOG_ERROR from "../../logger/logError";
import ValueWrapper = ASTN.ValueWrapper;

type MacroValProp = {
    isConst: boolean
    deprecated: boolean
}
export default class MacroVal {
    readonly type: Type;
    readonly prop: MacroValProp;
    value: ASTN.Value | undefined;

    constructor(type: Type, prop: MacroValProp, value?: ASTN.Value) {
        this.type = type;
        this.prop = prop;
        this.value = value;
    }

    static fromValue(
        seg: ASTN.Value,
        isConst: boolean,
        context: {
            api: ApiWrapper
        }
    ): { val: MacroVal, wrapper?: ASTN.ValueWrapper } {
        if (!seg.isMacro) {
            context.api.logger.errorInterrupt(LOG_ERROR.notMacro(), seg.coordinate);
        }
        const codes: ASTN.ValueWrapper[] = [];
        let v = seg;
        if (seg instanceof ASTN.ValueWrapper) {
            codes.push(seg);
            v = <ASTN.Value>seg.value;
        }
        if (seg.valueType.type == "base") {
            return {
                val: new MacroVal(
                    seg.valueType,
                    {
                        isConst,
                        deprecated: false
                    },
                    v
                ),
                wrapper: codes.length == 0 ? undefined : codes[0]
            };
        } else {
            const sb = <ASTN.StructBlock>seg;
            const inside: { [key: string]: ASTN.MacroValCall } = {};
            for (const key in seg.valueType.struct.def) {
                const child = this.fromValue(sb.inside[key], isConst, context);
                if (child.wrapper) {
                    codes.push(child.wrapper);
                }
                inside[key] = new ASTN.MacroValCall(sb.inside[key].coordinate, child.val);
            }
            return {
                val: new MacroVal(
                    seg.valueType,
                    {
                        isConst,
                        deprecated: false
                    },
                    new ASTN.StructBlock(
                        seg.coordinate,
                        inside,
                        seg.valueType
                    )
                ),
                wrapper: codes.length == 0 ? undefined : codes.length == 1 ? codes[0] : new ValueWrapper(
                    seg.coordinate,
                    seg.valueType,
                    codes,
                    {
                        isMacro: false,
                        hasScope: false
                    }
                )
            };
        }
    }

}