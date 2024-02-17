import Type from "./type";
import { RSegment } from "./rSegment";
import ApiWrapper from "../api/apiWrapper";
import LOG_ERROR from "../../logger/logError";
import ValueWrapper = RSegment.ValueWrapper;

type MacroValProp = {
    isConst: boolean
    deprecated: boolean
}
export default class MacroVal {
    readonly type: Type;
    readonly prop: MacroValProp;
    value: RSegment.Value | undefined;

    constructor(type: Type, prop: MacroValProp, value?: RSegment.Value) {
        this.type = type;
        this.prop = prop;
        this.value = value;
    }

    static fromValue(
        seg: RSegment.Value,
        isConst: boolean,
        context: {
            api: ApiWrapper
        }
    ): { val: MacroVal, wrapper?: RSegment.ValueWrapper } {
        if (!seg.isMacro) {
            context.api.logger.errorInterrupt(LOG_ERROR.notMacro(), seg.coordinate);
        }
        const codes: RSegment.ValueWrapper[] = [];
        let v = seg;
        if (seg.type == "ValueWrapper") {
            codes.push(<RSegment.ValueWrapper>seg);
            v = <RSegment.Value>(<RSegment.ValueWrapper>seg).value;
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
            const sb = <RSegment.StructBlock>seg;
            const inside: { [key: string]: RSegment.MacroValCall } = {};
            for (const key in seg.valueType.struct.def) {
                const child = this.fromValue(sb.inside[key], isConst, context);
                if (child.wrapper) {
                    codes.push(child.wrapper);
                }
                inside[key] = new RSegment.MacroValCall(sb.inside[key].coordinate, child.val);
            }
            return {
                val: new MacroVal(
                    seg.valueType,
                    {
                        isConst,
                        deprecated: false
                    },
                    new RSegment.StructBlock(
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