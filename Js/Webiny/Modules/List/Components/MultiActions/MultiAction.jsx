import Webiny from 'Webiny';
const Ui = Webiny.Ui.Components;

class MultiAction extends Webiny.Ui.Component {
    constructor(props) {
        super(props);

        this.bindMethods('onAction');
    }

    onAction() {
        if (!this.props.data.size && !this.props.allowEmpty) {
            return;
        }

        this.props.onAction(this.props.data, this.props.actions);
    }
}

MultiAction.defaultProps = {
    allowEmpty: false,
    onAction: _.noop,
    renderer() {
        return (
            <Ui.Link onClick={this.onAction}>{this.props.label}</Ui.Link>
        );
    }
};

export default MultiAction;