export default class Line {
    code: string;
    required: boolean = false;
    deps: Line[] = [];

    static empty = new Line("");

    constructor(code: string) {
        this.code = code;
    }

    require(): Line {
        this.required = true;
        for (const dep of this.deps) {
            if (!dep.required) {
                dep.require();
            }
        }
        return this;
    }

    depsOn(lines: Lines): Line {
        this.deps.push(...lines.data);
        return this;
    }

    dependent(...args: Line[]): Line {
        this.deps = this.deps.concat(args);
        return this;
    }
}

export class Lines {
    data: Line[] = [];

    push(line: Line) {
        this.data.push(line);
        return this;
    }

    merge(lines: Lines) {
        this.data.push(...lines.data);
    }

    pop(line: Line) {
        this.data.push(line);
        return this;
    }
}

export class LineGenerator {
    protected configIndent: string;
    indent: number = 0;
    protected lines: Lines;

    constructor(lines: Lines, configIndent: string | undefined, old?: LineGenerator) {
        if (configIndent == undefined) {
            if (old == undefined) {
                throw new Error();
            }
            this.configIndent = old.configIndent;
        } else {
            this.configIndent = configIndent;
        }
        this.lines = lines;
    }

    line(code: string): Line {
        return new Line(this.configIndent.repeat(this.indent) + code + "\n");
    }


    lineAdd(code: string): Line {
        const line = this.line(code);
        this.lines.push(line);
        return line;
    }
}