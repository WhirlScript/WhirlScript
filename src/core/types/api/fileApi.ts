export default interface FileApi {
    /**
     * get std lib file in node package (whirlscript/std), if not found throw an error.
     * @param path path based on std
     */
    getStdLib(path: string): string;

    /**
     * get lib file in package manager, if not found throw an error.
     * @param path path based on package root
     */
    getLib(path: string): string;

    /**
     * get lib file in project, if not found throw an error.
     * @param path path based on project root
     */
    getFile(path: string): string;

}