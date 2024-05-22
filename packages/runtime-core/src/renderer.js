export function createRenderer(options) {
    const render = (vnode, container) => {
        if (vnode) {
            patch(null, vnode, container)
        } else {
            container.innerHTML = ''
        }
    }
    return {
        render,
        hydrate,
        createApp: createAppAPI(render, hydrate),
      }
}

function createAppAPI(render, hydrate) {
    return function createApp(rootComponent, rootProps) {
        if (rootProps) {
            rootComponent.props = rootProps
        }
        const app = {
            _component: rootComponent,
            _props: rootProps,
            _container: null,
            _context: null,
            _instance: null,
            mount(container) {
                if (container) {
                    this._container = container
                }
                render(this)
            },
            unmount() {
                hydrate(null, this._container)
            },
        }
        return app
    }
}