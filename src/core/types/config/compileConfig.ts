export class CompileConfig {
    constructor(config: any) {
        if (typeof config != "object") {
            config = {};
        }
        const check = (v: any, type: string, defaultValue: any) => {
            if (typeof v != type) {
                return defaultValue;
            }
            return v;
        };
        this.target = config.target ?? [];
        this.pretty = check(config.pretty, "boolean", true);
        this.indent = check(config.indent, "string", "    ");

    }

    target: "bat" | "sh" | ("bat" | "sh")[];
    pretty: boolean;
    indent: string;


}