/* ===========================================================================
 * trafcams.js
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
    cameraLayer: new L.LayerGroup()
};

app.traffic = {
    markers: [], // marker cache

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

    parse: function (RS) {
        if (RS && RS.M && RS.M.length > 0) {
            var i, ii, j, jj, store, exists, marker, html,

                InfoIcon = L.Icon.extend({
                    iconUrl: 'img/markers/cctv5.png',
                    shadowUrl: 'img/markers/shadow.png',
                    iconSize: new L.Point(32, 37),
                    shadowSize: new L.Point(46, 37),
                    iconAnchor: new L.Point(16, 37),
                    popupAnchor: new L.Point(4, -23)
                }),

                pushpin = new InfoIcon();

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

app.handleLocationError = function (e) {
    console.warn(e.message);
    var map = app.map,
        popup = app.popup,
        center = map.getCenter();

    popup.setLatLng(new L.LatLng(center.lat, center.lng));
    popup.setContent('Sorry, your location could not be determined.<br>');
    map.openPopup(popup);
};

app.mapHere = function () {
    app.map.locateAndSetView();
};

app.mapInfo = function (e) {
    var map = app.map,
        popup = app.popup,
        center = map.getCenter(),
        bnds = map.getBounds(),
        ne = bnds.getNorthEast(),
        sw = bnds.getSouthWest(),
        bbox = '[' + sw.lng + ',' + ne.lat + ',' + ne.lng + ',' + sw.lat + ']',
        html = '';

    html += '<table style="width: 180px;">';
    html += '<tbody>';
    html += '<tr>';
    html += '<td>Zoom:</td>';
    html += '<td>' + map.getZoom() + '</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>Center:</td>';
    html += '<td>' + center.lat.toFixed(6) + ', ' + center.lng.toFixed(6) + '</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>NE:</td>';
    html += '<td>' + ne.lat.toFixed(6) + ', ' + ne.lng.toFixed(6) + '</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>SW:</td>';
    html += '<td>' + sw.lat.toFixed(6) + ',' + sw.lng.toFixed(6) + '</td>';
    html += '</tr>';
    html += '</tbody>';
    html += '</table>';

    popup.setLatLng(new L.LatLng(center.lat, center.lng));
    popup.setContent(html);
    map.openPopup(popup);
};

app.updateTrafficCameras = function () {
    app.traffic.fetch();
};

app.updateMap = function () {
    document.getElementById('map').style.height = window.innerHeight + 'px';
    app.map.invalidateSize();
};

app.init = function (lat, lng, z) {
    console.log('Initializing Leaflet v.' + L.VERSION);

    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/{styleId}/256/{z}/{x}/{y}.png',
        cloudmadeOptions = {
            maxZoom: 18,
            attribution: '' // Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade
        },

        mapboxUrl = 'http://{s}.tiles.mapbox.com/v3/{styleId}/{z}/{x}/{y}.png',

        nokiaUrl = 'http://{s}.maptile.maps.svc.ovi.com/maptiler/v2/maptile/newest/{styleId}/{z}/{x}/{y}/256/png8',
        nokiaOptions = {
            maxZoom: 18,
            attribution: '' // &copy; NAVTEQ 2011
        },

        mapquestUrl = 'http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png',
        mapquestOptions = {
            maxZoom: 18,
            subdomains: ["otile1", "otile2", "otile3", "otile4"],
            attribution: '' // &copy; MapQuest 2012
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

            // Others
            mapquest: new L.TileLayer(mapquestUrl, mapquestOptions)
        },

        overlays = {
            mapbox_us_congress: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 13 }, { styleId: 'mapbox.congressional-districts-110' }),
            mapbox_us_airports: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 14 }, { styleId: 'mapbox.us-airports' }),

            mapbox_world_bank_borders_en: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-en' }),
            mapbox_world_bank_borders_fr: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-fr' }),
            mapbox_world_bank_borders_es: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-es' }),
            mapbox_world_bank_borders_ar: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-ar' }),
            mapbox_world_bank_borders_zh: new L.TileLayer(mapboxUrl, { minZoom: 0, maxZoom: 8 }, { styleId: 'mapbox.world-bank-borders-zh' }),

            motorway: new L.TileLayer(cloudmadeUrl, cloudmadeOptions, { styleId: 46561 })
        },

        baseMaps = {
            'Fresh (0 - 18)': tiles.fresh,
            'Nokia Map View (0 - 18)': tiles.nokia_mapview,
            'Nokia Satellite (0 - 18)': tiles.nokia_satellite,
            'Nokia Terrain (0 - 18)': tiles.nokia_terrain,
            'MapBox Streets (0 - 17)': tiles.mapbox_streets,
            'MapBox Light (0 - 16)': tiles.mapbox_light,
            'MapQuest (0 - 18)': tiles.mapquest,
            'Midnight Commander (0 - 18)': tiles.midnight
        },

        overlayMaps = {
            'MapBox US Airports (0 - 14)': overlays.mapbox_us_airports,
            'Traffic Cameras': this.cameraLayer
        },

        layersControl = new L.Control.Layers(baseMaps, overlayMaps);

    this.map = new L.Map('map', {
        center: new L.LatLng(lat, lng),
        zoom: z,
        layers: [tiles.nokia_mapview, locateLayer, this.cameraLayer],
        fadeAnimation: false,
        zoomAnimation: false
    });

    this.map.addControl(layersControl);

    // add map events
    this.map.on('moveend', app.updateTrafficCameras);

    this.map.on('locationfound', this.handleLocationFound);
    this.map.on('locationerror', this.handleLocationError);

    // add toolbar events
    document.getElementById('info').addEventListener('click', this.mapInfo, false);
    document.getElementById('here').addEventListener('click', this.mapHere, false);

    // add window events
    window.onresize = app.updateMap;
    window.onorientationchange = app.updateMap;

    app.updateMap();
    app.updateTrafficCameras();
};
