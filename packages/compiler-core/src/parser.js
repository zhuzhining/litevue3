import { Tokenizer } from "./tokenizer"
import { createRoot, NodeTypes } from "./ats"
import {
    ParserOptions,
    parse,
    parseExpression,
  } from '@babel/parser'
const ExpParseMode = {
    Normal: 1,
    Params: 2,
    Statements: 3,
    Skip: 4,
}
export const ConstantTypes = {
    NOT_CONSTANT: 0,
    CAN_SKIP_PATCH: 1,
    CAN_HOIST: 2,
    CAN_STRINGIFY: 3,
}
const NO = {}
//是否v-pre指令，这个指令跳过该元素及其所有子元素的编译
let inVPre = false
//当前处理的末班字符串
let currentInput
//当前根节点
let currentRoot
//当前操作的标签节点
let currentOpenTag
//当前属性
let currentProp
//当前配置数据
let currentOptions
let stack = []
const tokenizer = new Tokenizer(stack, {
    onText(start, end) {
        onText(start, end)
    },
    onInterpolation(start, end) {
        if(inVPre) {
            return onText(start, end)
        }
        if(end > start) {
            const exp = getSlice(start, end).trim()
            addNode({
                type: NodeTypes.INTERPOLATION,
                content: createExp(exp, false)
            })
        }
    },
    onOpenTagName(start, end) {
        currentOpenTag = {
            type: NodeTypes.ELEMENT,
            tag: getSlice(start, end),
            props: [],
            children: []
        }
    },
    onOpenTagEnd() {
        //将节点添加到子节点
        addNode(currentOpenTag)
        //将节点加入栈中
        stack.unshift(currentOpenTag)
    },
    onSelfClosingTag() {
        currentOpenTag.isSelfClosing = true
        addNode(currentOpenTag)
        onEndTag()
    },
    onCloseTag(start, end) {
        onEndTag()
    },
    onAttrName(start, end) {
        currentProp = {
            type: NodeTypes.ATTRIBUTE,
            name: getSlice(start, end),
            value: undefined,
          }
    },
    onDirName(start, end) {
        const rawName = getSlice(start, end)
        const name = rawName === ':' || rawName === '.' ? 'bind' : 
                 rawName === '@' ? 'on' :
                 rawName === '#' ? 'slot' : rawName
        currentProp = {
            type: NodeTypes.DIRECTIVE,
            name,
            rawName,
            exp: undefined,
            arg: undefined,
            //'.'是v-bind.prop缩写，所以修饰符要加上prop
            modifiers: rawName === '.' ? ['prop'] : [],
        }
    },
    onDirArg(start, end) {
        const arg = getSlice(start, end)
        //判断是否动态指令，<a v-on:[eventName]="doSomething">
        const isStatic = arg[0] !== '['
        currentProp.arg = createExp(isStatic ? arg : arg.slice(1, -1), isStatic)
    },
    onDirModifier(start, end) {
        currentProp.modifiers.push(getSlice(start, end))
    },
    onAttrValue(start, end) {
        const value = getSlice(start, end)
        if (currentProp.type === NodeTypes.ATTRIBUTE) {
            currentProp.value = {
                type: NodeTypes.TEXT,
                content: value
            }
        } else {
            //指令属性
            currentProp.exp = createExp(value, false)
            //TODO v-for指令要处理一下表达式
            if(currentProp.name === 'for') {
                currentProp.forParseResult = parseForExpression(currentProp.exp)
            }
        }
        currentOpenTag.props.push(currentProp)
        currentProp = null
    }
})

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
        //'value, key, this.index' => [', key, this.index', ' key', ' this.index'],如果有index，第三个就是index
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

function onEndTag() {
    //此处要处理没有结束标签的情况，只是学习代码，就不处理了，默认都是有结束标签
    stack.shift()
    currentOpenTag = null
}

function onText(start, end) {
    if(end > start) {
        getParent().children.push({
            type: NodeTypes.TEXT,
            content: getSlice(start, end)
        })
    }
}

function getParent() {
    //每次将新节点添加到数组开头，所以这里0是栈顶
    return stack[0] || currentRoot
}

function addNode(child) {
    getParent().children.push(child)
}

function getSlice(start, end) {
    return currentInput.slice(start, end)
}
function createExp(content, isStatic, parseMode = ExpParseMode.Normal) {
    const result = {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content,
        isStatic,
        constType: isStatic ? ConstantTypes.CAN_STRINGIFY : ConstantTypes.NOT_CONSTANT,
        ast: null
      }
    //   const options = {plugins: ['typescript']}
    //   //TODO expParseMode 来处理ast
    //   if (parseMode === ExpParseMode.Statements) {
    //     // v-on with multi-inline-statements, pad 1 c
    //     result.ast = parse(` ${content} `, options).program
    //   } else if (parseMode === ExpParseMode.Params) {
    //     result.ast = parseExpression(`(${content})=>{}`, options)
    //   } else {
    //     // normal exp, wrap with parens
    //     result.ast = parseExpression(`(${content})`, options)
    //   }
      return result
      

}

//默认配置数据
export const defaultParserOptions = {
    parseMode: 'base',
    delimiters: [`{{`, `}}`],
    isVoidTag: NO,
    isPreTag: NO,
    isCustomElement: NO,
    prefixIdentifiers: false,
}
function reset() {
    tokenizer.reset()
    currentInput = ''
    currentOptions = defaultParserOptions
    currentRoot = null
    currentOpenTag = null
    currentProp = null
}
export function baseParse(input, options) {
    reset()
    currentInput = input
    currentOptions = Object.assign({}, defaultParserOptions, options)
    currentRoot = createRoot([], currentInput)
    tokenizer.parse(currentInput)
    return currentRoot
}