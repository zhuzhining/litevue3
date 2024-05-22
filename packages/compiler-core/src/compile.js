import { baseParse } from './parser'
import { transform } from './transform'
export function baseCompile(source, options) {
    const ast = baseParse(source, options)
    transform(ast, {})
}