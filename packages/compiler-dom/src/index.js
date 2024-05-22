import { baseCompile, baseParse } from '../../compiler-core';

export function compile(src, options) {
    return baseCompile(src, options)
}

export function parser(template, options) {
    return baseParse(template, options)
}