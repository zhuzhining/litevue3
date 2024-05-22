import { createRenderer } from '../../runtime-core';

//渲染器
let renderer
//渲染选项
const rendererOptions = {}

function ensureRenderer() {
    return renderer || createRenderer(rendererOptions)
}

export const createApp = (...arg) => {
    const app = ensureRenderer().createApp(...args)
    const { mount } = app
    //覆盖app的mount方法,来支持使用容器或选择器字符串挂在
    app.mount = (containerOrSelector) => {
        const container = normalizeContainer(containerOrSelector)
        if(!container) return
        const component = app._component
        //获取选择容器的子节点字符串赋值给组件模板
        component.template = container.innerHTML
        //清空子节点
        container.innerHTML = ''
        const proxy = mount(container, false)
        return proxy
    }
}

function normalizeContainer(containerOrSelector) {
    //如果是选择器字符串，就
    if(typeof containerOrSelector === 'string') {
        const container = document.querySelector(containerOrSelector)
        //没有找到可以抛异常或警告
        return container
    }
    return containerOrSelector
}

//这个会导出 registerRuntimeCompiler，用来注册模板编译器
export * from '../../runtime-core'