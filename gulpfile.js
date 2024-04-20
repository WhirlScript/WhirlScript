const gulp = require("gulp");
const fs = require("fs-extra");

gulp.task("clear", async function() {
    fs.emptyDirSync("./lib/");
});

gulp.task("post-build", async function() {
    fs.removeSync("./lib/browser/dist");
    fs.removeSync("./lib/browser/whirlscript.d.ts");
    fs.removeSync("./lib/esm/dist");
    fs.removeSync("./lib/esm/whirlscript.d.ts");
    fs.removeSync("./lib/node/dist");
    fs.removeSync("./lib/node/whirlscript.d.ts");
    fs.removeSync("./lib/dist");
    fs.removeSync("./lib/whirlscript.d.ts.map");
});