const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const terser = require("@rollup/plugin-terser");
const autoExternal = require("rollup-plugin-auto-external");
const bundleSize = require("rollup-plugin-bundle-size");
const path = require("path");
const typescript = require("@rollup/plugin-typescript");

const lib = require("./package.json");
const babel = require("@rollup/plugin-babel");
const { dts } = require("rollup-plugin-dts");
const builtins = require("rollup-plugin-node-builtins");
const json = require("@rollup/plugin-json");
const outputFileName = "whirlscript";
const name = "whirlscript";
const namedInput = "./src/whirlscript.ts";
const defaultInput = "./src/whirlscript.ts";
const cliInput = "./src/cli/index.ts";
const cliOutput = "./lib/cli.js";

const buildConfig = ({ es5, browser = true, minifiedVersion = true, ...config }) => {
    const { file } = config.output;
    const ext = path.extname(file);
    const basename = path.basename(file, ext);
    const extArr = ext.split(".");
    extArr.shift();


    const build = ({ minified }) => ({
        input: namedInput,
        ...config,
        output: {
            ...config.output,
            file: `${path.dirname(file)}/${basename}.${(minified ? ["min", ...extArr] : extArr).join(".")}`
        },
        plugins: [
            builtins({ crypto: true }),
            resolve({ browser }),
            json(),
            commonjs(),
            minified && terser(),
            minified && bundleSize(),
            ...(es5 ? [babel({
                babelHelpers: "bundled",
                presets: ["@babel/preset-env"]
            })] : []),
            ...(config.plugins || []),
            typescript({
                tsconfig: "./tsconfig.rollup.json"
            })
        ]
    });

    const configs = [
        build({ minified: false })
    ];

    if (minifiedVersion) {
        configs.push(build({ minified: true }));
    }

    return configs;
};

module.exports = async () => {
    const year = new Date().getFullYear();
    const banner = `// WhirlScript v${lib.version} Copyright (c) ${year} ${lib.author} and contributors`;

    return [
        // browser ESM bundle for CDN
        ...buildConfig({
            input: namedInput,
            output: {
                file: `lib/esm/${outputFileName}.js`,
                format: "esm",
                exports: "named",
                banner
            }
        }),

        // Browser UMD bundle for CDN
        ...buildConfig({
            input: defaultInput,
            es5: true,
            output: {
                file: `lib/${outputFileName}.js`,
                name,
                format: "umd",
                exports: "default",
                banner
            }
        }),

        // Browser CJS bundle
        ...buildConfig({
            input: defaultInput,
            es5: false,
            minifiedVersion: false,
            output: {
                file: `lib/browser/${name}.cjs`,
                name,
                format: "cjs",
                exports: "default",
                banner
            }
        }),

        // Node.js commonjs bundle
        {
            input: defaultInput,
            output: {
                file: `lib/node/${name}.cjs`,
                format: "cjs",
                exports: "default",
                banner
            },
            plugins: [
                autoExternal(),
                resolve(),
                commonjs(),
                typescript({
                    tsconfig: "./tsconfig.rollup.json"
                })
            ]
        },

        {
            input: `lib/dist/${outputFileName}.d.ts`,
            plugins: [dts()],
            output: {
                format: "esm",
                file: `lib/${outputFileName}.d.ts`
            }
        },

        // Node.js cli bundle
        {
            input: cliInput,
            output: {
                file: cliOutput,
                format: "cjs",
                banner
            },
            plugins: [
                autoExternal(),
                resolve(),
                commonjs(),
                typescript({
                    tsconfig: "./tsconfig.rollup.json"
                })
            ]
        }
    ];
};