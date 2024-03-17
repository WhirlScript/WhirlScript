import Type, { BASE_TYPES } from "../../types/parser/type";
import { Segment } from "../../types/parser/segment";
import Coordinate from "../../types/parser/coordinate";
import ApiWrapper from "../../types/api/apiWrapper";
import Pools from "./pools";
import LOG_ERROR from "../../logger/logError";
import Struct from "../../types/parser/struct";
import { RSegment } from "../../types/parser/rSegment";

class TypeCalcC {
    equalsTo(type1: Type, type2: Type): boolean {
        if (type1 == type2) {
            return true;
        }
        if (type1.type != type2.type) {
            return false;
        }
        if (type1.type == "base" && type2.type == "base") {
            return type1.base == type2.base;
        }
        if (type1.type == "struct" && type2.type == "struct") {
            if (Object.getOwnPropertyNames(type1).length != Object.getOwnPropertyNames(type2).length) {
                return false;
            }
            for (const type1Key in type1.struct.def) {
                if (!this.equalsTo(type1.struct.def[type1Key], type2.struct.def[type1Key])) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    contains(type1: Type, type2: Type): boolean {
        if (type1 == type2) {
            return true;
        }
        if (type1.type != type2.type) {
            return false;
        }
        if (type1.type == "base" && type2.type == "base") {
            if (type1.base == type2.base) {
                return true;
            }
            if (type1.base == "void" || type2.base == "void") {
                return false;
            }
            if (type1.base == type2.base) {
                return true;
            }
            if (type2.base == "string") {
                return true;
            }
            return type1.base == "boolean" && type2.base == "int";

        }
        if (type1.type == "struct" && type2.type == "struct") {
            for (const type2Key in type2.struct.def) {
                if (!this.contains(type1.struct.def[type2Key], type2.struct.def[type2Key])) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    getTypeWithName(name: Segment.Name, context: { pools: Pools, api: ApiWrapper, namespace: string[] }): Type {
        if (name.namespaces.length == 0) {
            if (name.value == "int") {
                return BASE_TYPES.int;
            }
            if (name.value == "boolean") {
                return BASE_TYPES.boolean;
            }
            if (name.value == "string") {
                return BASE_TYPES.string;
            }
            if (name.value == "void") {
                return BASE_TYPES.void;
            }
        }
        const symbol = context.pools.getSymbol(name, name.coordinate, {
            api: context.api,
            namespace: context.namespace
        });
        if (symbol.type != "Struct") {
            context.api.logger.errorInterrupt(LOG_ERROR.notAType(name.value));
        }
        return {
            type: "struct",
            struct: <Struct>symbol.value
        };
    }

    valueToObj(value: RSegment.Value, coordinate: Coordinate, context: { api: ApiWrapper }): any {
        if (!value.isMacro) {
            context.api.logger.errorInterrupt(LOG_ERROR.notMacro(), coordinate);
        }
        let va = value;
        const t = va.valueType;
        if (va instanceof RSegment.ValueWrapper) {
            const r = va.value;
            if (r) {
                va = r;
            } else {
                context.api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), coordinate);
            }
        }
        if (va instanceof RSegment.MacroValCall) {
            const val = va.val;
            if (!val.value) {
                context.api.logger.errorInterrupt(LOG_ERROR.useBeforeInit(), coordinate);
            }
            va = val.value;
        }
        if (!this.equalsTo(t, va.valueType)) {
            if (t.type != va.valueType.type) {
                context.api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), value.coordinate);
            }
            if (this.equalsTo(t, BASE_TYPES.boolean)) {
                const str = (<RSegment.MacroBase>va).toStr().value;
                if (str == "1") {
                    return true;
                }
                if (str == "0") {
                    return false;
                }
                context.api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), value.coordinate);
            }
            if (this.equalsTo(t, BASE_TYPES.int)) {
                const num = Number((<RSegment.MacroBase>va).toStr().value);
                if (isNaN(num)) {
                    context.api.logger.errorInterrupt(LOG_ERROR.mismatchingType(), value.coordinate);
                }
                return num;
            }
        }
        if (va instanceof RSegment.StructBlock) {
            const obj: any = {};
            for (const key in va.inside) {
                let v = va.inside[key];
                if (v instanceof RSegment.ValueWrapper) {
                    const r = v.value;
                    if (r) {
                        v = r;
                    } else {
                        context.api.logger.errorInterrupt(LOG_ERROR.mismatchFunctionCall(), coordinate);
                    }
                }
                obj[key] = this.valueToObj(<RSegment.StructBlock>va.inside[key], coordinate, context);

            }
            return obj;
        } else {
            return (<RSegment.MacroBase>va).value;
        }
    }

    objToValue(obj: any, coordinate: Coordinate, context: { api: ApiWrapper }): RSegment.Value {
        if (obj == undefined) {
            return new RSegment.Void(coordinate);
        }
        if (typeof obj == "boolean") {
            return new RSegment.Bool(coordinate, obj);
        }
        if (typeof obj == "number") {
            return new RSegment.Int(coordinate, obj);
        }
        if (typeof obj == "string") {
            return new RSegment.String(coordinate, obj);
        }
        if (typeof obj != "object") {
            context.api.logger.errorInterrupt(LOG_ERROR.nativeValueError(obj), coordinate);
        }
        const def: { [key: string]: Type } = {};
        const inside: { [key: string]: RSegment.Value } = {};
        for (const key in obj) {
            inside[key] = this.objToValue(obj[key], coordinate, context);
            def[key] = inside[key].valueType;
        }
        const struct = new Struct("", def);
        return new RSegment.StructBlock(
            coordinate,
            inside,
            {
                type: "struct",
                struct
            }
        );
    }
}

export default new TypeCalcC();