/* eslint camelcase: ['error', {allow: ['v_model']}] */
import { VuetifyBaseView } from './VuetifyBaseView';
import { TemplateRenderFns } from "./VuetifyTemplateView";

export class VuetifyView extends VuetifyBaseView {
    vueRender(createElement) {
        return new RenderFns(this)._vueRender(createElement, this.model);
    }
}

export class RenderFns {
    constructor(view) {
        this.view = view;
    }
    _vueRender(createElement, model) {
        const self = this;

        if (model.get('_view_name') === 'VuetifyTemplateView') {
            return createElement(new TemplateRenderFns(this.view).createComponentObject(model));
        }
        if (model.get('_view_name') !== 'VuetifyView') {
            return createElement(VuetifyBaseView.createObjectForNestedModel(model, self.view));
        }

        const tag = model.getVuetifyTag();
        if (tag === 'html') {
            if (model.get('tag').toLowerCase().includes('script')) {
                return undefined;
            }
            return createElement(
                model.get('tag'), {
                    ...model.get('style_') && {style: model.get('style_')},
                    ...model.get('class_') && {class: model.get('class_')},
                    ...model.get('slot') && {slot: model.get('slot')},
                },
                model.get('children').map(child => (typeof child === 'string'
                    ? child
                    : this._vueRender(createElement, child))),
            );
        }

        const elem = createElement({
            data() {
                return {
                    v_model: model.get('v_model'),
                };
            },
            created() {
                self.addListeners(model, this);
            },
            render(createElement2) {
                return createElement2(
                    tag,
                    self.createContent(model, this),
                    self.renderChildren(createElement2, model, this),
                );
            },
        }, {...model.get('slot') && {slot: model.get('slot')}});

        /* Impersonate the wrapped component (e.g. v-tabs uses this name to detect v-tab and
         * v-tab-item) */
        elem.componentOptions.Ctor.options.name = tag;
        return elem;
    }

    addListeners(model, vueModel) {
        const listener = () => {
            vueModel.$forceUpdate();
        };
        const use = key => key === '_events' || (!key.startsWith('_') && !['v_model'].includes(key));

        model.keys()
            .filter(use)
            .forEach(key => model.on(`change:${key}`, listener));

        model.on('change:v_model', () => {
            if (model.get('v_model') !== vueModel.v_model) {
                vueModel.v_model = model.get('v_model'); // eslint-disable-line no-param-reassign
            }
        });
    }

    createAttrsMapping(model) {
        const useAsAttr = key => model.get(key) !== null
            && !key.startsWith('_')
            && !['layout', 'children', 'slot', 'v_model', 'style_', 'class_'].includes(key);

        return model.keys()
            .filter(useAsAttr)
            .reduce((result, key) => {
                result[key.replace(/_/g, '-')] = model.get(key); // eslint-disable-line no-param-reassign
                return result;
            }, {});
    }

    createEventMapping(model) {
        return (model.get('_events') || [])
            .reduce((result, event) => {
                result[event] = (e) => { // eslint-disable-line no-param-reassign
                    model.send({event, data: this.eventToObject(e)}, model.callbacks(this.view));
                };
                return result;
            }, {});
    }

    createContent(model, vueModel) {
        return {
            on: this.createEventMapping(model),
            ...model.get('style_') && {style: model.get('style_')},
            ...model.get('class_') && {class: model.get('class_')},
            attrs: this.createAttrsMapping(model),
            ...model.get('v_model') !== '!!disabled!!' && {
                model: {
                    value: vueModel.v_model,
                    callback: (v) => {
                        model.set('v_model', v === undefined ? null : v);
                        model.save_changes(model.callbacks(this.view));
                    },
                    expression: 'v_model',
                },
            },
        };
    }

    renderChildren(createElement, model, vueModel) {
        if (!vueModel.childCache) {
            vueModel.childCache = {}; // eslint-disable-line no-param-reassign
        }
        const childViewModels = model.get('children').map((child) => {
            if (typeof (child) === 'string') {
                return child;
            }
            if (vueModel.childCache[child.cid]) {
                return vueModel.childCache[child.cid];
            }
            const vm = this._vueRender(createElement, child);
            vueModel.childCache[child.cid] = vm; // eslint-disable-line no-param-reassign
            return vm;
        });

        /* Remove unused components */
        const childIds = model.get('children').map(child => child.cid);
        Object.keys(vueModel.childCache)
            .filter(key => !childIds.includes(key))
            // eslint-disable-next-line no-param-reassign
            .forEach(key => delete vueModel.childCache[key]);
        return childViewModels;
    }
}
