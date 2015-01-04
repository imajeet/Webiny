import BaseComponent from '/Core/Base/BaseComponent';

class Content extends BaseComponent {

	getDefaultProperties() {
		return {
			title: 'WebMongo-Layout-Content',
			count: 2
		}
	}

	getTemplate() {
		return '<div className="component col-sm-12"> \
					<h4>{this.props.title}</h4> \
					<w-if cond="this.props.title == \'Pavel\'">\
						Custom content instead of predefined inner HTML\
						<w-if cond="this.props.count == 2">\
							<h2>Second level</h2>\
						<w-else>\
							<h3>Third level</h3>\
						</w-if>\
					<w-else>\
						{this.props.children}\
					</w-if>\
					<w-if cond="this.props.count == 3">\
						Count: {this.props.count}\
					<w-else>\
						No count!!\
					</w-if>\
				</div>';
	}
}

export default Content;