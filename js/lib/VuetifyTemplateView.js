import { VuetifyBaseView } from './VuetifyBaseView';

export class VuetifyTemplateView extends VuetifyBaseView {
    vueRender(createElement) {
        return createElement(this.createComponentObject(this.model));
    }

    createComponentObject(model) {
        const widgetView = this;
        if (model.get('_view_name') !== 'VuetifyTemplateView') {
            return VuetifyBaseView.createObjectForNestedModel(model, widgetView);
        }
        return {
            data() {
                return widgetView.createDataMapping(model);
            },
            created() {
                widgetView.addModelListeners(model, this);
            },
            watch: this.createWatches(model),
            methods: this.createMethods(model),
            components: this.createComponents(model.get('components') || {}),
            template: model.get('template'),
        };
    }

    createDataMapping(model) {
        return model.keys()
            .filter(prop => !prop.startsWith('_') && !['events', 'template', 'components'].includes(prop))
            .reduce((result, prop) => {
                result[prop] = model.get(prop); // eslint-disable-line no-param-reassign
                return result;
            }, {});
    }

    addModelListeners(model, vueModel) {
        model.keys()
            .filter(prop => !prop.startsWith('_') && !['v_model', 'components'].includes(prop))
            // eslint-disable-next-line no-param-reassign
            .forEach(prop => model.on(`change:${prop}`, () => { vueModel[prop] = model.get(prop); }));
    }

    createWatches(model) {
        return model.keys()
            .filter(prop => !prop.startsWith('_') && !['events', 'template', 'components'].includes(prop))
            .reduce((result, prop) => {
                result[prop] = (value) => { // eslint-disable-line no-param-reassign
                    model.set(prop, value === undefined ? null : value);
                    model.save_changes(model.callbacks(this));
                };
                return result;
            }, {});
    }

    createMethods(model) {
        return model.get('events').reduce((result, event) => {
            // eslint-disable-next-line no-param-reassign
            result[event] = value => model.send({ event, data: this.eventToObject(value) }, model.callbacks(this));
            return result;
        }, {});
    }

    createComponents(components) {
        return Object.entries(components)
            .reduce((result, [name, model]) => {
                // eslint-disable-next-line no-param-reassign
                result[name] = this.createComponentObject(model);
                return result;
            }, {});
    }
}
