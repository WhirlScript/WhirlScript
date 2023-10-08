type FileApiReturn = {
    value: string,
    path: string,
    success: boolean
}

export default interface FileApi {
    /**
     * get lib file (1.in package manager (default as $project_root/wrs_packages); 2.in this node package's lib), if not found set success to false.
     * @param path path based on base(if exist) or project root
     * @param base base file path
     */
    getLib(path: string, base?: string): FileApiReturn;

    /**
     * get file in project, if not found set success to false.
     * @param path path based on base(if exist) or project root
     * @param base base file path
     */
    getFile(path: string, base?: string): FileApiReturn;

}