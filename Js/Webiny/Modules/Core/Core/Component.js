import Webiny from 'Webiny';
import LinkState from './LinkState';
import Dispatcher from './Dispatcher';
import UiDispatcher from './UiDispatcher';

class Component extends React.Component {

    constructor(props) {
        super(props);

        this.__listeners = [];
        this.__cursors = [];
        this.bindMethods('bindTo');
    }

    componentWillMount() {
        if (this.props.ui) {
            UiDispatcher.register(this.props.ui, this);
        }
    }

    componentDidMount() {
        // Reserved for future system-wide functionality
    }

    /* eslint-disable */
    componentWillReceiveProps(nextProps) {
        // Reserved for future system-wide functionality
    }

    shouldComponentUpdate(nextProps, nextState) {
        // Reserved for future system-wide functionality
        return true;
    }

    componentWillUpdate(nextProps, nextState) {
        // Reserved for future system-wide functionality
    }

    componentDidUpdate(prevProps, prevState) {
        // Reserved for future system-wide functionality
    }

    /* eslint-enable */

    componentWillUnmount() {
        // Release event listeners
        _.forEach(this.__listeners, unsubscribe => {
            unsubscribe();
        });
        this.__listeners = [];

        // Release data cursors
        _.forEach(this.__cursors, cursor => {
            cursor.release();
        });
        this.__cursors = [];

        if (this.props.ui) {
            UiDispatcher.unregister(this.props.ui);
        }
    }

    setState(key, value = null, callback = null) {
        if (_.isObject(key)) {
            return super.setState(key, value);
        }

        if (_.isString(key)) {
            const state = this.state;
            _.set(state, key, value);
            return super.setState(state, callback);
        }
    }

    onRouteChanged(callback) {
        const stopListening = Dispatcher.on('RouteChanged', callback);
        this.__listeners.push(stopListening);
    }

    getClassName() {
        return Object.getPrototypeOf(this).constructor.name;
    }

    isMobile() {
        return isMobile.any;
    }

    addKeys(elements) {
        return elements.map((el, index) => {
            if (!el) {
                return null;
            }
            return React.cloneElement(el, {key: index}, el.props.children);
        });
    }

    dispatch(action, data) {
        return Dispatcher.dispatch(action, data);
    }

    on(event, callback, meta) {
        const stopListening = Dispatcher.on(event, callback, meta);
        this.__listeners.push(stopListening);
    }

    classSet() {
        let classes = [];

        _.forIn(arguments, classObject => {
            if (!classObject) {
                return;
            }

            if (typeof classObject === 'string') {
                classes = classes.concat(classObject.split(' '));
                return;
            }

            if (classObject instanceof Array) {
                classes = classes.concat(classObject);
                return;
            }

            _.forIn(classObject, (value, className) => {
                if (!value) {
                    return;
                }
                classes.push(className);
            });
        });

        return classes.join(' ');
    }

    /**
     * Ex: onChangeImportant(newValue, oldValue){...}
     * Ex: onChangeName(newValue, oldValue){...}
     *
     * @param key
     * @param callback
     * @returns {{value: *, requestChange: *}}
     */
    bindTo(key, callback = _.noop) {
        const ls = new LinkState(this, key, callback);
        return ls.create();
    }

    bindMethods() {
        let args = arguments;
        if (arguments.length === 1 && _.isString(arguments[0])) {
            args = arguments[0].split(',').map(x => x.trim());
        }

        _.forEach(args, (name) => {
            if (name in this) {
                this[name] = this[name].bind(this);
            } else {
                console.info('Missing method [' + name + ']', this);
            }
        });
    }

    signal(call, ...params) {
        return UiDispatcher.createSignal(this, call, params);
    }

    watch(key, func) {
        const cursor = Webiny.Model.select(key.split('.'));
        cursor.on('update', e => {
            func(e.data.currentData, e.data.previousData, e);
        });
        this.__cursors.push(cursor);
        return cursor;
    }

    render() {
        if (this.props.renderer) {
            return this.props.renderer.bind(this)(this);
        }

        console.warn('Component ' + this.getClassName() + ' has no renderer!');
        return null;
    }
}

Component.defaultProps = {};

export default Component;
