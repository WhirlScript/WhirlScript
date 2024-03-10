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
    const func = new Func(name, type, args, new RSegment.Block(BUILTIN_COORDINATE, [], undefined), {
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
    exec: createFlagFunction("exec", BASE_TYPES.void, [{
        name: "code",
        type: BASE_TYPES.string,
        isMacro: false,
        optional: false
    }], false),
    name: createFlagFunction("name", BASE_TYPES.void, [{
        name: "code",
        type: BASE_TYPES.string,
        isMacro: false,
        optional: false
    }], false),
    getOutput: createFlagFunction("getOutput", BASE_TYPES.string, [{
        name: "c",
        type: BASE_TYPES.command,
        isMacro: false,
        optional: false
    }], false),
    pipe: createFlagFunction("pipe", BASE_TYPES.command, [{
        name: "c1",
        type: BASE_TYPES.command,
        isMacro: false,
        optional: false
    }, {
        name: "c2",
        type: BASE_TYPES.command,
        isMacro: false,
        optional: false
    }], false),
    toFile: createFlagFunction("toFile", BASE_TYPES.void, [{
        name: "c",
        type: BASE_TYPES.command,
        isMacro: false,
        optional: false
    }], false),
    toNewFile: createFlagFunction("toNewFile", BASE_TYPES.void, [{
        name: "c",
        type: BASE_TYPES.command,
        isMacro: false,
        optional: false
    }], false),
    arg: createFlagFunction("arg", BASE_TYPES.string, [{
        name: "n",
        type: BASE_TYPES.int,
        isMacro: true,
        optional: false
    }], false)
};

export default BUILTIN_FLAG_FUNCTIONS;