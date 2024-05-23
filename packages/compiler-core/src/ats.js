export const NodeTypes = {
    ROOT: 1,
    ELEMENT: 2,
    TEXT: 3,
    COMMENT: 4,
    SIMPLE_EXPRESSION: 5,
    INTERPOLATION: 6,
    ATTRIBUTE: 7,
    DIRECTIVE: 8,
    // containers
    COMPOUND_EXPRESSION: 9,
    IF: 10,
    IF_BRANCH: 12,
    FOR: 13,
    TEXT_CALL: 14,
    // codegen
    VNODE_CALL: 15,
    JS_CALL_EXPRESSION: 16,
    JS_OBJECT_EXPRESSION: 17,
    JS_PROPERTY: 18,
    JS_ARRAY_EXPRESSION: 19,
    JS_FUNCTION_EXPRESSION: 20,
    JS_CONDITIONAL_EXPRESSION: 21,
    JS_CACHE_EXPRESSION: 22,
  
    // ssr codegen
    JS_BLOCK_STATEMENT: 23,
    JS_TEMPLATE_LITERAL: 24,
    JS_IF_STATEMENT: 25,
    JS_ASSIGNMENT_EXPRESSION: 26,
    JS_SEQUENCE_EXPRESSION: 27,
    JS_RETURN_STATEMENT: 28,
}

export function createRoot(children, source) {
    return {
        type: NodeTypes.ROOT,
        children,
        source,
        helpers: new Set(),
        components: [],
        directives: [],
        hoists: [],
        imports: [],
        cached: 0,
        temps: 0,
        codegenNode: undefined,
    }
}