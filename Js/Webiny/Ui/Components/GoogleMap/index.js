import Webiny from 'Webiny';
import styles from './styles.css';

// TODO: https://www.npmjs.com/package/react-google-maps

class GoogleMap extends Webiny.Ui.Component {

    constructor(props) {
        super(props);

        this.map = null;
        this.marker = null;
        this.geoCoder = null;
        this.loading = null;

        if (!window.google) {
            Webiny.Page.loadScript('https://maps.googleapis.com/maps/api/js?key=' + this.props.apiKey);
        }

        this.bindMethods('positionMarker,setupMap,search');
    }

    componentDidMount() {
        this.loading = setInterval(() => {
            if (window.google) {
                clearInterval(this.loading);
                this.loading = null;
                this.setupMap();
            }
        }, 50);
    }

    shouldComponentUpdate(newProps) {
        if (!newProps.value) {
            return false;
        }

        return !_.isEqual(this.props.value, newProps.value);
    }

    componentDidUpdate() {
        if (!this.map) {
            return;
        }

        this.positionMarker();
    }

    setupMap() {
        this.map = new google.maps.Map(ReactDOM.findDOMNode(this).querySelector('.'+this.props.styles.map), {
            center: new google.maps.LatLng(this.props.lat, this.props.lng),
            zoom: this.props.zoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });

        this.marker = new google.maps.Marker({
            map: this.map,
            draggable: true,
            position: {lat: this.props.lat, lng: this.props.lng}
        });

        if (!this.props.readOnly) {
            google.maps.event.addListener(this.marker, 'dragend', () => {
                this.props.onChange({
                    lat: this.marker.getPosition().lat(),
                    lng: this.marker.getPosition().lng()
                });
            });
        }

        this.positionMarker();
    }

    positionMarker() {
        const lat = _.get(this.props, 'value.lat');
        const lng = _.get(this.props, 'value.lng');

        if (lat && lng) {
            const latLng = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
            this.map.panTo(latLng);
            this.marker.setMap(this.map);
            this.marker.setPosition(latLng);
        }
    }

    search(query) {
        if (!this.geoCoder) {
            this.geoCoder = new google.maps.Geocoder();
        }

        this.geoCoder.geocode({address: query}, results => {
            if (!_.isEmpty(results)) {
                const location = _.get(results[0], 'geometry.location');
                this.props.onChange({
                    lat: location.lat(),
                    lng: location.lng()
                });
            }
        });
    }
}

GoogleMap.defaultProps = {
    apiKey: null,
    zoom: 4,
    lat: 0,
    lng: 0,
    readOnly: false,
    style: null,
    renderer() {
        const {styles} = this.props;
        return (
            <div className={styles.container}>
                <div className={styles.map}>{this.props.children}</div>
            </div>
        );
    }
};

export default Webiny.createComponent(GoogleMap, {styles});