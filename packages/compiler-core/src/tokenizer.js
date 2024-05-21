import {
    ParserOptions,
    parse,
    parseExpression,
  } from '@babel/parser'

export const State = {
    Text: 1,
     // interpolation
  InterpolationOpen: 2,
  Interpolation: 3,
  InterpolationClose: 4,

  // Tags
  BeforeTagName: 5, // After <
  InTagName: 6,
  InSelfClosingTag: 7,
  BeforeClosingTagName: 8,
  InClosingTagName: 9,
  AfterClosingTagName: 10,

  // Attrs
  BeforeAttrName: 11,
  InAttrName: 12,
  InDirName: 13,
  InDirArg: 14,
  InDirDynamicArg: 15,
  InDirModifier: 16,
  AfterAttrName: 17,
  BeforeAttrValue: 18,
  InAttrValueDq: 19, // "
  InAttrValueSq: 20, // '
  InAttrValueNq: 21,

  // Declarations
  BeforeDeclaration: 22, // !
  InDeclaration: 23,

  // Processing instructions
  InProcessingInstruction: 24, // ?

  // Comments & CDATA
  BeforeComment: 25,
  CDATASequence: 26,
  InSpecialComment: 27,
  InCommentLike: 28,

  // Special tags
  BeforeSpecialS: 29, // Decide if we deal with `<script` or `<style`
  BeforeSpecialT: 30, // Decide if we deal with `<title` or `<textarea`
  SpecialStartSequence: 31,
  InRCDATA: 32,

  InEntity: 33,

  InSFCRootTagName: 34,
}

const ExpParseMode = {
    Normal: 1,
    Params: 2,
    Statements: 3,
    Skip: 4,
}

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

export const ConstantTypes = {
    NOT_CONSTANT: 0,
    CAN_SKIP_PATCH: 1,
    CAN_HOIST: 2,
    CAN_STRINGIFY: 3,
}

let currentProps = null

export function tokenizer(str) {
    const Root = {
        type: NodeTypes.ROOT,
        children: [],
    }
    let index = 0
    let sectionStart = 0
    let stack = []
    function addNode(child) {
        let parent = stack[stack.length - 1] || Root
        parent.children.push(child)
    }
    function pushProps() {
        let currentTag = stack[stack.length - 1] || Root
        currentTag.props.push(currentProps)
        currentProps = null
    }
    let state = State.Text
    while(index < str.length) {
        const char = str[index]
        switch(state) {
            case State.Text:
                if(char === '<') {
                    //遇到<字符，将状态转换为标签开始状态
                    state = State.BeforeTagName
                     //在转换状态之前，如果有一段文本，则收集成文本节点
                    if(index > sectionStart) {
                        addNode({
                            type: NodeTypes.TEXT,
                            content: str.slice(sectionStart, index)
                        })
                        //将节选开始索引移动到当前索引
                        sectionStart = index
                    }
                } else if(char === '{') {
                    //遇到{字符，将状态转换为插值开始状态
                    state = State.InterpolationOpen
                }
                break
            case State.InterpolationOpen:
                //是插值
                if(char === '{') {
                    //在转换状态之前，如果有一段文本，则收集成文本节点
                    if(index > sectionStart) {
                        addNode({
                            type: NodeTypes.TEXT,
                            content: str.slice(sectionStart, index - 1)
                        })
                    }
                    sectionStart = index + 1
                    state = State.Interpolation
                } else {
                    //如果不是插值，则继续回到文本状态
                    state = State.Text
                }
                break
            case State.Interpolation:
                if(char === '}') {
                    state = State.InterpolationClose
                }
                break
            case State.InterpolationClose:
                if(char === '}') {
                    const exp = str.slice(sectionStart, index - 1).trim()
                    addNode({
                        type: NodeTypes.INTERPOLATION,
                        content: createExp(exp, false)
                      })
                    state = State.Text
                    sectionStart = index + 1
                }
                break
            case State.BeforeTagName:
                console.log('BeforeTagName', char);
                if(char === '/') {
                    //遇到/字符，将状态转换为结束标签开始状态
                    state = State.BeforeClosingTagName
                    sectionStart = index
                } else if(isTagStartChar(char)) {
                    state = State.InTagName
                    sectionStart = index
                }
                break
            case State.BeforeClosingTagName:
                console.log('BeforeClosingTagName');
                if(isTagStartChar(char)) {
                    state = State.InClosingTagName
                    sectionStart = index
                }
                break
            case State.InClosingTagName:
                if(char === '>') {
                    console.log('InClosingTagName:', char);
                    state = State.Text
                    stack.pop()
                    sectionStart = index + 1
                }
                break
            case State.InTagName:
                //如果不是标签名称字符，则认为标签名称收集结束，开始进行属性收集
                if(!isTagStartChar(char)) {
                    const element = {
                        type: NodeTypes.ELEMENT,
                        tag: str.slice(sectionStart, index),
                        props: [],
                        children: []
                    }
                    addNode(element)
                    //将标签节点放入栈中
                    stack.push(element)
                    sectionStart = index
                    if(char === '>') {
                        //遇到>则认为标签结束
                        state = State.Text
                        sectionStart = index + 1
                    } else {
                        state = State.BeforeAttrName
                        sectionStart = index
                    }
                }
                break
            case State.BeforeAttrName:
                console.log('BeforeAttrName');
                if(char === '/') {
                    //查找属性遇到/字符，则说明是自闭合标签
                    state = State.InSelfClosingTag
                    sectionStart = index
                } else if(char === '>') {
                    //遇到>则认为标签结束
                    state = State.Text
                    sectionStart = index + 1
                } else if(char === 'v' && str[index + 1] === '-') {
                    //遇到v-开头，则是指令
                    state = State.InDirName
                    //把-字符也消费掉
                    index++
                    sectionStart = index + 1
                } else if(isDirabbreviation(char)) {
                    //遇到指令简写,先创建指令属性节点
                    createDirProp(char)
                    sectionStart = index + 1
                    state = State.InDirArg
                    
                } else if(!isWhitespace(char)) {
                    //普通属性
                    state = State.InAttrName
                    sectionStart = index
                } else {
                    //没遇到上述情况，则消费了其他字符，选取开始索引要与index齐平
                    sectionStart = index
                }
                
                break
            case State.InSelfClosingTag:
                if(char === '>') {
                    state = State.Text
                    stack.pop()
                } else {
                    //没遇到上述情况，则消费了其他字符，选取开始索引要与index齐平
                    sectionStart = index
                }
                
                break
            case State.InDirName:
                if(char === ':') {
                    //<button v-on:click.once="doThis"></button>这种情况以':'结束
                    state = State.InDirArg
                    //此处sectionStart+2是去掉v-字符
                    const name = str.slice(sectionStart, index)
                    //TODO 处理v-pre
                    createDirProp(name)
                    sectionStart = index + 1
                } else if(char === '=') {
                    //<button v-on="{ mousedown: doThis, mouseup: doThat }"></button>这种情况以'='结束
                    state = State.BeforeAttrValue
                    //此处sectionStart+2是去掉v-字符
                    const name = str.slice(sectionStart , index)
                    createDirProp(name)
                }
                break
            case State.InDirArg:
                if(char === '=') {
                    //v-bind:click=
                    const arg = str.slice(sectionStart, index)
                    //判断是否动态指令，<a v-on:[eventName]="doSomething">
                    const isStatic = arg[0] !== '['
                    currentProps.arg = createExp(isStatic ? arg : arg.slice(1, -1), isStatic)
                    state = State.BeforeAttrValue
                    sectionStart = index
                    
                } else if(char === '.') {
                    //v-bind:click.stop.prevent 有指令修饰符
                    const arg = str.slice(sectionStart, index)
                    //判断是否动态指令，<a v-on:[eventName]="doSomething">
                    const isStatic = arg[0] !== '['
                    currentProps.arg = createExp(isStatic ? arg : arg.slice(1, -1), isStatic)
                    state = State.InDirModifier
                    sectionStart = index + 1
                }
                break
            case State.InDirModifier:
                if(char === '.') {
                    const mod = str.slice(sectionStart, index)
                    currentProps.modifiers.push(mod)
                    sectionStart = index + 1
                } else if(char === '=') {
                    const mod = str.slice(sectionStart, index)
                    currentProps.modifiers.push(mod)
                    state = State.BeforeAttrValue
                    sectionStart = index
                }
                break
            case State.BeforeAttrValue:
                if(char === '"') {
                    state = State.InAttrValueDq
                    sectionStart = index + 1
                } else if(char === "'") {
                    state = State.InAttrValueSq
                    sectionStart = index + 1
                }
                break
            case State.InAttrValueDq:
                if(char === '"') {
                    //属性值为双引号的，遇到双引号则结束
                    state = State.BeforeAttrName
                    const attrValue = str.slice(sectionStart, index)
                    handleAttrValue(attrValue)
                    pushProps()
                    sectionStart = index
                }
                break
            case State.InAttrValueSq:
                if(char === "'") {
                    //属性值为单引号的，遇到单引号则结束
                    state = State.BeforeAttrName
                    const attrValue = str.slice(sectionStart, index)
                    handleAttrValue(attrValue)
                    pushProps()
                    sectionStart = index
                }
                break
            case State.InAttrName:
                if(char === '=') {
                    state = State.BeforeAttrValue
                    
                    currentProps = {
                        type: NodeTypes.ATTRIBUTE,
                        name: str.slice(sectionStart, index),
                        value: undefined,
                      }
                    sectionStart = index
                }
                break
        }
        index++
    }
    //有剩余处理成文本节点
    if(sectionStart < index) {
        addNode({
            type: NodeTypes.TEXT,
            content: str.slice(sectionStart, index)
        })
    }
    console.log(JSON.stringify(Root));
    return Root
}

function handleAttrValue(value) {
    if (currentProps.type === NodeTypes.ATTRIBUTE) {
        currentProps.value = {
            type: NodeTypes.TEXT,
            content: value
        }
    } else {
        //指令属性
        currentProps.exp = createExp(value, false)
        //TODO v-for指令要处理一下表达式
        if(currentProps.name === 'for') {
            currentProps.forParseResult = parseForExpression(currentProps.exp)
        }
    }
}

function isTagStartChar(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

function isWhitespace(c) {
    return c === ' ' || c === '\n' || c === '\t'
}

function createDirProp(rawName) {
    console.log('rawName', rawName);
    const name = rawName === ':' || rawName === '.' ? 'bind' : 
                 rawName === '@' ? 'on' :
                 rawName === '#' ? 'slot' : rawName
    currentProps = {
        type: NodeTypes.DIRECTIVE,
        name,
        rawName,
        exp: undefined,
        arg: undefined,
        //'.'是v-bind.prop缩写，所以修饰符要加上prop
        modifiers: rawName === '.' ? ['prop'] : [],
    }
}

export function createExp(content, isStatic, parseMode = ExpParseMode.Normal) {
    const result = {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content,
        isStatic,
        constType: isStatic ? ConstantTypes.CAN_STRINGIFY : ConstantTypes.NOT_CONSTANT,
        ast: null
      }
      //TODO expParseMode 来处理ast
      if (parseMode === ExpParseMode.Statements) {
        // v-on with multi-inline-statements, pad 1 char
        exp.ast = parse(` ${content} `, options).program
      } else if (parseMode === ExpParseMode.Params) {
        exp.ast = parseExpression(`(${content})=>{}`, options)
      } else {
        // normal exp, wrap with parens
        exp.ast = parseExpression(`(${content})`, options)
      }
      return result
      

}
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g
const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
function parseForExpression(input) {
    //先解析表达式 item in items => [, item, items] (value, key) in myObject => [,(value, key), myObject]
    const exp = input.content
    const inMatch = exp.match(forAliasRE)
    if (!inMatch) return
  
    const [, LHS, RHS] = inMatch

    const result = {
        source: createExp(RHS, false),
        value: undefined,
        key: undefined,
        index: undefined,
        finalized: false,
    }
    //如果有括号，去掉括号(value, key) => value, key
    let valueContent = LHS.trim().replace(stripParensRE, '').trim()
    //判断是否有逗号分割，例如 value, key
    const iteratorMatch = valueContent.match(forIteratorRE)
    if(iteratorMatch) {
        //提取value, 例如：value, key => value
        valueContent = valueContent.replace(forIteratorRE, '').trim()
        //获取key
        let keyContent = iteratorMatch[1].trim()
        if(keyContent) {
            result.key = createExp(keyContent, true)
        }
        //'value, key, index' => [', key, index', ' key', ' index'],如果有index，第三个就是index
        if(iteratorMatch[2]) {
            let indexContent = iteratorMatch[2].trim()
            if(indexContent) {
                result.index = createExp(indexContent, true)
            }
        }
    }
    if(valueContent) {
        result.value = createExp(valueContent, true)
    }
    return result
}
console.log('value, key, index'.match(forIteratorRE));

/**
 *  ':'是v-bind缩写
 *  '.'是v-bind.prop缩写
 *  '@'是v-on缩写
 *  '#'是v-slot缩写
 */
function isDirabbreviation(c) {
    return c === ':' || c === '@' || c === '.' || c === '#'
}

// const result = tokenizer('<div v-bind:id="foo"></div>')
// console.log(JSON.stringify(result))