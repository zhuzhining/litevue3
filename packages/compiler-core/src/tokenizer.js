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


function isTagOpenChar(c) {
    return c === '<'
}
function isTagCloseChar(c) {
    return c === '>'
}
function isCloseTagStartChar(c) {
    return c === '/'
}
function isInterpolationStartChar(c) {
    return c === '{'
}
function isInterpolationCloseChar(c) {
    return c === '}'
}
function isTagNameChar(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

function isWhitespace(c) {
    return c === ' ' || c === '\n' || c === '\t'
}

/**
 *  ':'是v-bind缩写
 *  '.'是v-bind.prop缩写
 *  '@'是v-on缩写
 *  '#'是v-slot缩写
 */
function isDirabbreviation(c) {
    return c === ':' || c === '@' || c === '.' || c === '#'
}

export class Tokenizer {
    constructor(stack, callbacks) {
        //回调数据，用来执行ast节点收集
        this.callbacks = callbacks
        this.index = 0
        this.sectionStart = 0
        this.stack = stack
        this.state = State.Text
    }
    reset() {
        this.index = 0
        this.sectionStart = 0
        this.state = State.Text
    }
    handleBeforeAttrName(c) {
        if(isCloseTagStartChar(c)) {
            //查找属性遇到/字符，则说明是自闭合标签
            this.state = State.InSelfClosingTag
            this.sectionStart = this.index + 1
        } else if(isTagCloseChar(c)) {
            //遇到>则认为标签结束
            this.callbacks.onOpenTagEnd()
            this.state = State.Text
            this.sectionStart = this.index + 1
        } else if(c === 'v' && this.buffer[this.index + 1] === '-') {
            //遇到v-开头，则是指令
            this.state = State.InDirName
            //把-字符也消费掉
            this.index++
            this.sectionStart = this.index + 1
        } else if(isDirabbreviation(c)) {
            //遇到指令简写,先创建指令属性节点
            this.sectionStart = this.index
            this.callbacks.onDirName(this.sectionStart, this.index + 1)
            this.state = State.InDirArg
            this.sectionStart = this.index + 1
        } else if(!isWhitespace(c)) {
            //普通属性
            this.state = State.InAttrName
            this.sectionStart = this.index
        }
        
    }
    handleAfterClosingTagName(c) {
        if(isTagCloseChar(c)) {
            this.state = State.Text
            this.sectionStart = this.index + 1
        }
    }
    handleAttrValue(c, quote) {
        if(c === quote) {
            //属性值为双引号的，遇到双引号则结束
            this.callbacks.onAttrValue(this.sectionStart, this.index)
            this.state = State.BeforeAttrName
            this.sectionStart = this.index + 1
        }
    }
    parse(str) {
        this.buffer = str
        while(this.index < str.length) {
            const c = str[this.index]
            switch(this.state) {
                case State.Text:
                    if(isTagOpenChar(c)) {
                        this.state = State.BeforeTagName
                        //收集文本交由回调处理
                        this.callbacks.onText(this.sectionStart, this.index)
                        //将节选开始索引移动到当前索引
                        this.sectionStart = this.index
                    } else if(isInterpolationStartChar(c)) {
                        this.state = State.InterpolationOpen
                    }
                    break
                case State.InterpolationOpen:
                    //进入状态之前字符是'{'，现在字符还是'{'，说明是连续的字符'{{'，从而确定是插值开始
                    const isInterpolation = isInterpolationStartChar(c)
                    //是插值
                    if(isInterpolation) {
                        //在转换状态之前，如果有一段文本，则收集成文本节点
                        //当前是在第二个'{'，所以还要结束索引要再往前跳一个'{'
                        this.callbacks.onText(this.sectionStart, this.index - 1)
                        //当前字符不收集
                        this.sectionStart = this.index + 1
                        this.state = State.Interpolation
                    } else {
                        //如果不是插值，则继续回到文本状态
                        this.state = State.Text
                    }
                    break
                case State.Interpolation:
                    //遇到插值结束字符
                    if(isInterpolationCloseChar(c)) {
                        this.state = State.InterpolationClose
                    }
                    break
                case State.InterpolationClose:
                    //同插值开始一样，遇到第二个插值关闭字符，则证明是插值结束了
                    const isInterpolationClose = isInterpolationCloseChar(c)
                    if(isInterpolationClose) {
                        this.callbacks.onInterpolation(this.sectionStart, this.index - 1)
                        this.state = State.Text
                        this.sectionStart = this.index + 1
                    }
                    break
                case State.BeforeTagName:
                    if(isCloseTagStartChar(c)) {
                        //遇到/字符，将状态转换为结束标签开始状态
                        this.state = State.BeforeClosingTagName
                        this.sectionStart = this.index
                    } else if(isTagNameChar(c)) {
                        this.state = State.InTagName
                        this.sectionStart = this.index
                    }
                    break
                case State.BeforeClosingTagName:
                    if(isTagNameChar(c)) {
                        this.state = State.InClosingTagName
                        this.sectionStart = this.index
                    }
                    break
                case State.InClosingTagName:
                    //此处不出来其他空白字符，默认标签名结束后就是'>'
                    if(!isTagNameChar(c)) {
                        this.callbacks.onCloseTag(this.sectionStart, this.index)
                        this.state = State.AfterClosingTagName
                        this.handleAfterClosingTagName(c)
                    }
                    break
                case State.AfterClosingTagName:
                    this.handleAfterClosingTagName(c)
                    break
                case State.InTagName:
                    //如果不是标签名称字符，则认为标签名称收集结束，开始进行属性收集
                    if(!isTagNameChar(c)) {
                        this.callbacks.onOpenTagName(this.sectionStart, this.index)
                        this.state = State.BeforeAttrName
                        this.handleBeforeAttrName(c)
                    }
                    break
                case State.BeforeAttrName:
                    this.handleBeforeAttrName(c)
                    break
                case State.InSelfClosingTag:
                    if(isTagCloseChar(c)) {
                        this.callbacks.onSelfClosingTag()
                        this.state = State.Text
                        this.sectionStart = this.index + 1
                    }
                    break
                case State.InDirName:
                    if(c === ':') {
                        //<button v-on:click.once="doThis"></button>这种情况以':'结束
                        this.callbacks.onDirName(this.sectionStart, this.index)
                        this.state = State.InDirArg
                        this.sectionStart = this.index + 1
                    } else if(c === '=') {
                        //<button v-on="{ mousedown: doThis, mouseup: doThat }"></button>这种情况以'='结束
                        this.callbacks.onDirName(this.sectionStart, this.index)
                        this.state = State.BeforeAttrValue
                        this.sectionStart = this.index + 1
                    }
                    break
                case State.InDirArg:
                    if(c === '=') {
                        //v-bind:click=
                        this.callbacks.onDirArg(this.sectionStart, this.index)
                        this.state = State.BeforeAttrValue
                        this.sectionStart = this.index + 1
                        
                    } else if(c === '.') {
                        //v-bind:click.stop.prevent 有指令修饰符
                        this.callbacks.onDirArg(this.sectionStart, this.index)
                        this.state = State.InDirModifier
                        this.sectionStart = this.index + 1
                    }
                    break
                case State.InDirModifier:
                    if(c === '.') {
                        this.callbacks.onDirModifier(this.sectionStart, this.index)
                        this.sectionStart = this.index + 1
                    } else if(c === '=') {
                        this.callbacks.onDirModifier(this.sectionStart, this.index)
                        this.state = State.BeforeAttrValue
                        this.sectionStart = this.index + 1
                    }
                    break
                case State.BeforeAttrValue:
                    if(c === '"') {
                        this.state = State.InAttrValueDq
                        this.sectionStart = this.index + 1
                    } else if(c === "'") {
                        this.state = State.InAttrValueSq
                        this.sectionStart = this.index + 1
                    }
                    break
                case State.InAttrValueDq:
                    this.handleAttrValue(c, '"')
                    break
                case State.InAttrValueSq:
                    this.handleAttrValue(c, "'")
                    break
                case State.InAttrName:
                    if(c === '=') {
                        this.callbacks.onAttrName(this.sectionStart, this.index)
                        this.state = State.BeforeAttrValue
                        this.sectionStart = this.index + 1
                    }
                    break
            }
            this.index++
        }
        if(this.sectionStart < this.index) {
            //收集文本交由回调处理
            this.callbacks.onText(this.sectionStart, this.index)
        }
    }
}
