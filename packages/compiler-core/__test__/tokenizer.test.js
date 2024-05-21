import { tokenizer,NodeTypes,createExp,ConstantTypes } from '../src/tokenizer'
import { expect, test } from 'vitest'

test('文本内容', () => {
    const ast = tokenizer('文本内容')
    const text = ast.children[0]
    console.log(text, 'text');
    expect(text).toStrictEqual({
        type: NodeTypes.TEXT,
        content: '文本内容'
    })
})

test('插值文本内容', () => {
    const ast = tokenizer('文本 {{ message }} 内容')
    const text1 = ast.children[0]
    const interpolation = ast.children[1]
    const text2 = ast.children[2]
    expect(text1).toStrictEqual({
        type: NodeTypes.TEXT,
        content: '文本 '
    })
    expect(interpolation).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content:'message',
            isStatic: false,
            constType: ConstantTypes.NOT_CONSTANT,
            ast: null
          }
      })
    expect(text2).toStrictEqual({
        type: NodeTypes.TEXT,
        content: ' 内容'
    })
})

test('普通标签', () => {
    const ast = tokenizer('<div></div>')
    const element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [],
        children: []
    })
})

test('自闭合标签', () => {
    const ast = tokenizer('<input/>')
    const element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'input',
        props: [],
        children: []
    })
})

test('标签层级', () => {
    const ast = tokenizer('<div>div文本  <input/></div>')
    const element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [],
        children: [{
            type: NodeTypes.TEXT,
            content: 'div文本  '
        },{
            type: NodeTypes.ELEMENT,
            tag: 'input',
            props: [],
            children: []
        }]
    })
})

test('标签 + 普通属性(单引号+双引号)', () => {
    let ast = tokenizer('<div id="foo"></div>')
    let element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.ATTRIBUTE,
            name: 'id',
            value: {
                type: NodeTypes.TEXT,
                content: 'foo'
            },
          }],
        children: []
    })
    ast = tokenizer("<div id='foo'></div>")
    element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.ATTRIBUTE,
            name: 'id',
            value: {
                type: NodeTypes.TEXT,
                content: 'foo'
            },
          }],
        children: []
    })
})

test('标签 + v-指令', () => {
    const ast = tokenizer('<div v-bind:id="foo"></div>')
    const element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'bind',
            rawName: 'bind',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'foo',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
              },
            arg: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'id',
                isStatic: true,
                constType: ConstantTypes.CAN_STRINGIFY,
                ast: null
              },
            modifiers: [],
        }],
        children: []
    })
})

test('标签 + v-指令 + 修饰符', () => {
    const ast = tokenizer('<div v-on:click.stop="click"></div>')
    const element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'on',
            rawName: 'on',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'click',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
              },
            arg: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'click',
                isStatic: true,
                constType: ConstantTypes.CAN_STRINGIFY,
                ast: null
              },
            modifiers: ['stop'],
        }],
        children: []
    })
})

test('标签 + v-指令 + 多个修饰符', () => {
    const ast = tokenizer('<div v-on:click.stop.prevent="click"></div>')
    const element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'on',
            rawName: 'on',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'click',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
              },
            arg: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'click',
                isStatic: true,
                constType: ConstantTypes.CAN_STRINGIFY,
                ast: null
              },
            modifiers: ['stop', 'prevent'],
        }],
        children: []
    })
})

test('标签 + v- + 动态指令', () => {
    const ast = tokenizer('<div v-on:[event]="foo"></div>')
    const element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'on',
            rawName: 'on',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'foo',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
              },
            arg: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'event',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
              },
            modifiers: [],
        }],
        children: []
    })
})

test('标签 + 指令简写', () => {
    let ast = tokenizer('<div :id="foo"></div>')
    let element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'bind',
            rawName: ':',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'foo',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
              },
            arg: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'id',
                isStatic: true,
                constType: ConstantTypes.CAN_STRINGIFY,
                ast: null
              },
            modifiers: [],
        }],
        children: []
    })
    ast = tokenizer('<div @click="click"></div>')
    element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'on',
            rawName: '@',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'click',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
              },
            arg: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'click',
                isStatic: true,
                constType: ConstantTypes.CAN_STRINGIFY,
                ast: null
              },
            modifiers: [],
        }],
        children: []
    })
    ast = tokenizer('<div .id="foo"></div>')
    element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'bind',
            rawName: '.',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'foo',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
              },
            arg: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'id',
                isStatic: true,
                constType: ConstantTypes.CAN_STRINGIFY,
                ast: null
              },
            modifiers: ['prop'],
        }],
        children: []
    })
})

test('标签 + v-for', () => {
    let ast = tokenizer('<div v-for="item in items"></div>')
    let element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'for',
            rawName: 'for',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'item in items',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
            },
            arg: undefined,
            modifiers: [],
            forParseResult: {
                source: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'items',
                    isStatic: false,
                    constType: ConstantTypes.NOT_CONSTANT,
                    ast: null
                },
                value: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'item',
                    isStatic: true,
                    constType: ConstantTypes.CAN_STRINGIFY,
                    ast: null
                },
                key: undefined,
                index: undefined,
                finalized: false,
            }
        }],
        children: []
    })

    ast = tokenizer('<div v-for="(value, key) in maps"></div>')
    element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'for',
            rawName: 'for',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: '(value, key) in maps',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
            },
            arg: undefined,
            modifiers: [],
            forParseResult: {
                source: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'maps',
                    isStatic: false,
                    constType: ConstantTypes.NOT_CONSTANT,
                    ast: null
                },
                value: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'value',
                    isStatic: true,
                    constType: ConstantTypes.CAN_STRINGIFY,
                    ast: null
                },
                key: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'key',
                    isStatic: true,
                    constType: ConstantTypes.CAN_STRINGIFY,
                    ast: null
                },
                index: undefined,
                finalized: false,
            }
        }],
        children: []
    })

    ast = tokenizer('<div v-for="(value, key, idx) in object"></div>')
    element = ast.children[0]
    expect(element).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        props: [{
            type: NodeTypes.DIRECTIVE,
            name: 'for',
            rawName: 'for',
            exp: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: '(value, key, idx) in object',
                isStatic: false,
                constType: ConstantTypes.NOT_CONSTANT,
                ast: null
            },
            arg: undefined,
            modifiers: [],
            forParseResult: {
                source: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'object',
                    isStatic: false,
                    constType: ConstantTypes.NOT_CONSTANT,
                    ast: null
                },
                value: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'value',
                    isStatic: true,
                    constType: ConstantTypes.CAN_STRINGIFY,
                    ast: null
                },
                key: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'key',
                    isStatic: true,
                    constType: ConstantTypes.CAN_STRINGIFY,
                    ast: null
                },
                index: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'idx',
                    isStatic: true,
                    constType: ConstantTypes.CAN_STRINGIFY,
                    ast: null
                },
                finalized: false,
            }
        }],
        children: []
    })
})