class LogWarning {
    unknownEscape(c:string){
        return `Unknown escape \\${c}`
    }
}

const LOG_WARNING = new LogWarning();
export default LOG_WARNING;