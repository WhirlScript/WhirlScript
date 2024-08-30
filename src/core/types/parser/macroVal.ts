import Type from "./type";
import { AST } from "./AST";
import ApiWrapper from "../api/apiWrapper";
import LOG_ERROR from "../../logger/logError";
import ValueWrapper = AST.ValueWrapper;

type MacroValProp = {
    isConst: boolean
    deprecated: boolean
}
export default class MacroVal {
    readonly type: Type;
    readonly prop: MacroValProp;
    value: AST.Value | undefined;

    constructor(type: Type, prop: MacroValProp, value?: AST.Value) {
        this.type = type;
        this.prop = prop;
        this.value = value;
    }

    static fromValue(
        seg: AST.Value,
        isConst: boolean,
        context: {
            api: ApiWrapper
        }
    ): { val: MacroVal, wrapper?: AST.ValueWrapper } {
        if (!seg.isMacro) {
            context.api.logger.errorInterrupt(LOG_ERROR.notMacro(), seg.coordinate);
        }
        const codes: AST.ValueWrapper[] = [];
        let v = seg;
        if (seg instanceof AST.ValueWrapper) {
            codes.push(seg);
            v = <AST.Value>seg.value;
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
            const sb = <AST.StructBlock>seg;
            const inside: { [key: string]: AST.MacroValCall } = {};
            for (const key in seg.valueType.struct.def) {
                const child = this.fromValue(sb.inside[key], isConst, context);
                if (child.wrapper) {
                    codes.push(child.wrapper);
                }
                inside[key] = new AST.MacroValCall(sb.inside[key].coordinate, child.val);
            }
            return {
                val: new MacroVal(
                    seg.valueType,
                    {
                        isConst,
                        deprecated: false
                    },
                    new AST.StructBlock(
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