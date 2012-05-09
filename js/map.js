/* ===========================================================================
 * map.js
 * ===========================================================================
 *
 * Copyright 2012 Research In Motion Limited.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function NoContent () {
    console.log('There is no traffic camera data for this area');
}

var locateLayer = new L.LayerGroup();

var app = {
    debug: true,
    map: null,
    popup: new L.Popup(),
    //locateLayer: new L.LayerGroup(),
    cameraLayer: new L.LayerGroup(),
    weatherLayer: new L.LayerGroup()
};

app.weather = {
    apiKey: '80271bdabb0d1ece', // TODO: replace with your own API key

    /**
     * [fetch description]
     * @param  {[type]} lat [description]
     * @param  {[type]} lng [description]
     * @return {[type]}     [description]
     */
    fetch: function (lat, lng) {
        var url = 'http://api.wunderground.com/api/' + this.apiKey + '/geolookup/conditions/forecast/q/' + lat + ',' + lng + '.json';
        console.log(url);

        JSONP.get(url, {
            // query parameters
            callback: 'app.weather.parse'
        });

    },

    /**
     * [parse description]
     * @param  {[type]} RS [description]
     * @return {[type]}    [description]
     */
    parse: function (RS) {
        console.log(RS);

        var InfoIcon = L.Icon.extend({
            iconUrl: 'img/markers/umbrella5.png',
            shadowUrl: 'img/markers/shadow.png',
            iconSize: new L.Point(32, 37),
            shadowSize: new L.Point(46, 37),
            iconAnchor: new L.Point(16, 37),
            popupAnchor: new L.Point(1, -25)
        });

        var pushpin = new InfoIcon();

        var marker = new L.Marker(new L.LatLng(RS.current_observation.display_location.latitude, RS.current_observation.display_location.longitude), {
            icon: pushpin
        });

        var html = '';

        html += '<table class="wx-tooltip" border="0" cellpadding="0" cellspacing="3">';
        html += '<tr><td colspan="2"><b>' + RS.current_observation.display_location.full + '</b></td></tr>';
        html += '<tr><td><img class"wx-icon" src="' + RS.current_observation.icon_url + '"></td><td><div class="wx-temp">' + RS.current_observation.temp_c + ' &deg;C</div><div>' + RS.current_observation.weather + '</div><br></td></tr>';
        html += '<tr><td><b>Wind:</b></td><td>' + RS.current_observation.wind_dir + ' ' + RS.current_observation.wind_gust_kph + ' km/h</td></tr>';
        html += '<tr><td><b>Rel. Humid.:</b></td><td>' + RS.current_observation.relative_humidity + '</td></tr>';
        html += '<tr><td colspan="2"><br>' + RS.current_observation.observation_time + '</td></tr>'; // new Date(RS.current_observation.local_epoch * 1000).toLocaleTimeString()
        html += '</table>';

        marker.bindPopup(html).openPopup();

        //app.map.addLayer(marker);
        app.weatherLayer.addLayer(marker);
    }
};

app.traffic = {
    markers: [], // marker cache

    /**
     * [fetch description]
     * @return {[type]} [description]
     */
    fetch: function() {
        var bnds = app.map.getBounds(),
            ne = bnds.getNorthEast(),
            sw = bnds.getSouthWest(),
            bbox = '[' + sw.lng + ',' + ne.lat + ',' + ne.lng + ',' + sw.lat + ']';

        console.log('Fetching data for bounding box (' + sw.lng + ', ' + ne.lat + ', ' + ne.lng + ', ' + sw.lat + ')');

        JSONP.get('http://trafficcameras.weather.ca/CAM', {
            // query parameters
            K: 'WBE.JSO.BOX.CAN.TRF',
            BBOX: bbox,
            CB: 'app.traffic.parse'
        });
    },

    /**
     * [parse description]
     * @param  {[type]} RS [description]
     * @return {[type]}    [description]
     */
    parse: function (RS) {
        if (RS && RS.M && RS.M.length > 0) {
            var i, ii, j, jj, store, exists, marker, html, InfoIcon;

            // TODO: create smaller icons or use clusters when zoomed out
            InfoIcon = L.Icon.extend({
                iconUrl: 'img/markers/cctv5.png',
                shadowUrl: 'img/markers/shadow.png',
                iconSize: new L.Point(32, 37),
                shadowSize: new L.Point(46, 37),
                iconAnchor: new L.Point(16, 37),
                popupAnchor: new L.Point(0, -21)
            });

            var pushpin = new InfoIcon();

            for (i = 0, ii = RS.M.length; i < ii; i++) {
                store = RS.M[i];

                // check if the marker already exists
                exists = false;
                if (this.markers && this.markers.length > 0) {
                    for (j = 0, jj = this.markers.length; j < jj; j++) {
                        marker = this.markers[j];

                        if (store.I === marker) {
                            //console.debug('Skipping ' + store.I);
                            exists = true;
                            break;
                        }
                    }
                }

                // create new marker
                if (exists === false) {
                    console.debug('Adding new marker for ' + store.I);
                    html  = '<div id="' + store.I + '" class="map-tooltip">';
                    html += '<span>' + store.D + '</span><br>';
                    html += '<img src="' + store.U + '" width="160px" height="120px">';
                    html += '</div>';

                    this.markers.push(store.I);

                    marker = new L.Marker(new L.LatLng(store.Y, store.X), {
                        icon: pushpin
                    });

                    marker.bindPopup(html).openPopup();

                    //app.map.addLayer(marker);
                    app.cameraLayer.addLayer(marker);
                }
            }

            console.log('Cached markers: ' + this.markers.length);
        }
        else {
            console.warn('No data');
        }
    }
};

/**
 * [handleLocationFound description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
app.handleLocationFound = function (e) {
    locateLayer.clearLayers();

    var map = app.map,
        radius = e.accuracy / 2,
        marker = new L.Marker(e.latlng),
        latlngStr = e.latlng.lat + ', ' + e.latlng.lng,
        html = '';

    html += 'Your are within <b>' + radius + '</b> meters of this location <br>';
    html += '<i>(' + latlngStr + ')</i>';

    marker.bindPopup(html).openPopup();
    locateLayer.addLayer(marker);

    var circle = new L.Circle(e.latlng, radius);
    map.addLayer(circle);
};

/**
 * [handleLocationError description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
app.handleLocationError = function (e) {
    console.warn(e.message);
    var map = app.map,
        popup = app.popup,
        center = map.getCenter();

    popup.setLatLng(new L.LatLng(center.lat, center.lng));
    popup.setContent('Sorry, your location could not be determined.<br>');
    map.openPopup(popup);
};

/**
 * [mapHere description]
 * @return {[type]} [description]
 */
app.mapHere = function () {
    app.map.locateAndSetView();
};

/**
 * [mapInfo description]
 * @param  {[type]} e [description]
 * @return {[type]}   [description]
 */
app.mapInfo = function (e) {
    var map = app.map,
        popup = app.popup,
        center = map.getCenter(),
        bnds = map.getBounds(),
        ne = bnds.getNorthEast(),
        sw = bnds.getSouthWest(),
        bbox = '[' + sw.lng + ',' + ne.lat + ',' + ne.lng + ',' + sw.lat + ']',
        html = '';

    html += '<table class="table table-striped">';
    html += '<tbody>';
    html += '<tr>';
    html += '<td>Zoom:</td>';
    html += '<td>' + map.getZoom() + '</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>Center:</td>';
    html += '<td>' + center.lat + ', ' + center.lng + '</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>NE:</td>';
    html += '<td>' + ne.lat + ', ' + ne.lng + '</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>SW:</td>';
    html += '<td>' + sw.lat + ',' + sw.lng + '</td>';
    html += '</tr>';
    html += '</tbody>';
    html += '</table>';

    document.getElementById('infoModalBody').innerHTML = html;
};

/**
 * [updateZoom description]
 * @return {[type]} [description]
 */
app.updateZoom = function () {
    document.getElementById('zoom').innerHTML = app.map.getZoom();
};

/**
 * [updateCenter description]
 * @return {[type]} [description]
 */
app.updateCenter = function () {
    var center = app.map.getCenter();
    document.getElementById('center').innerHTML = center.lat.toFixed(6) + ', ' + center.lng.toFixed(6);
    app.traffic.fetch();
};

/**
 * [updateMap description]
 * @return {[type]} [description]
 */
app.updateMap = function () {
    //var orientation = window.orientation;
    //var navheight = (Math.abs(orientation) === 90) ? (50 + (18 * 2)) : 40;
    var navheight = (window.innerWidth < 1024) ? 48 : 40,
        myTabContentStyle = document.getElementById('myTabContent').style;

    if (window.innerWidth < 1024) {
        myTabContentStyle.marginTop = '-18px';
        myTabContentStyle.marginLeft = '-20px';
    }
    else {
        myTabContentStyle.marginTop = '0';
        myTabContentStyle.marginLeft = '0';
    }

    myTabContentStyle.width = (window.innerWidth) + 'px';
    myTabContentStyle.height = (window.innerHeight - navheight) + 'px';

    document.getElementById('map').style.height = (window.innerHeight - navheight) + 'px';

    app.map.invalidateSize();
};

/**
 * [init description]
 * @param  {[type]} lat [description]
 * @param  {[type]} lng [description]
 * @param  {[type]} z   [description]
 * @return {[type]}     [description]
 */
app.init = function (lat, lng, z) {
    console.log('Initializing Leaflet v.' + L.VERSION);

    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/{styleId}/256/{z}/{x}/{y}.png',
        cloudmadeOptions = {
            maxZoom: 18,
            attribution: '' // Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade
        },

        googleUrl = 'http://{s}.googleapis.com/vt?lyrs=m@174225136&src=apiv3&hl=en-US&x={x}&y={y}&z={z}&s=Galile&style=api%7Csmartmaps',
        googleOptions = {
            maxZoom: 18,
            subdomains: ['mt0', 'mt1'],
            attribution: 'Map data &copy; 2012 Google'
        },

        mapboxUrl = 'http://{s}.tiles.mapbox.com/v3/{styleId}/{z}/{x}/{y}.png',

        nokiaUrl = 'http://{s}.maptile.maps.svc.ovi.com/maptiler/v2/maptile/newest/{styleId}/{z}/{x}/{y}/256/png8',
        nokiaOptions = {
            maxZoom: 18,
            attribution: '&copy; NAVTEQ 2012'
        },

        mapquestUrl = 'http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png',
        mapquestOptions = {
            maxZoom: 18,
            subdomains: ['otile1', 'otile2', 'otile3', 'otile4'],
            attribution: '&copy; MapQuest 2012'
        },

        osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        osmOptions = {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap 2011'
        },

        tiles = {
            // Nokia
            nokia_mapview: new L.TileLayer(nokiaUrl, nokiaOptions, { styleId: 'normal.day' }),
            nokia_satellite: new L.TileLayer(nokiaUrl, nokiaOptions, { styleId: 'hybrid.day' }),
            nokia_terrain: new L.TileLayer(nokiaUrl, nokiaOptions, { styleId: 'terrain.day' }),

            // MapBox
            mapbox_streets: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 17 }, { styleId: 'mapbox.mapbox-streets' }),
            mapbox_light: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 16 }, { styleId: 'mapbox.mapbox-light' }),

            // CloudMade
            fresh: new L.TileLayer(cloudmadeUrl, cloudmadeOptions, { styleId: 997 }),
            midnight: new L.TileLayer(cloudmadeUrl, cloudmadeOptions, { styleId: 999 }),

            // Google
            google_mapview: new L.TileLayer('http://{s}.googleapis.com/vt?lyrs=m@174225136&src=apiv3&hl=en-US&x={x}&y={y}&z={z}&s=Galile&style=api%7Csmartmaps', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1'],
                attribution: 'Map data &copy; 2012 Google'
            }),
            google_satellite: new L.TileLayer('http://{s}.googleapis.com/kh?v=108&hl=en-US&x={x}&y={y}&z={z}&token=130119', {
                maxZoom: 20,
                subdomains: ['khm0', 'khm1'],
                attribution: 'Map data &copy; 2012 Google'
            }),

            // Others
            mapquest: new L.TileLayer(mapquestUrl, mapquestOptions),
            osm: new L.TileLayer(osmUrl, osmOptions)
        },

        overlays = {
            mapbox_us_congress: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 13 }, { styleId: 'mapbox.congressional-districts-110' }),
            mapbox_us_airports: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 14 }, { styleId: 'mapbox.us-airports' }),

            google_roads: new L.TileLayer('http://{s}.googleapis.com/vt?lyrs=h@174249746&src=apiv3&hl=en-US&x={x}&y={y}&z={z}&s=Gali&style=api%7Csmartmaps', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1'],
                attribution: 'Map data &copy; 2012 Google'
            }),
            google_traffic: new L.TileLayer('http://{s}.google.com/vt?hl=en&src=app&lyrs=h@174250628,traffic|seconds_into_week:-1&x={x}&y={y}&z={z}&style=15', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1'],
                attribution: 'Map data &copy; 2012 Google'
            }),
            google_transit: new L.TileLayer('http://{s}.google.com/vt/lyrs=h@174249664,transit:comp%7Cvm:1&hl=en&src=app&opts=r&x={x}&y={y}&z={z}&s=Galile', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1'],
                attribution: 'Map data &copy; 2012 Google'
            }),
            google_webcams: new L.TileLayer('http://{s}.google.com/mapslt?lyrs=com.google.webcams&x={x}&y={y}&z={z}&w=256&h=256&hl=en', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1'],
                attribution: 'Map data &copy; 2012 Google'
            }),

            mapbox_world_bank_borders_en: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-en' }),
            mapbox_world_bank_borders_fr: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-fr' }),
            mapbox_world_bank_borders_es: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-es' }),
            mapbox_world_bank_borders_ar: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-ar' }),
            mapbox_world_bank_borders_zh: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-zh' }),

            motorway: new L.TileLayer(cloudmadeUrl, cloudmadeOptions, { styleId: 46561 })
        },

        baseMaps = {
            //'Fresh (0 - 18)': tiles.fresh,
            'Google Map View (0 - 20)': tiles.google_mapview,
            'Google Satellite (0 - 20)': tiles.google_satellite,
            'MapBox Streets (0 - 17)': tiles.mapbox_streets,
            'MapBox Light (0 - 16)': tiles.mapbox_light,
            'MapQuest (0 - 18)': tiles.mapquest,
            'Midnight Commander (0 - 18)': tiles.midnight,
            'Nokia Map View (0 - 18)': tiles.nokia_mapview,
            'Nokia Satellite (0 - 18)': tiles.nokia_satellite,
            'Nokia Terrain (0 - 18)': tiles.nokia_terrain
            //'OpenStreetMap (0 - 18)': tiles.osm
        },

        overlayMaps = {
            'Google Roads (0 - 20)': overlays.google_roads,
            'Google Traffic (0 - 20)': overlays.google_traffic,
            'Google Transit (0 - 20)': overlays.google_transit,
            'Google Webcams (0 - 20)': overlays.google_webcams,
            'MapBox US Airports (0 - 14)': overlays.mapbox_us_airports,
/*
            'MapBox US Congressional Districts (0 - 13)': overlays.mapbox_us_congress,
            'MapBox World Bank Borders English (0 - 8)': overlays.mapbox_world_bank_borders_en,
            'MapBox World Bank Borders French (0 - 8)': overlays.mapbox_world_bank_borders_fr,
            'MapBox World Bank Borders Spanish (0 - 8)': overlays.mapbox_world_bank_borders_es,
            'MapBox World Bank Borders Arabic (0 - 8)': overlays.mapbox_world_bank_borders_ar,
            'MapBox World Bank Borders Chinese (0 - 8)': overlays.mapbox_world_bank_borders_zh,
            'Motorways (0 - 18)': overlays.motorway,
*/
            'Traffic Cameras': this.cameraLayer,
            'Weather': this.weatherLayer
        },

        layersControl = new L.Control.Layers(baseMaps, overlayMaps);

    this.map = new L.Map('map', {
        center: new L.LatLng(lat, lng),
        zoom: z,
        layers: [tiles.nokia_mapview, locateLayer, this.cameraLayer, this.weatherLayer],
        fadeAnimation: false,
        zoomAnimation: false
    });

    this.map.addControl(layersControl);

    // add map events
    this.map.on('moveend', app.updateCenter);
    this.map.on('zoomend', app.updateZoom);

    this.map.on('locationfound', this.handleLocationFound);
    this.map.on('locationerror', this.handleLocationError);

    // add toolbar events
    document.getElementById('info').addEventListener('click', this.mapInfo, false);
    document.getElementById('here').addEventListener('click', this.mapHere, false);
    document.getElementById('btn-zoom').addEventListener('click', function (e) {
        //console.log(this, e.target.innerHTML);
        app.map.setZoom(e.target.innerHTML);
    }, false);

    // add cities
    var cities = [];
    for (var city in cityData) {
        cities.push(city);
    }

    $('#citySearch').typeahead({
        source: cities,
        items: 10
    });

    $('#citySearch').change(function() {
        if (cityData[this.value]) {
            fields = cityData[this.value].split(','); // lat, lng
            $('#nav-home').click(); // show home tab
            app.map.panTo(new L.LatLng(fields[0], fields[1]));
            app.weather.fetch(fields[0], fields[1]);
        }
        return;
    });

    // add window events
    //$(window).resize($.debounce(500, app.updateMap));
    window.onresize = app.updateMap;
    window.onorientationchange = app.updateMap;

    app.updateMap();
    app.updateCenter();
    app.updateZoom();
    app.weather.fetch(lat, lng);
};
