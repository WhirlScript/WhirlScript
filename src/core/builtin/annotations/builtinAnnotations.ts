import Annotation from "../../types/parser/annotation";

const BUILTIN_ANNOTATIONS: { [key: string]: Annotation } = {
    "@sh": new Annotation("@sh"),
    "@bat": new Annotation("@bat"),
    "@deprecated": new Annotation("@deprecated"),
    "@final": new Annotation("@final"),
    "@env": new Annotation("@env"),
    "@editable": new Annotation("@editable"),
    "@optional": new Annotation("@optional"),
    "@noScope": new Annotation("@noScope"),
    "@constexpr": new Annotation("@constexpr"),
    "@const": new Annotation("@const")
};

export { BUILTIN_ANNOTATIONS };