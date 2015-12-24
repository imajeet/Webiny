import Basic from './Basic';

/**
 * This is a list view which handles most often-needed actions
 * It automatically sets state variables, stores, data fetching/filtering, change detection of URL params, alerts...
 */
class List extends Basic {

    constructor() {
        super();

        _.assign(this.state, {
            data: [],
            meta: {
                totalCount: 0,
                totalPages: [],
                perPage: 0,
                currentPage: 0,
                filters: [],
                sorter: []
            },
			params: {}
        });

		this.urlParams = true;

        this.bindMethods('getData,listChangeSort');
    }

    componentDidMount() {
        this.store = this.getStore(this.getStoreFqn());
        this.onStoreChanged(this.store);
        this.onRouteChanged(this.getData);
        this.listEvents();
    }

    getHeaderIcon() {
        return Rad.Components.Icon.Type.BARS;
    }

    getFields() {
        return '';
    }

	/**
	 * Instead of URL, params can be sent through 2nd parameter too
	 * @param route
	 * @param params
	 */
    getData(route = Rad.Router.getActiveRoute(), nonUrlParams = {}) {

        if (!_.has(route, 'name')) {
            route = Rad.Router.getActiveRoute();
        }

        this.showLoader();
        var fields = this.getFields();
        fields = _.isArray(fields) ? fields.join(',') : fields;
        fields = fields + ',id';

        var params = _.clone(route.getParams());
        params.fields = fields;

        _.assign(params, nonUrlParams);
        _.assign(params, this.getAdditionalListParams());

		this.setState({params});

        this.trigger(this.getStoreFqn() + '.List', params).then(() => {
            this.hideLoader();
        });
    }

    getAdditionalListParams() {
        return {};
    }

    renderComponent() {

        var bodyInjects = this.getInjectedRadComponents(this.renderBody);
        var footerInjects = this.getInjectedRadComponents(this.renderFooter);
        var headerInjects = this.getInjectedRadComponents(this.renderHeader);
        var loader = this.state.showLoader ? <Rad.Components.Loader/> : null;

        return (
            <div>
                {this.renderAlerts()}
                <Rad.Components.Panel.Panel>
                    {loader}
                    {this.renderHeader(...headerInjects)}
                    <Rad.Components.Panel.Body style={{overflow: 'visible'}}>
                        {this.renderBody(...bodyInjects)}
                    </Rad.Components.Panel.Body>
                    <Rad.Components.Panel.Footer style={{padding: '0px 25px 25px'}}>
                        {this.renderFooter(...footerInjects)}
                    </Rad.Components.Panel.Footer>
                </Rad.Components.Panel.Panel>
            </div>
        );
    }

    renderBody() {
        return null;
    }

    renderFooter() {
        return null;
    }

    renderHeader() {
        var Link = Rad.Components.Router.Link;
        return (
            <Rad.Components.Panel.Header title={this.getHeaderTitle()} icon={this.getHeaderIcon()} style={{overflow: 'visible'}}>
                {this.getHeaderActions().map((action, index) => {
                    return (
                    <Link key={'panel-header-action-' + index}
                          type="primary" size="small"
                          className="pull-right" {...action}>
                        {action.label}
                    </Link>
                        );
                    })}
            </Rad.Components.Panel.Header>
        );
    }

    /** ------------ Functionality in separate methods for easier overriding of submit() method ------------*/

    listEvents() {
        this.listen('Rad.Components.Table.Action.Edit', data => {
            this.listEventEdit(data)
        });

        this.listen('Rad.Components.Table.Action.Delete', data => {
            this.listEventDelete(data)
        });

        this.listen('Rad.Components.Table.Field.Toggle', data => {
            this.listEventToggleStatus(data.data, data.field)
        });

        this.listen('Rad.Components.Table.Action.MultiAction', data => {
            var methodName = 'multiAction' + _.capitalize(data.action);
            if (!_.isFunction(this[methodName])) {
                return Rad.Console.warn('MultiAction method \'' + methodName + '\' not defined.');
            }
            return this[methodName](data.selected, data.value);
        });

        this.listen('Rad.Components.Table.Action.Menu', data => {
            var methodName = 'menuAction' + _.capitalize(data.action);
            if (!_.isFunction(this[methodName])) {
                return Rad.Console.warn('MenuAction method \'' + methodName + '\' not defined.');
            }
            return this[methodName](data.data);
        });
    }

    listChangePerPage(page) {
		this.urlParams ? Rad.Router.goToRoute('current', {perPage: page}) : this.getData(null, {perPage: page});
    }


	listChangePage(pageParam) {
		this.getData(null, pageParam);
	}

	listChangeSort(pageParam) {
		this.getData(null, pageParam);
	}

    listEventEdit(data) {
        Rad.Router.goToUrl(Rad.Router.getCurrentPathName('/' + data.id))
    }

    listEventDelete(data) {
        this.store.getApi().delete(_.isString(data) ? data : data.id).then(apiResponse => {
            if (!apiResponse.isError()) {
                this.getData(Rad.Router.getActiveRoute());
                this.setAlert(this.listDeleteSuccessMessage(apiResponse, data), 'success');
            } else {
                this.setAlert(apiResponse.getErrorReport('errors'), 'danger');
            }
        });
    }

    listEventToggleStatus(data, field) {
        this.showLoader();
        var post = {};
        post[field] = !data[field];
        this.store.getApi().crudUpdate(data.id, post, {_fields: 'id'}).then(() => {
            this.getData(Rad.Router.getActiveRoute());
        })
    }

    listDeleteSuccessMessage() {
        return 'Deleted successfully.';
    }

}

export default List;