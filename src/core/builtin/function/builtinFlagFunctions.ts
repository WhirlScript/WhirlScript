import Func from "../../types/parser/func";
import Type, { BASE_TYPES } from "../../types/parser/type";
import { RSegment } from "../../types/parser/rSegment";
import { BUILTIN_COORDINATE } from "../../types/parser/coordinate";

type Args = {
    name: string,
    type: Type,
    isMacro: boolean,
    optional: boolean,
    defaultValue?: RSegment.Value
}[];

function createFlagFunction(name: string, type: Type, args: Args, deprecated: boolean) {
    const func = new Func(name, BASE_TYPES.void, args, new RSegment.Block(BUILTIN_COORDINATE, [], undefined), {
        deprecated,
        optional: false
    });
    func.flag = name;
    return func;
}

const BUILTIN_FLAG_FUNCTIONS: { [key: string]: Func } = {
    raw: createFlagFunction("raw", BASE_TYPES.void, [{
        name: "code",
        type: BASE_TYPES.string,
        isMacro: false,
        optional: false
    }], false),
    rawln: createFlagFunction("raw", BASE_TYPES.void, [{
        name: "code",
        type: BASE_TYPES.string,
        isMacro: false,
        optional: false
    }], false),
    lit: createFlagFunction("raw", BASE_TYPES.void, [{
        name: "code",
        type: BASE_TYPES.string,
        isMacro: false,
        optional: false
    }], false),
    litln: createFlagFunction("raw", BASE_TYPES.void, [{
        name: "code",
        type: BASE_TYPES.string,
        isMacro: false,
        optional: false
    }], false)
};

export default BUILTIN_FLAG_FUNCTIONS;