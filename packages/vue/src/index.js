import { registerRuntimeCompiler } from '../../runtime-dom'
import { compile } from '../../compiler-dom'

function compileToFunction(template, options) {
    const { code } = compile(template, opts)
}

registerRuntimeCompiler(compileToFunction)