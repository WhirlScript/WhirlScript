import { WhirlWarning } from "../types/api/loggerApi";

class LogWarning {
    readonly WARNING_TYPES = {
        WARNING: "Warning"
    };

    unknownEscape(c: string): WhirlWarning {
        return {
            type: this.WARNING_TYPES.WARNING,
            details: `Unknown escape \\${c}`
        };
    }

    deprecated(r: string): WhirlWarning {
        return {
            type: this.WARNING_TYPES.WARNING,
            details: `${r} is deprecated`
        };
    }

    macroArgInRuntimeFunction(): WhirlWarning {
        return {
            type: this.WARNING_TYPES.WARNING,
            details: "Macro argument in runtime function makes no sense. It will be ignored"
        };
    }

    notExpandable(): WhirlWarning {
        return {
            type: this.WARNING_TYPES.WARNING,
            details: "The statement is not expandable"
        };
    }
}

const LOG_WARNING = new LogWarning();
export default LOG_WARNING;