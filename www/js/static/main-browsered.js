(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(coordinates,callback) {

	var MapboxClient = require('mapbox/lib/services/directions'); 
	var client = new MapboxClient('pk.eyJ1IjoiZW1pbGllZGFubmVuYmVyZyIsImEiOiJjaXhmOTB6ZnowMDAwMnVzaDVkcnpsY2M1In0.33yDwUq670jHD8flKjzqxg');

	var array_lat_long = []; 
	for(var i=0; i<coordinates.length; i++) {

		var lat= Number(coordinates[i][0]); 
		var long= Number(coordinates[i][1]); 

		array_lat_long.push({ latitude: lat, longitude: long}); 

	}
	
	client.getDirections(array_lat_long, {
		  profile: 'mapbox.walking',
		  alternatives: false,
		}, function(err, results) {
		   		if(err===null) {
			   		if(typeof callback == 'function') {
			   			callback(results); 
			   		}
			   	}
		});
}
},{"mapbox/lib/services/directions":13}],2:[function(require,module,exports){
// Wait for device API libraries to load
document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() { 
	
	var processGPX = require('./process_gpx.js'); 

	var gpxFile = 'route.gpx'; 

	processGPX(gpxFile, function (coordinates) {
		
		var getDirections = require('./directions.js'); 
		
		getDirections(coordinates,function(directions) {

			// detect when person is at start 
			var saveDirectionInfo = require('./save_directions.js')
			stepsData = saveDirectionInfo(directions,gpxFile); 
			
			var listenForCoordinates = require('./track_coordinates.js'); //coordinates are in [longitude, latitude] for google maps lat long goes the other way!
			listenForCoordinates(stepsData); 

		}); 
		// var turn_by_turn = getDirections(coordinates);
	}); 
}



},{"./directions.js":1,"./process_gpx.js":3,"./save_directions.js":4,"./track_coordinates.js":5}],3:[function(require,module,exports){
//get gpx file contents 
module.exports = function (gpx_file, callback) {

    var xhr = new XMLHttpRequest();
    
    xhr.open('GET', './gpx/'+gpx_file, true);
    xhr.send(null);  

    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) { 

            var coordinates = getCoordinates(xhr.responseText);

            if(typeof callback=='function') {   
                callback(coordinates); 
            }
        }
    }
}; 

//read returned contents of file into an array of coordinates
function getCoordinates(xml_file) {

    var coordinates_array = [];  
    //parse gpx string into xml so can iterate over
    parser = new DOMParser(); 
    xml = parser.parseFromString(xml_file,'text/xml'); 
    //get all rept tags to get lat/ long out of them 
    var rtept = xml.querySelectorAll('rtept'); 

    for(var i=0; i<rtept.length; i++) {

        var lat = rtept[i].getAttribute('lat'); 
        var long = rtept[i].getAttribute('lon'); 
                
        coordinates_array.push([lat, long]);
    } 
    
    return coordinates_array; 
}
},{}],4:[function(require,module,exports){
module.exports = function(directionObject, fileName) {

	var route = directionObject['routes'][0]; 
	var steps = route['steps'];

	var stepsRelevantData = []; 
	for (var i= 0; i< steps.length; i++) {

		var currentStep=steps[i]; 

		var direction=currentStep['direction']; 
		var distance=currentStep['distance']; 
		var instruction=currentStep['maneuver']['instruction']; 
		var type=currentStep['maneuver']['type']; 
		var coordinates=currentStep['maneuver']['location']['coordinates']; //coordinates are in [longitude, latitude] for google maps lat long goes the other way!

		stepsRelevantData.push({coordinates:coordinates, distance:distance, direction:direction, type:type, instruction: instruction})
		console.log(coordinates); 
		//testing purposes
		document.getElementById('key-coordinates').innerHTML+="Latitude: "+coordinates[1]+", Longitude "+coordinates[0]+ "</br>";  
	}
	return stepsRelevantData; 
}
},{}],5:[function(require,module,exports){
module.exports = function(coordinatesData) {
  var time = 0; 
	//start tracking
	var watch_id= navigator.geolocation.watchPosition(

        //success
        function(position) {
            //check against route directions
            var lat = position.coords.latitude; 
            var long = position.coords.longitude; 
           	//log coordinates. not more frequently than 30 seconds
            var currentTime= Date.now(); 
            if(time===0) {
                time = currentTime; 
                document.getElementById('log-coordinates').innerHTML += "<p class='log'>Current latitude is "+lat+" and current longitude is "+long+"</p>"; 
            } else {
                if(currentTime-time > 30000) { //30 seconds
                    time=currentTime; 
                    document.getElementById('log-coordinates').innerHTML += "<p class='log'>Current latitude is "+lat+" and current longitude is "+long+"</p>"; 
                }
            }
           	// console.log(coordinatesData); 
            //round numbers to 5 decimals 
            lat = lat.toFixed(4); 
            long = long.toFixed(4); 
            //log instructions
            var instructionData = nearInstructionCoordinate(lat,long, coordinatesData); 
            if(instructionData !== false) {
                document.getElementById('log-instructions').innerHTML += "<div class='instruction'>"+instructionData.instruction+"</div>"; 
            }
           // var waypoint = isClose(lat,long); //returns false if not close to anywhere, or waypoint number its closest to if close to a waypoint.
           // if(waypoint !== false) {
           //  //play corresponding audio 
           //      audio_elem = 'waypoint_'+waypoint; 
           //      playAudio(audio_elem);  
           // } 
           //  // if(waypoint) {
           //  route_data.push(position); 
        },
        //error
        function(error) {
                console.log('couldnt get coordinates!!!'); 
        },
        //settings
        { frequency: 10000, enableHighAccuracy: true}

    ); 
}
function nearInstructionCoordinate(lat,long, instructionPoints) { //compare lat long of device to coordinates where your gonna read out data, see if theres a match. If so return data for that coordinate

	
	for(var i=0; i<instructionPoints.length; i++) {

		var instructionCoordinates= instructionPoints[i]['coordinates']; 
		var instructionCoordinateLat = instructionCoordinates[1]; 
		var instructionCoordinateLong = instructionCoordinates[0]; 

		//round to 4 digits so if your more roughly nearby ... (this possibly needs more thinking about)
		instructionCoordinateLat = instructionCoordinateLat.toFixed(4); 
		instructionCoordinateLong = instructionCoordinateLong.toFixed(4); 
		// console.log('device latitude is' + lat); 
		// console.log('device longitude is' + long); 
		console.log('point lat is' + instructionCoordinateLat); 
		console.log('point long is' + instructionCoordinateLong); 
		
		if(lat === instructionCoordinateLat && long === instructionCoordinateLong) { //all the coordinates are strings at this point ... 
			return instructionPoints[i]; 
		}
	}
	return false; 
}

// function isClose(lat, long) {

//     for(var i=0; i<coordinates_array.length; i++) {

//         //if matches to 4 decimal places 
//         var waypoint_lat = coordinates_array[i][0]; 
//         var waypoint_long = coordinates_array[i][1]; 

//         // console.log('position lat long is' + lat + ' ' + long); 
//         // console.log('lat long waypoint is' +waypoint_lat + ' ' + waypoint_long); 

//         if((lat.substr(0,lat.length -1) === waypoint_lat.substr(0,waypoint_lat.length-1)) && 
//             (long.substr(0, long.length -1) === waypoint_long.substr(0,waypoint_long.length-1))) {
      
//             return i+1; 
//         }
//     }
//     return false; 
// }
},{}],6:[function(require,module,exports){
'use strict';

if (typeof Promise === 'undefined') {
  // install ES6 Promise polyfill
  require('../vendor/promise');
}

var interceptor = require('rest/interceptor');

var callbackify = interceptor({
  success: function (response) {
    var callback = response && response.callback;

    if (typeof callback === 'function') {
      callback(null, response.entity, response);
    }

    return response;
  },
  error: function (response) {
    var callback = response && response.callback;

    if (typeof callback === 'function') {
      var err = response.error || response.entity;
      if (typeof err !== 'object') err = new Error(err);
      callback(err);
    }

    return response;
  }
});

module.exports = callbackify;

},{"../vendor/promise":16,"rest/interceptor":22}],7:[function(require,module,exports){
'use strict';

if (typeof Promise === 'undefined') {
  // install ES6 Promise polyfill
  require('../vendor/promise');
}

var rest = require('rest');
var standardResponse = require('./standard_response');
var callbackify = require('./callbackify');

// rest.js client with MIME support
module.exports = function(config) {
  return rest
    .wrap(require('rest/interceptor/errorCode'))
    .wrap(require('rest/interceptor/pathPrefix'), { prefix: config.endpoint })
    .wrap(require('rest/interceptor/mime'), { mime: 'application/json' })
    .wrap(require('rest/interceptor/params'))
    .wrap(require('rest/interceptor/defaultRequest'), {
      params: { access_token: config.accessToken }
    })
    .wrap(require('rest/interceptor/template'))
    .wrap(standardResponse)
    .wrap(callbackify);
};

},{"../vendor/promise":16,"./callbackify":6,"./standard_response":14,"rest":18,"rest/interceptor/defaultRequest":23,"rest/interceptor/errorCode":24,"rest/interceptor/mime":25,"rest/interceptor/params":26,"rest/interceptor/pathPrefix":27,"rest/interceptor/template":28}],8:[function(require,module,exports){
// We keep all of the constants that declare endpoints in one
// place, so that we could conceivably update this for API layout
// revisions.
module.exports.DEFAULT_ENDPOINT = 'https://api.mapbox.com';

module.exports.API_GEOCODING_FORWARD = '/geocoding/v5/{dataset}/{query}.json{?proximity,country,types,bbox,limit}';
module.exports.API_GEOCODING_REVERSE = '/geocoding/v5/{dataset}/{longitude},{latitude}.json{?types,limit}';

module.exports.API_DIRECTIONS = '/v4/directions/{profile}/{encodedWaypoints}.json{?alternatives,instructions,geometry,steps}';
module.exports.API_DISTANCE = '/distances/v1/mapbox/{profile}';

module.exports.API_SURFACE = '/v4/surface/{mapid}.json{?layer,fields,points,geojson,interpolate,encoded_polyline}';

module.exports.API_UPLOADS = '/uploads/v1/{owner}';
module.exports.API_UPLOAD = '/uploads/v1/{owner}/{upload}';
module.exports.API_UPLOAD_CREDENTIALS = '/uploads/v1/{owner}/credentials';

module.exports.API_MATCHING = '/matching/v4/{profile}.json';

module.exports.API_DATASET_DATASETS = '/datasets/v1/{owner}{?limit,start,fresh}';
module.exports.API_DATASET_DATASET = '/datasets/v1/{owner}/{dataset}';
module.exports.API_DATASET_FEATURES = '/datasets/v1/{owner}/{dataset}/features{?reverse,limit,start}';
module.exports.API_DATASET_FEATURE = '/datasets/v1/{owner}/{dataset}/features/{id}';

module.exports.API_TILESTATS_STATISTICS = '/tilestats/v1/{owner}/{tileset}';
module.exports.API_TILESTATS_LAYER = '/tilestats/v1/{owner}/{tileset}/{layer}';
module.exports.API_TILESTATS_ATTRIBUTE = '/tilestats/v1/{owner}/{tileset}/{layer}/{attribute}';

module.exports.API_STATIC = '/v4/{mapid}{+overlay}/{+xyz}/{width}x{height}{+retina}{.format}{?access_token}';

module.exports.API_STYLES_LIST = '/styles/v1/{owner}';
module.exports.API_STYLES_CREATE = '/styles/v1/{owner}';
module.exports.API_STYLES_READ = '/styles/v1/{owner}/{styleid}';
module.exports.API_STYLES_UPDATE = '/styles/v1/{owner}/{styleid}';
module.exports.API_STYLES_DELETE = '/styles/v1/{owner}/{styleid}';
module.exports.API_STYLES_EMBED = '/styles/v1/{owner}/{styleid}.html{?zoomwheel,title,access_token}';
module.exports.API_STYLES_SPRITE = '/styles/v1/{owner}/{styleid}/sprite{+retina}{.format}';
module.exports.API_STYLES_SPRITE_ADD_ICON = '/styles/v1/{owner}/{styleid}/sprite/{iconName}';
module.exports.API_STYLES_SPRITE_DELETE_ICON = '/styles/v1/{owner}/{styleid}/sprite/{iconName}';

module.exports.API_STYLES_FONT_GLYPH_RANGES = '/fonts/v1/{owner}/{font}/{start}-{end}.pbf'

},{}],9:[function(require,module,exports){
'use strict';

var invariantLocation = require('./invariant_location');

/**
 * Format waypionts in a way that's friendly to the directions and surface
 * API: comma-separated latitude, longitude pairs with semicolons between
 * them.
 * @private
 * @param {Array<Object>} waypoints array of objects with latitude and longitude
 * properties
 * @returns {string} formatted points
 * @throws {Error} if the input is invalid
 */
function formatPoints(waypoints) {
  return waypoints.map(function(location) {
    invariantLocation(location);
    return location.longitude + ',' + location.latitude;
  }).join(';');
}

module.exports = formatPoints;

},{"./invariant_location":11}],10:[function(require,module,exports){
'use strict';

var b64 = require('rest/util/base64');

/**
 * Access tokens actually are data, and using them we can derive
 * a user's username. This method attempts to do just that,
 * decoding the part of the token after the first `.` into
 * a username.
 *
 * @private
 * @param {string} token an access token
 * @return {string} username
 */
function getUser(token) {
  var data = token.split('.')[1];
  if (!data) return null;
  data = data.replace(/-/g, '+').replace(/_/g, '/');

  var mod = data.length % 4;
  if (mod === 2) data += '==';
  if (mod === 3) data += '=';
  if (mod === 1 || mod > 3) return null;

  try {
    return JSON.parse(b64.decode(data)).u;
  } catch(err) {
    return null;
  }
}

module.exports = getUser;

},{"rest/util/base64":37}],11:[function(require,module,exports){
'use strict';

var invariant = require('../vendor/invariant');

/**
 * Given an object that should be a location, ensure that it has
 * valid numeric longitude & latitude properties
 *
 * @param {Object} location object with longitude and latitude values
 * @throws {AssertError} if the object is not a valid location
 * @returns {undefined} nothing
 * @private
 */
function invariantLocation(location) {
  invariant(typeof location.latitude === 'number' &&
    typeof location.longitude === 'number',
    'location must be an object with numeric latitude & longitude properties');
  if (location.zoom !== undefined) {
    invariant(typeof location.zoom === 'number', 'zoom must be numeric');
  }
}

module.exports = invariantLocation;

},{"../vendor/invariant":15}],12:[function(require,module,exports){
'use strict';

var invariant = require('../vendor/invariant');
var constants = require('./constants');
var client = require('./client');
var getUser = require('./get_user');

/**
 * Services all have the same constructor pattern: you initialize them
 * with an access token and options, and they validate those arguments
 * in a predictable way. This is a constructor-generator that makes
 * it possible to require each service's API individually.
 *
 * @private
 * @param {string} name the name of the Mapbox API this class will access:
 * this is set to the name of the function so it will show up in tracebacks
 * @returns {Function} constructor function
 */
function makeService(name) {

  function service(accessToken, options) {
    this.name = name;

    invariant(typeof accessToken === 'string',
      'accessToken required to instantiate Mapbox client');

    var endpoint = constants.DEFAULT_ENDPOINT;

    if (options !== undefined) {
      invariant(typeof options === 'object', 'options must be an object');
      if (options.endpoint) {
        invariant(typeof options.endpoint === 'string', 'endpoint must be a string');
        endpoint = options.endpoint;
      }
      if (options.account) {
        invariant(typeof options.account === 'string', 'account must be a string');
        this.owner = options.account;
      }
    }

    this.client = client({
      endpoint: endpoint,
      accessToken: accessToken
    });

    this.accessToken = accessToken;
    this.endpoint = endpoint;
    this.owner = this.owner || getUser(accessToken);
    invariant(!!this.owner, 'could not determine account from provided accessToken');

  }

  return service;
}

module.exports = makeService;

},{"../vendor/invariant":15,"./client":7,"./constants":8,"./get_user":10}],13:[function(require,module,exports){
'use strict';

var invariant = require('../../vendor/invariant'),
  formatPoints = require('../format_points'),
  makeService = require('../make_service'),
  constants = require('../constants');

var MapboxDirections = makeService('MapboxDirections');

/**
 * Find directions from A to B, or between any number of locations.
 * Consult the [Mapbox Directions API](https://www.mapbox.com/developers/api/directions/)
 * for more documentation.
 *
 * @param {Array<Object>} waypoints an array of objects with `latitude`
 * and `longitude` properties that represent waypoints in order. Up to
 * 25 waypoints can be specified.
 * @param {Object} [options={}] additional options meant to tune
 * the request
 * @param {string} [options.profile=mapbox.driving] the directions
 * profile, which determines how to prioritize different routes.
 * Options are `'mapbox.driving'`, which assumes transportation via an
 * automobile and will use highways, `'mapbox.walking'`, which avoids
 * streets without sidewalks, and `'mapbox.cycling'`, which prefers streets
 * with bicycle lanes and lower speed limits for transportation via
 * bicycle.
 * @param {string} [options.alternatives=true] whether to generate
 * alternative routes along with the preferred route.
 * @param {string} [options.instructions=text] format for turn-by-turn
 * instructions along the route.
 * @param {string} [options.geometry=geojson] format for the returned
 * route. Options are `'geojson'`, `'polyline'`, or `false`: `polyline`
 * yields more compact responses which can be decoded on the client side.
 * [GeoJSON](http://geojson.org/), the default, is compatible with libraries
 * like [Mapbox GL](https://www.mapbox.com/mapbox-gl/),
 * Leaflet and [Mapbox.js](https://www.mapbox.com/mapbox.js/). `false`
 * omits the geometry entirely and only returns instructions.
 * @param {Function} callback called with (err, results)
 * @returns {undefined} nothing, calls callback
 * @memberof MapboxClient
 * @example
 * var mapboxClient = new MapboxClient('ACCESSTOKEN');
 * mapboxClient.getDirections(
 *   [
 *     { latitude: 33.6, longitude: -95.4431 },
 *     { latitude: 33.2, longitude: -95.4431 } ],
 *   function(err, res) {
 *   // res is a document with directions
 * });
 *
 * // With options
 * mapboxClient.getDirections([
 *   { latitude: 33.6875431, longitude: -95.4431142 },
 *   { latitude: 33.6875431, longitude: -95.4831142 }
 * ], {
 *   profile: 'mapbox.walking',
 *   instructions: 'html',
 *   alternatives: false,
 *   geometry: 'polyline'
 * }, function(err, results) {
 *   console.log(results.origin);
 * });
 */
MapboxDirections.prototype.getDirections = function(waypoints, options, callback) {

  // permit the options argument to be omitted
  if (callback === undefined && typeof options === 'function') {
    callback = options;
    options = {};
  } else if (options === undefined) {
    options = {};
  }

  // typecheck arguments
  invariant(Array.isArray(waypoints), 'waypoints must be an array');
  invariant(typeof options === 'object', 'options must be an object');

  var encodedWaypoints = formatPoints(waypoints);

  var profile = 'mapbox.driving',
    alternatives = true,
    steps = true,
    geometry = 'geojson',
    instructions = 'text';

  if (options.profile) {
    invariant(typeof options.profile === 'string', 'profile option must be string');
    profile = options.profile;
  }

  if (typeof options.alternatives !== 'undefined') {
    invariant(typeof options.alternatives === 'boolean', 'alternatives option must be boolean');
    alternatives = options.alternatives;
  }

  if (typeof options.steps !== 'undefined') {
    invariant(typeof options.steps === 'boolean', 'steps option must be boolean');
    steps = options.steps;
  }

  if (options.geometry) {
    invariant(typeof options.geometry === 'string', 'geometry option must be string');
    geometry = options.geometry;
  }

  if (options.instructions) {
    invariant(typeof options.instructions === 'string', 'instructions option must be string');
    instructions = options.instructions;
  }

  return this.client({
    path: constants.API_DIRECTIONS,
    params: {
      encodedWaypoints: encodedWaypoints,
      profile: profile,
      instructions: instructions,
      geometry: geometry,
      alternatives: alternatives,
      steps: steps
    },
    callback: callback
  });
};

module.exports = MapboxDirections;

},{"../../vendor/invariant":15,"../constants":8,"../format_points":9,"../make_service":12}],14:[function(require,module,exports){
var interceptor = require('rest/interceptor');

var standardResponse = interceptor({
  response: transform,
});

function transform(response) {
  return {
    url: response.url,
    status: response.status ? response.status.code : undefined,
    headers: response.headers,
    entity: response.entity,
    error: response.error,
    callback: response.request.callback
  };
};

module.exports = standardResponse;

},{"rest/interceptor":22}],15:[function(require,module,exports){
(function (process){
/*
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

/*
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var NODE_ENV = process.env.NODE_ENV;

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (NODE_ENV !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

}).call(this,require('_process'))

},{"_process":45}],16:[function(require,module,exports){
(function (process,global){
!function(t){"object"==typeof exports?module.exports=t():"function"==typeof define&&define.amd?define(t):"undefined"!=typeof window?window.Promise=t():"undefined"!=typeof global?global.Promise=t():"undefined"!=typeof self&&(self.Promise=t())}(function(){var t;return function e(t,n,o){function r(u,c){if(!n[u]){if(!t[u]){var f="function"==typeof require&&require;if(!c&&f)return f(u,!0);if(i)return i(u,!0);throw new Error("Cannot find module '"+u+"'")}var s=n[u]={exports:{}};t[u][0].call(s.exports,function(e){var n=t[u][1][e];return r(n?n:e)},s,s.exports,e,t,n,o)}return n[u].exports}for(var i="function"==typeof require&&require,u=0;u<o.length;u++)r(o[u]);return r}({1:[function(t,e,n){var o=t("../lib/decorators/unhandledRejection"),r=o(t("../lib/Promise"));e.exports="undefined"!=typeof global?global.Promise=r:"undefined"!=typeof self?self.Promise=r:r},{"../lib/Promise":2,"../lib/decorators/unhandledRejection":4}],2:[function(e,n,o){!function(t){"use strict";t(function(t){var e=t("./makePromise"),n=t("./Scheduler"),o=t("./env").asap;return e({scheduler:new n(o)})})}("function"==typeof t&&t.amd?t:function(t){n.exports=t(e)})},{"./Scheduler":3,"./env":5,"./makePromise":7}],3:[function(e,n,o){!function(t){"use strict";t(function(){function t(t){this._async=t,this._running=!1,this._queue=this,this._queueLen=0,this._afterQueue={},this._afterQueueLen=0;var e=this;this.drain=function(){e._drain()}}return t.prototype.enqueue=function(t){this._queue[this._queueLen++]=t,this.run()},t.prototype.afterQueue=function(t){this._afterQueue[this._afterQueueLen++]=t,this.run()},t.prototype.run=function(){this._running||(this._running=!0,this._async(this.drain))},t.prototype._drain=function(){for(var t=0;t<this._queueLen;++t)this._queue[t].run(),this._queue[t]=void 0;for(this._queueLen=0,this._running=!1,t=0;t<this._afterQueueLen;++t)this._afterQueue[t].run(),this._afterQueue[t]=void 0;this._afterQueueLen=0},t})}("function"==typeof t&&t.amd?t:function(t){n.exports=t()})},{}],4:[function(e,n,o){!function(t){"use strict";t(function(t){function e(t){throw t}function n(){}var o=t("../env").setTimer,r=t("../format");return function(t){function i(t){t.handled||(l.push(t),a("Potentially unhandled rejection ["+t.id+"] "+r.formatError(t.value)))}function u(t){var e=l.indexOf(t);e>=0&&(l.splice(e,1),h("Handled previous rejection ["+t.id+"] "+r.formatObject(t.value)))}function c(t,e){p.push(t,e),null===d&&(d=o(f,0))}function f(){for(d=null;p.length>0;)p.shift()(p.shift())}var s,a=n,h=n;"undefined"!=typeof console&&(s=console,a="undefined"!=typeof s.error?function(t){s.error(t)}:function(t){s.log(t)},h="undefined"!=typeof s.info?function(t){s.info(t)}:function(t){s.log(t)}),t.onPotentiallyUnhandledRejection=function(t){c(i,t)},t.onPotentiallyUnhandledRejectionHandled=function(t){c(u,t)},t.onFatalRejection=function(t){c(e,t.value)};var p=[],l=[],d=null;return t}})}("function"==typeof t&&t.amd?t:function(t){n.exports=t(e)})},{"../env":5,"../format":6}],5:[function(e,n,o){!function(t){"use strict";t(function(t){function e(){return"undefined"!=typeof process&&"[object process]"===Object.prototype.toString.call(process)}function n(){return"function"==typeof MutationObserver&&MutationObserver||"function"==typeof WebKitMutationObserver&&WebKitMutationObserver}function o(t){function e(){var t=n;n=void 0,t()}var n,o=document.createTextNode(""),r=new t(e);r.observe(o,{characterData:!0});var i=0;return function(t){n=t,o.data=i^=1}}var r,i="undefined"!=typeof setTimeout&&setTimeout,u=function(t,e){return setTimeout(t,e)},c=function(t){return clearTimeout(t)},f=function(t){return i(t,0)};if(e())f=function(t){return process.nextTick(t)};else if(r=n())f=o(r);else if(!i){var s=t,a=s("vertx");u=function(t,e){return a.setTimer(e,t)},c=a.cancelTimer,f=a.runOnLoop||a.runOnContext}return{setTimer:u,clearTimer:c,asap:f}})}("function"==typeof t&&t.amd?t:function(t){n.exports=t(e)})},{}],6:[function(e,n,o){!function(t){"use strict";t(function(){function t(t){var n="object"==typeof t&&null!==t&&(t.stack||t.message)?t.stack||t.message:e(t);return t instanceof Error?n:n+" (WARNING: non-Error used)"}function e(t){var e=String(t);return"[object Object]"===e&&"undefined"!=typeof JSON&&(e=n(t,e)),e}function n(t,e){try{return JSON.stringify(t)}catch(n){return e}}return{formatError:t,formatObject:e,tryStringify:n}})}("function"==typeof t&&t.amd?t:function(t){n.exports=t()})},{}],7:[function(e,n,o){!function(t){"use strict";t(function(){return function(t){function e(t,e){this._handler=t===_?e:n(t)}function n(t){function e(t){r.resolve(t)}function n(t){r.reject(t)}function o(t){r.notify(t)}var r=new b;try{t(e,n,o)}catch(i){n(i)}return r}function o(t){return S(t)?t:new e(_,new x(y(t)))}function r(t){return new e(_,new x(new P(t)))}function i(){return $}function u(){return new e(_,new b)}function c(t,e){var n=new b(t.receiver,t.join().context);return new e(_,n)}function f(t){return a(K,null,t)}function s(t,e){return a(F,t,e)}function a(t,n,o){function r(e,r,u){u.resolved||h(o,i,e,t(n,r,e),u)}function i(t,e,n){a[t]=e,0===--s&&n.become(new q(a))}for(var u,c="function"==typeof n?r:i,f=new b,s=o.length>>>0,a=new Array(s),p=0;p<o.length&&!f.resolved;++p)u=o[p],void 0!==u||p in o?h(o,c,p,u,f):--s;return 0===s&&f.become(new q(a)),new e(_,f)}function h(t,e,n,o,r){if(U(o)){var i=m(o),u=i.state();0===u?i.fold(e,n,void 0,r):u>0?e(n,i.value,r):(r.become(i),p(t,n+1,i))}else e(n,o,r)}function p(t,e,n){for(var o=e;o<t.length;++o)l(y(t[o]),n)}function l(t,e){if(t!==e){var n=t.state();0===n?t.visit(t,void 0,t._unreport):0>n&&t._unreport()}}function d(t){return"object"!=typeof t||null===t?r(new TypeError("non-iterable passed to race()")):0===t.length?i():1===t.length?o(t[0]):v(t)}function v(t){var n,o,r,i=new b;for(n=0;n<t.length;++n)if(o=t[n],void 0!==o||n in t){if(r=y(o),0!==r.state()){i.become(r),p(t,n+1,r);break}r.visit(i,i.resolve,i.reject)}return new e(_,i)}function y(t){return S(t)?t._handler.join():U(t)?j(t):new q(t)}function m(t){return S(t)?t._handler.join():j(t)}function j(t){try{var e=t.then;return"function"==typeof e?new g(e,t):new q(t)}catch(n){return new P(n)}}function _(){}function w(){}function b(t,n){e.createContext(this,n),this.consumers=void 0,this.receiver=t,this.handler=void 0,this.resolved=!1}function x(t){this.handler=t}function g(t,e){b.call(this),I.enqueue(new E(t,e,this))}function q(t){e.createContext(this),this.value=t}function P(t){e.createContext(this),this.id=++Y,this.value=t,this.handled=!1,this.reported=!1,this._report()}function R(t,e){this.rejection=t,this.context=e}function C(t){this.rejection=t}function O(){return new P(new TypeError("Promise cycle"))}function T(t,e){this.continuation=t,this.handler=e}function Q(t,e){this.handler=e,this.value=t}function E(t,e,n){this._then=t,this.thenable=e,this.resolver=n}function L(t,e,n,o,r){try{t.call(e,n,o,r)}catch(i){o(i)}}function k(t,e,n,o){this.f=t,this.z=e,this.c=n,this.to=o,this.resolver=X,this.receiver=this}function S(t){return t instanceof e}function U(t){return("object"==typeof t||"function"==typeof t)&&null!==t}function H(t,n,o,r){return"function"!=typeof t?r.become(n):(e.enterContext(n),W(t,n.value,o,r),void e.exitContext())}function N(t,n,o,r,i){return"function"!=typeof t?i.become(o):(e.enterContext(o),z(t,n,o.value,r,i),void e.exitContext())}function M(t,n,o,r,i){return"function"!=typeof t?i.notify(n):(e.enterContext(o),A(t,n,r,i),void e.exitContext())}function F(t,e,n){try{return t(e,n)}catch(o){return r(o)}}function W(t,e,n,o){try{o.become(y(t.call(n,e)))}catch(r){o.become(new P(r))}}function z(t,e,n,o,r){try{t.call(o,e,n,r)}catch(i){r.become(new P(i))}}function A(t,e,n,o){try{o.notify(t.call(n,e))}catch(r){o.notify(r)}}function J(t,e){e.prototype=V(t.prototype),e.prototype.constructor=e}function K(t,e){return e}function D(){}function G(){return"undefined"!=typeof process&&null!==process&&"function"==typeof process.emit?function(t,e){return"unhandledRejection"===t?process.emit(t,e.value,e):process.emit(t,e)}:"undefined"!=typeof self&&"function"==typeof CustomEvent?function(t,e,n){var o=!1;try{var r=new n("unhandledRejection");o=r instanceof n}catch(i){}return o?function(t,o){var r=new n(t,{detail:{reason:o.value,key:o},bubbles:!1,cancelable:!0});return!e.dispatchEvent(r)}:t}(D,self,CustomEvent):D}var I=t.scheduler,B=G(),V=Object.create||function(t){function e(){}return e.prototype=t,new e};e.resolve=o,e.reject=r,e.never=i,e._defer=u,e._handler=y,e.prototype.then=function(t,e,n){var o=this._handler,r=o.join().state();if("function"!=typeof t&&r>0||"function"!=typeof e&&0>r)return new this.constructor(_,o);var i=this._beget(),u=i._handler;return o.chain(u,o.receiver,t,e,n),i},e.prototype["catch"]=function(t){return this.then(void 0,t)},e.prototype._beget=function(){return c(this._handler,this.constructor)},e.all=f,e.race=d,e._traverse=s,e._visitRemaining=p,_.prototype.when=_.prototype.become=_.prototype.notify=_.prototype.fail=_.prototype._unreport=_.prototype._report=D,_.prototype._state=0,_.prototype.state=function(){return this._state},_.prototype.join=function(){for(var t=this;void 0!==t.handler;)t=t.handler;return t},_.prototype.chain=function(t,e,n,o,r){this.when({resolver:t,receiver:e,fulfilled:n,rejected:o,progress:r})},_.prototype.visit=function(t,e,n,o){this.chain(X,t,e,n,o)},_.prototype.fold=function(t,e,n,o){this.when(new k(t,e,n,o))},J(_,w),w.prototype.become=function(t){t.fail()};var X=new w;J(_,b),b.prototype._state=0,b.prototype.resolve=function(t){this.become(y(t))},b.prototype.reject=function(t){this.resolved||this.become(new P(t))},b.prototype.join=function(){if(!this.resolved)return this;for(var t=this;void 0!==t.handler;)if(t=t.handler,t===this)return this.handler=O();return t},b.prototype.run=function(){var t=this.consumers,e=this.handler;this.handler=this.handler.join(),this.consumers=void 0;for(var n=0;n<t.length;++n)e.when(t[n])},b.prototype.become=function(t){this.resolved||(this.resolved=!0,this.handler=t,void 0!==this.consumers&&I.enqueue(this),void 0!==this.context&&t._report(this.context))},b.prototype.when=function(t){this.resolved?I.enqueue(new T(t,this.handler)):void 0===this.consumers?this.consumers=[t]:this.consumers.push(t)},b.prototype.notify=function(t){this.resolved||I.enqueue(new Q(t,this))},b.prototype.fail=function(t){var e="undefined"==typeof t?this.context:t;this.resolved&&this.handler.join().fail(e)},b.prototype._report=function(t){this.resolved&&this.handler.join()._report(t)},b.prototype._unreport=function(){this.resolved&&this.handler.join()._unreport()},J(_,x),x.prototype.when=function(t){I.enqueue(new T(t,this))},x.prototype._report=function(t){this.join()._report(t)},x.prototype._unreport=function(){this.join()._unreport()},J(b,g),J(_,q),q.prototype._state=1,q.prototype.fold=function(t,e,n,o){N(t,e,this,n,o)},q.prototype.when=function(t){H(t.fulfilled,this,t.receiver,t.resolver)};var Y=0;J(_,P),P.prototype._state=-1,P.prototype.fold=function(t,e,n,o){o.become(this)},P.prototype.when=function(t){"function"==typeof t.rejected&&this._unreport(),H(t.rejected,this,t.receiver,t.resolver)},P.prototype._report=function(t){I.afterQueue(new R(this,t))},P.prototype._unreport=function(){this.handled||(this.handled=!0,I.afterQueue(new C(this)))},P.prototype.fail=function(t){this.reported=!0,B("unhandledRejection",this),e.onFatalRejection(this,void 0===t?this.context:t)},R.prototype.run=function(){this.rejection.handled||this.rejection.reported||(this.rejection.reported=!0,B("unhandledRejection",this.rejection)||e.onPotentiallyUnhandledRejection(this.rejection,this.context))},C.prototype.run=function(){this.rejection.reported&&(B("rejectionHandled",this.rejection)||e.onPotentiallyUnhandledRejectionHandled(this.rejection))},e.createContext=e.enterContext=e.exitContext=e.onPotentiallyUnhandledRejection=e.onPotentiallyUnhandledRejectionHandled=e.onFatalRejection=D;var Z=new _,$=new e(_,Z);return T.prototype.run=function(){this.handler.join().when(this.continuation)},Q.prototype.run=function(){var t=this.handler.consumers;if(void 0!==t)for(var e,n=0;n<t.length;++n)e=t[n],M(e.progress,this.value,this.handler,e.receiver,e.resolver)},E.prototype.run=function(){function t(t){o.resolve(t)}function e(t){o.reject(t)}function n(t){o.notify(t)}var o=this.resolver;L(this._then,this.thenable,t,e,n)},k.prototype.fulfilled=function(t){this.f.call(this.c,this.z,t,this.to)},k.prototype.rejected=function(t){this.to.reject(t)},k.prototype.progress=function(t){this.to.notify(t)},e}})}("function"==typeof t&&t.amd?t:function(t){n.exports=t()})},{}]},{},[1])(1)});


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":45}],17:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var mixin, xWWWFormURLEncoder, origin, urlRE, absoluteUrlRE, fullyQualifiedUrlRE;

mixin = require('./util/mixin');
xWWWFormURLEncoder = require('./mime/type/application/x-www-form-urlencoded');

urlRE = /([a-z][a-z0-9\+\-\.]*:)\/\/([^@]+@)?(([^:\/]+)(:([0-9]+))?)?(\/[^?#]*)?(\?[^#]*)?(#\S*)?/i;
absoluteUrlRE = /^([a-z][a-z0-9\-\+\.]*:\/\/|\/)/i;
fullyQualifiedUrlRE = /([a-z][a-z0-9\+\-\.]*:)\/\/([^@]+@)?(([^:\/]+)(:([0-9]+))?)?\//i;

/**
 * Apply params to the template to create a URL.
 *
 * Parameters that are not applied directly to the template, are appended
 * to the URL as query string parameters.
 *
 * @param {string} template the URI template
 * @param {Object} params parameters to apply to the template
 * @return {string} the resulting URL
 */
function buildUrl(template, params) {
	// internal builder to convert template with params.
	var url, name, queryStringParams, queryString, re;

	url = template;
	queryStringParams = {};

	if (params) {
		for (name in params) {
			/*jshint forin:false */
			re = new RegExp('\\{' + name + '\\}');
			if (re.test(url)) {
				url = url.replace(re, encodeURIComponent(params[name]), 'g');
			}
			else {
				queryStringParams[name] = params[name];
			}
		}

		queryString = xWWWFormURLEncoder.write(queryStringParams);
		if (queryString) {
			url += url.indexOf('?') === -1 ? '?' : '&';
			url += queryString;
		}
	}
	return url;
}

function startsWith(str, test) {
	return str.indexOf(test) === 0;
}

/**
 * Create a new URL Builder
 *
 * @param {string|UrlBuilder} template the base template to build from, may be another UrlBuilder
 * @param {Object} [params] base parameters
 * @constructor
 */
function UrlBuilder(template, params) {
	if (!(this instanceof UrlBuilder)) {
		// invoke as a constructor
		return new UrlBuilder(template, params);
	}

	if (template instanceof UrlBuilder) {
		this._template = template.template;
		this._params = mixin({}, this._params, params);
	}
	else {
		this._template = (template || '').toString();
		this._params = params || {};
	}
}

UrlBuilder.prototype = {

	/**
	 * Create a new UrlBuilder instance that extends the current builder.
	 * The current builder is unmodified.
	 *
	 * @param {string} [template] URL template to append to the current template
	 * @param {Object} [params] params to combine with current params.  New params override existing params
	 * @return {UrlBuilder} the new builder
	 */
	append: function (template,  params) {
		// TODO consider query strings and fragments
		return new UrlBuilder(this._template + template, mixin({}, this._params, params));
	},

	/**
	 * Create a new UrlBuilder with a fully qualified URL based on the
	 * window's location or base href and the current templates relative URL.
	 *
	 * Path variables are preserved.
	 *
	 * *Browser only*
	 *
	 * @return {UrlBuilder} the fully qualified URL template
	 */
	fullyQualify: function () {
		if (typeof location === 'undefined') { return this; }
		if (this.isFullyQualified()) { return this; }

		var template = this._template;

		if (startsWith(template, '//')) {
			template = origin.protocol + template;
		}
		else if (startsWith(template, '/')) {
			template = origin.origin + template;
		}
		else if (!this.isAbsolute()) {
			template = origin.origin + origin.pathname.substring(0, origin.pathname.lastIndexOf('/') + 1);
		}

		if (template.indexOf('/', 8) === -1) {
			// default the pathname to '/'
			template = template + '/';
		}

		return new UrlBuilder(template, this._params);
	},

	/**
	 * True if the URL is absolute
	 *
	 * @return {boolean}
	 */
	isAbsolute: function () {
		return absoluteUrlRE.test(this.build());
	},

	/**
	 * True if the URL is fully qualified
	 *
	 * @return {boolean}
	 */
	isFullyQualified: function () {
		return fullyQualifiedUrlRE.test(this.build());
	},

	/**
	 * True if the URL is cross origin. The protocol, host and port must not be
	 * the same in order to be cross origin,
	 *
	 * @return {boolean}
	 */
	isCrossOrigin: function () {
		if (!origin) {
			return true;
		}
		var url = this.parts();
		return url.protocol !== origin.protocol ||
		       url.hostname !== origin.hostname ||
		       url.port !== origin.port;
	},

	/**
	 * Split a URL into its consituent parts following the naming convention of
	 * 'window.location'. One difference is that the port will contain the
	 * protocol default if not specified.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/DOM/window.location
	 *
	 * @returns {Object} a 'window.location'-like object
	 */
	parts: function () {
		/*jshint maxcomplexity:20 */
		var url, parts;
		url = this.fullyQualify().build().match(urlRE);
		parts = {
			href: url[0],
			protocol: url[1],
			host: url[3] || '',
			hostname: url[4] || '',
			port: url[6],
			pathname: url[7] || '',
			search: url[8] || '',
			hash: url[9] || ''
		};
		parts.origin = parts.protocol + '//' + parts.host;
		parts.port = parts.port || (parts.protocol === 'https:' ? '443' : parts.protocol === 'http:' ? '80' : '');
		return parts;
	},

	/**
	 * Expand the template replacing path variables with parameters
	 *
	 * @param {Object} [params] params to combine with current params.  New params override existing params
	 * @return {string} the expanded URL
	 */
	build: function (params) {
		return buildUrl(this._template, mixin({}, this._params, params));
	},

	/**
	 * @see build
	 */
	toString: function () {
		return this.build();
	}

};

origin = typeof location !== 'undefined' ? new UrlBuilder(location.href).parts() : void 0;

module.exports = UrlBuilder;

},{"./mime/type/application/x-www-form-urlencoded":33,"./util/mixin":40}],18:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var rest = require('./client/default'),
    browser = require('./client/xhr');

rest.setPlatformDefaultClient(browser);

module.exports = rest;

},{"./client/default":20,"./client/xhr":21}],19:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Add common helper methods to a client impl
 *
 * @param {function} impl the client implementation
 * @param {Client} [target] target of this client, used when wrapping other clients
 * @returns {Client} the client impl with additional methods
 */
module.exports = function client(impl, target) {

	if (target) {

		/**
		 * @returns {Client} the target client
		 */
		impl.skip = function skip() {
			return target;
		};

	}

	/**
	 * Allow a client to easily be wrapped by an interceptor
	 *
	 * @param {Interceptor} interceptor the interceptor to wrap this client with
	 * @param [config] configuration for the interceptor
	 * @returns {Client} the newly wrapped client
	 */
	impl.wrap = function wrap(interceptor, config) {
		return interceptor(impl, config);
	};

	/**
	 * @deprecated
	 */
	impl.chain = function chain() {
		if (typeof console !== 'undefined') {
			console.log('rest.js: client.chain() is deprecated, use client.wrap() instead');
		}

		return impl.wrap.apply(this, arguments);
	};

	return impl;

};

},{}],20:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Plain JS Object containing properties that represent an HTTP request.
 *
 * Depending on the capabilities of the underlying client, a request
 * may be cancelable. If a request may be canceled, the client will add
 * a canceled flag and cancel function to the request object. Canceling
 * the request will put the response into an error state.
 *
 * @field {string} [method='GET'] HTTP method, commonly GET, POST, PUT, DELETE or HEAD
 * @field {string|UrlBuilder} [path=''] path template with optional path variables
 * @field {Object} [params] parameters for the path template and query string
 * @field {Object} [headers] custom HTTP headers to send, in addition to the clients default headers
 * @field [entity] the HTTP entity, common for POST or PUT requests
 * @field {boolean} [canceled] true if the request has been canceled, set by the client
 * @field {Function} [cancel] cancels the request if invoked, provided by the client
 * @field {Client} [originator] the client that first handled this request, provided by the interceptor
 *
 * @class Request
 */

/**
 * Plain JS Object containing properties that represent an HTTP response
 *
 * @field {Object} [request] the request object as received by the root client
 * @field {Object} [raw] the underlying request object, like XmlHttpRequest in a browser
 * @field {number} [status.code] status code of the response (i.e. 200, 404)
 * @field {string} [status.text] status phrase of the response
 * @field {Object] [headers] response headers hash of normalized name, value pairs
 * @field [entity] the response body
 *
 * @class Response
 */

/**
 * HTTP client particularly suited for RESTful operations.
 *
 * @field {function} wrap wraps this client with a new interceptor returning the wrapped client
 *
 * @param {Request} the HTTP request
 * @returns {ResponsePromise<Response>} a promise the resolves to the HTTP response
 *
 * @class Client
 */

 /**
  * Extended when.js Promises/A+ promise with HTTP specific helpers
  *q
  * @method entity promise for the HTTP entity
  * @method status promise for the HTTP status code
  * @method headers promise for the HTTP response headers
  * @method header promise for a specific HTTP response header
  *
  * @class ResponsePromise
  * @extends Promise
  */

var client, target, platformDefault;

client = require('../client');

if (typeof Promise !== 'function' && console && console.log) {
	console.log('An ES6 Promise implementation is required to use rest.js. See https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md for using when.js as a Promise polyfill.');
}

/**
 * Make a request with the default client
 * @param {Request} the HTTP request
 * @returns {Promise<Response>} a promise the resolves to the HTTP response
 */
function defaultClient() {
	return target.apply(void 0, arguments);
}

/**
 * Change the default client
 * @param {Client} client the new default client
 */
defaultClient.setDefaultClient = function setDefaultClient(client) {
	target = client;
};

/**
 * Obtain a direct reference to the current default client
 * @returns {Client} the default client
 */
defaultClient.getDefaultClient = function getDefaultClient() {
	return target;
};

/**
 * Reset the default client to the platform default
 */
defaultClient.resetDefaultClient = function resetDefaultClient() {
	target = platformDefault;
};

/**
 * @private
 */
defaultClient.setPlatformDefaultClient = function setPlatformDefaultClient(client) {
	if (platformDefault) {
		throw new Error('Unable to redefine platformDefaultClient');
	}
	target = platformDefault = client;
};

module.exports = client(defaultClient);

},{"../client":19}],21:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var normalizeHeaderName, responsePromise, client, headerSplitRE;

normalizeHeaderName = require('../util/normalizeHeaderName');
responsePromise = require('../util/responsePromise');
client = require('../client');

// according to the spec, the line break is '\r\n', but doesn't hold true in practice
headerSplitRE = /[\r|\n]+/;

function parseHeaders(raw) {
	// Note: Set-Cookie will be removed by the browser
	var headers = {};

	if (!raw) { return headers; }

	raw.trim().split(headerSplitRE).forEach(function (header) {
		var boundary, name, value;
		boundary = header.indexOf(':');
		name = normalizeHeaderName(header.substring(0, boundary).trim());
		value = header.substring(boundary + 1).trim();
		if (headers[name]) {
			if (Array.isArray(headers[name])) {
				// add to an existing array
				headers[name].push(value);
			}
			else {
				// convert single value to array
				headers[name] = [headers[name], value];
			}
		}
		else {
			// new, single value
			headers[name] = value;
		}
	});

	return headers;
}

function safeMixin(target, source) {
	Object.keys(source || {}).forEach(function (prop) {
		// make sure the property already exists as
		// IE 6 will blow up if we add a new prop
		if (source.hasOwnProperty(prop) && prop in target) {
			try {
				target[prop] = source[prop];
			}
			catch (e) {
				// ignore, expected for some properties at some points in the request lifecycle
			}
		}
	});

	return target;
}

module.exports = client(function xhr(request) {
	return responsePromise.promise(function (resolve, reject) {
		/*jshint maxcomplexity:20 */

		var client, method, url, headers, entity, headerName, response, XHR;

		request = typeof request === 'string' ? { path: request } : request || {};
		response = { request: request };

		if (request.canceled) {
			response.error = 'precanceled';
			reject(response);
			return;
		}

		XHR = request.engine || XMLHttpRequest;
		if (!XHR) {
			reject({ request: request, error: 'xhr-not-available' });
			return;
		}

		entity = request.entity;
		request.method = request.method || (entity ? 'POST' : 'GET');
		method = request.method;
		url = response.url = request.path || '';

		try {
			client = response.raw = new XHR();

			// mixin extra request properties before and after opening the request as some properties require being set at different phases of the request
			safeMixin(client, request.mixin);
			client.open(method, url, true);
			safeMixin(client, request.mixin);

			headers = request.headers;
			for (headerName in headers) {
				/*jshint forin:false */
				if (headerName === 'Content-Type' && headers[headerName] === 'multipart/form-data') {
					// XMLHttpRequest generates its own Content-Type header with the
					// appropriate multipart boundary when sending multipart/form-data.
					continue;
				}

				client.setRequestHeader(headerName, headers[headerName]);
			}

			request.canceled = false;
			request.cancel = function cancel() {
				request.canceled = true;
				client.abort();
				reject(response);
			};

			client.onreadystatechange = function (/* e */) {
				if (request.canceled) { return; }
				if (client.readyState === (XHR.DONE || 4)) {
					response.status = {
						code: client.status,
						text: client.statusText
					};
					response.headers = parseHeaders(client.getAllResponseHeaders());
					response.entity = client.responseText;

					// #125 -- Sometimes IE8-9 uses 1223 instead of 204
					// http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
					if (response.status.code === 1223) {
						response.status.code = 204;
					}

					if (response.status.code > 0) {
						// check status code as readystatechange fires before error event
						resolve(response);
					}
					else {
						// give the error callback a chance to fire before resolving
						// requests for file:// URLs do not have a status code
						setTimeout(function () {
							resolve(response);
						}, 0);
					}
				}
			};

			try {
				client.onerror = function (/* e */) {
					response.error = 'loaderror';
					reject(response);
				};
			}
			catch (e) {
				// IE 6 will not support error handling
			}

			client.send(entity);
		}
		catch (e) {
			response.error = 'loaderror';
			reject(response);
		}

	});
});

},{"../client":19,"../util/normalizeHeaderName":41,"../util/responsePromise":42}],22:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var defaultClient, mixin, responsePromise, client;

defaultClient = require('./client/default');
mixin = require('./util/mixin');
responsePromise = require('./util/responsePromise');
client = require('./client');

/**
 * Interceptors have the ability to intercept the request and/org response
 * objects.  They may augment, prune, transform or replace the
 * request/response as needed.  Clients may be composed by wrapping
 * together multiple interceptors.
 *
 * Configured interceptors are functional in nature.  Wrapping a client in
 * an interceptor will not affect the client, merely the data that flows in
 * and out of that client.  A common configuration can be created once and
 * shared; specialization can be created by further wrapping that client
 * with custom interceptors.
 *
 * @param {Client} [target] client to wrap
 * @param {Object} [config] configuration for the interceptor, properties will be specific to the interceptor implementation
 * @returns {Client} A client wrapped with the interceptor
 *
 * @class Interceptor
 */

function defaultInitHandler(config) {
	return config;
}

function defaultRequestHandler(request /*, config, meta */) {
	return request;
}

function defaultResponseHandler(response /*, config, meta */) {
	return response;
}

/**
 * Alternate return type for the request handler that allows for more complex interactions.
 *
 * @param properties.request the traditional request return object
 * @param {Promise} [properties.abort] promise that resolves if/when the request is aborted
 * @param {Client} [properties.client] override the defined client with an alternate client
 * @param [properties.response] response for the request, short circuit the request
 */
function ComplexRequest(properties) {
	if (!(this instanceof ComplexRequest)) {
		// in case users forget the 'new' don't mix into the interceptor
		return new ComplexRequest(properties);
	}
	mixin(this, properties);
}

/**
 * Create a new interceptor for the provided handlers.
 *
 * @param {Function} [handlers.init] one time intialization, must return the config object
 * @param {Function} [handlers.request] request handler
 * @param {Function} [handlers.response] response handler regardless of error state
 * @param {Function} [handlers.success] response handler when the request is not in error
 * @param {Function} [handlers.error] response handler when the request is in error, may be used to 'unreject' an error state
 * @param {Function} [handlers.client] the client to use if otherwise not specified, defaults to platform default client
 *
 * @returns {Interceptor}
 */
function interceptor(handlers) {

	var initHandler, requestHandler, successResponseHandler, errorResponseHandler;

	handlers = handlers || {};

	initHandler            = handlers.init    || defaultInitHandler;
	requestHandler         = handlers.request || defaultRequestHandler;
	successResponseHandler = handlers.success || handlers.response || defaultResponseHandler;
	errorResponseHandler   = handlers.error   || function () {
		// Propagate the rejection, with the result of the handler
		return Promise.resolve((handlers.response || defaultResponseHandler).apply(this, arguments))
			.then(Promise.reject.bind(Promise));
	};

	return function (target, config) {

		if (typeof target === 'object') {
			config = target;
		}
		if (typeof target !== 'function') {
			target = handlers.client || defaultClient;
		}

		config = initHandler(config || {});

		function interceptedClient(request) {
			var context, meta;
			context = {};
			meta = { 'arguments': Array.prototype.slice.call(arguments), client: interceptedClient };
			request = typeof request === 'string' ? { path: request } : request || {};
			request.originator = request.originator || interceptedClient;
			return responsePromise(
				requestHandler.call(context, request, config, meta),
				function (request) {
					var response, abort, next;
					next = target;
					if (request instanceof ComplexRequest) {
						// unpack request
						abort = request.abort;
						next = request.client || next;
						response = request.response;
						// normalize request, must be last
						request = request.request;
					}
					response = response || Promise.resolve(request).then(function (request) {
						return Promise.resolve(next(request)).then(
							function (response) {
								return successResponseHandler.call(context, response, config, meta);
							},
							function (response) {
								return errorResponseHandler.call(context, response, config, meta);
							}
						);
					});
					return abort ? Promise.race([response, abort]) : response;
				},
				function (error) {
					return Promise.reject({ request: request, error: error });
				}
			);
		}

		return client(interceptedClient, target);
	};
}

interceptor.ComplexRequest = ComplexRequest;

module.exports = interceptor;

},{"./client":19,"./client/default":20,"./util/mixin":40,"./util/responsePromise":42}],23:[function(require,module,exports){
/*
 * Copyright 2013-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, mixinUtil, defaulter;

interceptor = require('../interceptor');
mixinUtil = require('../util/mixin');

defaulter = (function () {

	function mixin(prop, target, defaults) {
		if (prop in target || prop in defaults) {
			target[prop] = mixinUtil({}, defaults[prop], target[prop]);
		}
	}

	function copy(prop, target, defaults) {
		if (prop in defaults && !(prop in target)) {
			target[prop] = defaults[prop];
		}
	}

	var mappings = {
		method: copy,
		path: copy,
		params: mixin,
		headers: mixin,
		entity: copy,
		mixin: mixin
	};

	return function (target, defaults) {
		for (var prop in mappings) {
			/*jshint forin: false */
			mappings[prop](prop, target, defaults);
		}
		return target;
	};

}());

/**
 * Provide default values for a request. These values will be applied to the
 * request if the request object does not already contain an explicit value.
 *
 * For 'params', 'headers', and 'mixin', individual values are mixed in with the
 * request's values. The result is a new object representiing the combined
 * request and config values. Neither input object is mutated.
 *
 * @param {Client} [client] client to wrap
 * @param {string} [config.method] the default method
 * @param {string} [config.path] the default path
 * @param {Object} [config.params] the default params, mixed with the request's existing params
 * @param {Object} [config.headers] the default headers, mixed with the request's existing headers
 * @param {Object} [config.mixin] the default "mixins" (http/https options), mixed with the request's existing "mixins"
 *
 * @returns {Client}
 */
module.exports = interceptor({
	request: function handleRequest(request, config) {
		return defaulter(request, config);
	}
});

},{"../interceptor":22,"../util/mixin":40}],24:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor;

interceptor = require('../interceptor');

/**
 * Rejects the response promise based on the status code.
 *
 * Codes greater than or equal to the provided value are rejected.  Default
 * value 400.
 *
 * @param {Client} [client] client to wrap
 * @param {number} [config.code=400] code to indicate a rejection
 *
 * @returns {Client}
 */
module.exports = interceptor({
	init: function (config) {
		config.code = config.code || 400;
		return config;
	},
	response: function (response, config) {
		if (response.status && response.status.code >= config.code) {
			return Promise.reject(response);
		}
		return response;
	}
});

},{"../interceptor":22}],25:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, mime, registry, noopConverter, missingConverter, attempt;

interceptor = require('../interceptor');
mime = require('../mime');
registry = require('../mime/registry');
attempt = require('../util/attempt');

noopConverter = {
	read: function (obj) { return obj; },
	write: function (obj) { return obj; }
};

missingConverter = {
	read: function () { throw 'No read method found on converter'; },
	write: function () { throw 'No write method found on converter'; }
};

/**
 * MIME type support for request and response entities.  Entities are
 * (de)serialized using the converter for the MIME type.
 *
 * Request entities are converted using the desired converter and the
 * 'Accept' request header prefers this MIME.
 *
 * Response entities are converted based on the Content-Type response header.
 *
 * @param {Client} [client] client to wrap
 * @param {string} [config.mime='text/plain'] MIME type to encode the request
 *   entity
 * @param {string} [config.accept] Accept header for the request
 * @param {Client} [config.client=<request.originator>] client passed to the
 *   converter, defaults to the client originating the request
 * @param {Registry} [config.registry] MIME registry, defaults to the root
 *   registry
 * @param {boolean} [config.permissive] Allow an unkown request MIME type
 *
 * @returns {Client}
 */
module.exports = interceptor({
	init: function (config) {
		config.registry = config.registry || registry;
		return config;
	},
	request: function (request, config) {
		var type, headers;

		headers = request.headers || (request.headers = {});
		type = mime.parse(headers['Content-Type'] || config.mime || 'text/plain');
		headers.Accept = headers.Accept || config.accept || type.raw + ', application/json;q=0.8, text/plain;q=0.5, */*;q=0.2';

		if (!('entity' in request)) {
			return request;
		}

		headers['Content-Type'] = type.raw;

		return config.registry.lookup(type)['catch'](function () {
			// failed to resolve converter
			if (config.permissive) {
				return noopConverter;
			}
			throw 'mime-unknown';
		}).then(function (converter) {
			var client = config.client || request.originator,
				write = converter.write || missingConverter.write;

			return attempt(write.bind(void 0, request.entity, { client: client, request: request, mime: type, registry: config.registry }))
				['catch'](function() {
					throw 'mime-serialization';
				})
				.then(function(entity) {
					request.entity = entity;
					return request;
				});
		});
	},
	response: function (response, config) {
		if (!(response.headers && response.headers['Content-Type'] && response.entity)) {
			return response;
		}

		var type = mime.parse(response.headers['Content-Type']);

		return config.registry.lookup(type)['catch'](function () { return noopConverter; }).then(function (converter) {
			var client = config.client || response.request && response.request.originator,
				read = converter.read || missingConverter.read;

			return attempt(read.bind(void 0, response.entity, { client: client, response: response, mime: type, registry: config.registry }))
				['catch'](function (e) {
					response.error = 'mime-deserialization';
					response.cause = e;
					throw response;
				})
				.then(function (entity) {
					response.entity = entity;
					return response;
				});
		});
	}
});

},{"../interceptor":22,"../mime":29,"../mime/registry":30,"../util/attempt":36}],26:[function(require,module,exports){
/*
 * Copyright 2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, UrlBuilder;

interceptor = require('../interceptor');
UrlBuilder = require('../UrlBuilder');

/**
 * Applies request params to the path by token replacement
 *
 * Params not applied as a token are appended to the query string. Params
 * are removed from the request object, as they have been consumed.
 *
 * @deprecated The template interceptor `rest/interceptor/template` is a
 * much richer way to apply paramters to a template. This interceptor is
 * available as a bridge to users who previousled depended on this
 * functionality being available directly on clients.
 *
 * @param {Client} [client] client to wrap
 * @param {Object} [config.params] default param values
 *
 * @returns {Client}
 */
module.exports = interceptor({
	init: function (config) {
		config.params = config.params || {};
		return config;
	},
	request: function (request, config) {
		var path, params;

		path = request.path || '';
		params = request.params || {};

		request.path = new UrlBuilder(path, config.params).append('', params).build();
		delete request.params;

		return request;
	}
});

},{"../UrlBuilder":17,"../interceptor":22}],27:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, UrlBuilder;

interceptor = require('../interceptor');
UrlBuilder = require('../UrlBuilder');

function startsWith(str, prefix) {
	return str.indexOf(prefix) === 0;
}

function endsWith(str, suffix) {
	return str.lastIndexOf(suffix) + suffix.length === str.length;
}

/**
 * Prefixes the request path with a common value.
 *
 * @param {Client} [client] client to wrap
 * @param {number} [config.prefix] path prefix
 *
 * @returns {Client}
 */
module.exports = interceptor({
	request: function (request, config) {
		var path;

		if (config.prefix && !(new UrlBuilder(request.path).isFullyQualified())) {
			path = config.prefix;
			if (request.path) {
				if (!endsWith(path, '/') && !startsWith(request.path, '/')) {
					// add missing '/' between path sections
					path += '/';
				}
				path += request.path;
			}
			request.path = path;
		}

		return request;
	}
});

},{"../UrlBuilder":17,"../interceptor":22}],28:[function(require,module,exports){
/*
 * Copyright 2015-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, uriTemplate, mixin;

interceptor = require('../interceptor');
uriTemplate = require('../util/uriTemplate');
mixin = require('../util/mixin');

/**
 * Applies request params to the path as a URI Template
 *
 * Params are removed from the request object, as they have been consumed.
 *
 * @see https://tools.ietf.org/html/rfc6570
 *
 * @param {Client} [client] client to wrap
 * @param {Object} [config.params] default param values
 * @param {string} [config.template] default template
 *
 * @returns {Client}
 */
module.exports = interceptor({
	init: function (config) {
		config.params = config.params || {};
		config.template = config.template || '';
		return config;
	},
	request: function (request, config) {
		var template, params;

		template = request.path || config.template;
		params = mixin({}, request.params, config.params);

		request.path = uriTemplate.expand(template, params);
		delete request.params;

		return request;
	}
});

},{"../interceptor":22,"../util/mixin":40,"../util/uriTemplate":44}],29:[function(require,module,exports){
/*
* Copyright 2014-2016 the original author or authors
* @license MIT, see LICENSE.txt for details
*
* @author Scott Andrews
*/

'use strict';

/**
 * Parse a MIME type into it's constituent parts
 *
 * @param {string} mime MIME type to parse
 * @return {{
 *   {string} raw the original MIME type
 *   {string} type the type and subtype
 *   {string} [suffix] mime suffix, including the plus, if any
 *   {Object} params key/value pair of attributes
 * }}
 */
function parse(mime) {
	var params, type;

	params = mime.split(';');
	type = params[0].trim().split('+');

	return {
		raw: mime,
		type: type[0],
		suffix: type[1] ? '+' + type[1] : '',
		params: params.slice(1).reduce(function (params, pair) {
			pair = pair.split('=');
			params[pair[0].trim()] = pair[1] ? pair[1].trim() : void 0;
			return params;
		}, {})
	};
}

module.exports = {
	parse: parse
};

},{}],30:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var mime, registry;

mime = require('../mime');

function Registry(mimes) {

	/**
	 * Lookup the converter for a MIME type
	 *
	 * @param {string} type the MIME type
	 * @return a promise for the converter
	 */
	this.lookup = function lookup(type) {
		var parsed;

		parsed = typeof type === 'string' ? mime.parse(type) : type;

		if (mimes[parsed.raw]) {
			return mimes[parsed.raw];
		}
		if (mimes[parsed.type + parsed.suffix]) {
			return mimes[parsed.type + parsed.suffix];
		}
		if (mimes[parsed.type]) {
			return mimes[parsed.type];
		}
		if (mimes[parsed.suffix]) {
			return mimes[parsed.suffix];
		}

		return Promise.reject(new Error('Unable to locate converter for mime "' + parsed.raw + '"'));
	};

	/**
	 * Create a late dispatched proxy to the target converter.
	 *
	 * Common when a converter is registered under multiple names and
	 * should be kept in sync if updated.
	 *
	 * @param {string} type mime converter to dispatch to
	 * @returns converter whose read/write methods target the desired mime converter
	 */
	this.delegate = function delegate(type) {
		return {
			read: function () {
				var args = arguments;
				return this.lookup(type).then(function (converter) {
					return converter.read.apply(this, args);
				}.bind(this));
			}.bind(this),
			write: function () {
				var args = arguments;
				return this.lookup(type).then(function (converter) {
					return converter.write.apply(this, args);
				}.bind(this));
			}.bind(this)
		};
	};

	/**
	 * Register a custom converter for a MIME type
	 *
	 * @param {string} type the MIME type
	 * @param converter the converter for the MIME type
	 * @return a promise for the converter
	 */
	this.register = function register(type, converter) {
		mimes[type] = Promise.resolve(converter);
		return mimes[type];
	};

	/**
	 * Create a child registry whoes registered converters remain local, while
	 * able to lookup converters from its parent.
	 *
	 * @returns child MIME registry
	 */
	this.child = function child() {
		return new Registry(Object.create(mimes));
	};

}

registry = new Registry({});

// include provided serializers
registry.register('application/hal', require('./type/application/hal'));
registry.register('application/json', require('./type/application/json'));
registry.register('application/x-www-form-urlencoded', require('./type/application/x-www-form-urlencoded'));
registry.register('multipart/form-data', require('./type/multipart/form-data'));
registry.register('text/plain', require('./type/text/plain'));

registry.register('+json', registry.delegate('application/json'));

module.exports = registry;

},{"../mime":29,"./type/application/hal":31,"./type/application/json":32,"./type/application/x-www-form-urlencoded":33,"./type/multipart/form-data":34,"./type/text/plain":35}],31:[function(require,module,exports){
/*
 * Copyright 2013-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var pathPrefix, template, find, lazyPromise, responsePromise;

pathPrefix = require('../../../interceptor/pathPrefix');
template = require('../../../interceptor/template');
find = require('../../../util/find');
lazyPromise = require('../../../util/lazyPromise');
responsePromise = require('../../../util/responsePromise');

function defineProperty(obj, name, value) {
	Object.defineProperty(obj, name, {
		value: value,
		configurable: true,
		enumerable: false,
		writeable: true
	});
}

/**
 * Hypertext Application Language serializer
 *
 * Implemented to https://tools.ietf.org/html/draft-kelly-json-hal-06
 *
 * As the spec is still a draft, this implementation will be updated as the
 * spec evolves
 *
 * Objects are read as HAL indexing links and embedded objects on to the
 * resource. Objects are written as plain JSON.
 *
 * Embedded relationships are indexed onto the resource by the relationship
 * as a promise for the related resource.
 *
 * Links are indexed onto the resource as a lazy promise that will GET the
 * resource when a handler is first registered on the promise.
 *
 * A `requestFor` method is added to the entity to make a request for the
 * relationship.
 *
 * A `clientFor` method is added to the entity to get a full Client for a
 * relationship.
 *
 * The `_links` and `_embedded` properties on the resource are made
 * non-enumerable.
 */
module.exports = {

	read: function (str, opts) {
		var client, console;

		opts = opts || {};
		client = opts.client;
		console = opts.console || console;

		function deprecationWarning(relationship, deprecation) {
			if (deprecation && console && console.warn || console.log) {
				(console.warn || console.log).call(console, 'Relationship \'' + relationship + '\' is deprecated, see ' + deprecation);
			}
		}

		return opts.registry.lookup(opts.mime.suffix).then(function (converter) {
			return converter.read(str, opts);
		}).then(function (root) {
			find.findProperties(root, '_embedded', function (embedded, resource, name) {
				Object.keys(embedded).forEach(function (relationship) {
					if (relationship in resource) { return; }
					var related = responsePromise({
						entity: embedded[relationship]
					});
					defineProperty(resource, relationship, related);
				});
				defineProperty(resource, name, embedded);
			});
			find.findProperties(root, '_links', function (links, resource, name) {
				Object.keys(links).forEach(function (relationship) {
					var link = links[relationship];
					if (relationship in resource) { return; }
					defineProperty(resource, relationship, responsePromise.make(lazyPromise(function () {
						if (link.deprecation) { deprecationWarning(relationship, link.deprecation); }
						if (link.templated === true) {
							return template(client)({ path: link.href });
						}
						return client({ path: link.href });
					})));
				});
				defineProperty(resource, name, links);
				defineProperty(resource, 'clientFor', function (relationship, clientOverride) {
					var link = links[relationship];
					if (!link) {
						throw new Error('Unknown relationship: ' + relationship);
					}
					if (link.deprecation) { deprecationWarning(relationship, link.deprecation); }
					if (link.templated === true) {
						return template(
							clientOverride || client,
							{ template: link.href }
						);
					}
					return pathPrefix(
						clientOverride || client,
						{ prefix: link.href }
					);
				});
				defineProperty(resource, 'requestFor', function (relationship, request, clientOverride) {
					var client = this.clientFor(relationship, clientOverride);
					return client(request);
				});
			});

			return root;
		});

	},

	write: function (obj, opts) {
		return opts.registry.lookup(opts.mime.suffix).then(function (converter) {
			return converter.write(obj, opts);
		});
	}

};

},{"../../../interceptor/pathPrefix":27,"../../../interceptor/template":28,"../../../util/find":38,"../../../util/lazyPromise":39,"../../../util/responsePromise":42}],32:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Create a new JSON converter with custom reviver/replacer.
 *
 * The extended converter must be published to a MIME registry in order
 * to be used. The existing converter will not be modified.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
 *
 * @param {function} [reviver=undefined] custom JSON.parse reviver
 * @param {function|Array} [replacer=undefined] custom JSON.stringify replacer
 */
function createConverter(reviver, replacer) {
	return {

		read: function (str) {
			return JSON.parse(str, reviver);
		},

		write: function (obj) {
			return JSON.stringify(obj, replacer);
		},

		extend: createConverter

	};
}

module.exports = createConverter();

},{}],33:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var encodedSpaceRE, urlEncodedSpaceRE;

encodedSpaceRE = /%20/g;
urlEncodedSpaceRE = /\+/g;

function urlEncode(str) {
	str = encodeURIComponent(str);
	// spec says space should be encoded as '+'
	return str.replace(encodedSpaceRE, '+');
}

function urlDecode(str) {
	// spec says space should be encoded as '+'
	str = str.replace(urlEncodedSpaceRE, ' ');
	return decodeURIComponent(str);
}

function append(str, name, value) {
	if (Array.isArray(value)) {
		value.forEach(function (value) {
			str = append(str, name, value);
		});
	}
	else {
		if (str.length > 0) {
			str += '&';
		}
		str += urlEncode(name);
		if (value !== undefined && value !== null) {
			str += '=' + urlEncode(value);
		}
	}
	return str;
}

module.exports = {

	read: function (str) {
		var obj = {};
		str.split('&').forEach(function (entry) {
			var pair, name, value;
			pair = entry.split('=');
			name = urlDecode(pair[0]);
			if (pair.length === 2) {
				value = urlDecode(pair[1]);
			}
			else {
				value = null;
			}
			if (name in obj) {
				if (!Array.isArray(obj[name])) {
					// convert to an array, perserving currnent value
					obj[name] = [obj[name]];
				}
				obj[name].push(value);
			}
			else {
				obj[name] = value;
			}
		});
		return obj;
	},

	write: function (obj) {
		var str = '';
		Object.keys(obj).forEach(function (name) {
			str = append(str, name, obj[name]);
		});
		return str;
	}

};

},{}],34:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Michael Jackson
 */

/* global FormData, File, Blob */

'use strict';

function isFormElement(object) {
	return object &&
		object.nodeType === 1 && // Node.ELEMENT_NODE
		object.tagName === 'FORM';
}

function createFormDataFromObject(object) {
	var formData = new FormData();

	var value;
	for (var property in object) {
		if (object.hasOwnProperty(property)) {
			value = object[property];

			if (value instanceof File) {
				formData.append(property, value, value.name);
			} else if (value instanceof Blob) {
				formData.append(property, value);
			} else {
				formData.append(property, String(value));
			}
		}
	}

	return formData;
}

module.exports = {

	write: function (object) {
		if (typeof FormData === 'undefined') {
			throw new Error('The multipart/form-data mime serializer requires FormData support');
		}

		// Support FormData directly.
		if (object instanceof FormData) {
			return object;
		}

		// Support <form> elements.
		if (isFormElement(object)) {
			return new FormData(object);
		}

		// Support plain objects, may contain File/Blob as value.
		if (typeof object === 'object' && object !== null) {
			return createFormDataFromObject(object);
		}

		throw new Error('Unable to create FormData from object ' + object);
	}

};

},{}],35:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

module.exports = {

	read: function (str) {
		return str;
	},

	write: function (obj) {
		return obj.toString();
	}

};

},{}],36:[function(require,module,exports){
/*
 * Copyright 2015-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Attempt to invoke a function capturing the resulting value as a Promise
 *
 * If the method throws, the caught value used to reject the Promise.
 *
 * @param {function} work function to invoke
 * @returns {Promise} Promise for the output of the work function
 */
function attempt(work) {
	try {
		return Promise.resolve(work());
	}
	catch (e) {
		return Promise.reject(e);
	}
}

module.exports = attempt;

},{}],37:[function(require,module,exports){
/*
 * Copyright (c) 2009 Nicholas C. Zakas. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*
 * Base 64 implementation in JavaScript
 * Original source available at https://raw.github.com/nzakas/computer-science-in-javascript/02a2745b4aa8214f2cae1bf0b15b447ca1a91b23/encodings/base64/base64.js
 *
 * Linter refinement by Scott Andrews
 */

'use strict';

/*jshint bitwise: false */

var digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Base64-encodes a string of text.
 *
 * @param {string} text The text to encode.
 * @return {string} The base64-encoded string.
 */
function base64Encode(text) {

	if (/([^\u0000-\u00ff])/.test(text)) {
		throw new Error('Can\'t base64 encode non-ASCII characters.');
	}

	var i = 0,
		cur, prev, byteNum,
		result = [];

	while (i < text.length) {

		cur = text.charCodeAt(i);
		byteNum = i % 3;

		switch (byteNum) {
		case 0: //first byte
			result.push(digits.charAt(cur >> 2));
			break;

		case 1: //second byte
			result.push(digits.charAt((prev & 3) << 4 | (cur >> 4)));
			break;

		case 2: //third byte
			result.push(digits.charAt((prev & 0x0f) << 2 | (cur >> 6)));
			result.push(digits.charAt(cur & 0x3f));
			break;
		}

		prev = cur;
		i += 1;
	}

	if (byteNum === 0) {
		result.push(digits.charAt((prev & 3) << 4));
		result.push('==');
	} else if (byteNum === 1) {
		result.push(digits.charAt((prev & 0x0f) << 2));
		result.push('=');
	}

	return result.join('');
}

/**
 * Base64-decodes a string of text.
 *
 * @param {string} text The text to decode.
 * @return {string} The base64-decoded string.
 */
function base64Decode(text) {

	//ignore white space
	text = text.replace(/\s/g, '');

	//first check for any unexpected input
	if (!(/^[a-z0-9\+\/\s]+\={0,2}$/i.test(text)) || text.length % 4 > 0) {
		throw new Error('Not a base64-encoded string.');
	}

	//local variables
	var cur, prev, digitNum,
		i = 0,
		result = [];

	//remove any equals signs
	text = text.replace(/\=/g, '');

	//loop over each character
	while (i < text.length) {

		cur = digits.indexOf(text.charAt(i));
		digitNum = i % 4;

		switch (digitNum) {

		//case 0: first digit - do nothing, not enough info to work with

		case 1: //second digit
			result.push(String.fromCharCode(prev << 2 | cur >> 4));
			break;

		case 2: //third digit
			result.push(String.fromCharCode((prev & 0x0f) << 4 | cur >> 2));
			break;

		case 3: //fourth digit
			result.push(String.fromCharCode((prev & 3) << 6 | cur));
			break;
		}

		prev = cur;
		i += 1;
	}

	//return a string
	return result.join('');

}

module.exports = {
	encode: base64Encode,
	decode: base64Decode
};

},{}],38:[function(require,module,exports){
/*
 * Copyright 2013-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

module.exports = {

	/**
	 * Find objects within a graph the contain a property of a certain name.
	 *
	 * NOTE: this method will not discover object graph cycles.
	 *
	 * @param {*} obj object to search on
	 * @param {string} prop name of the property to search for
	 * @param {Function} callback function to receive the found properties and their parent
	 */
	findProperties: function findProperties(obj, prop, callback) {
		if (typeof obj !== 'object' || obj === null) { return; }
		if (prop in obj) {
			callback(obj[prop], obj, prop);
		}
		Object.keys(obj).forEach(function (key) {
			findProperties(obj[key], prop, callback);
		});
	}

};

},{}],39:[function(require,module,exports){
/*
 * Copyright 2013-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var attempt = require('./attempt');

/**
 * Create a promise whose work is started only when a handler is registered.
 *
 * The work function will be invoked at most once. Thrown values will result
 * in promise rejection.
 *
 * @param {Function} work function whose ouput is used to resolve the
 *   returned promise.
 * @returns {Promise} a lazy promise
 */
function lazyPromise(work) {
	var started, resolver, promise, then;

	started = false;

	promise = new Promise(function (resolve, reject) {
		resolver = {
			resolve: resolve,
			reject: reject
		};
	});
	then = promise.then;

	promise.then = function () {
		if (!started) {
			started = true;
			attempt(work).then(resolver.resolve, resolver.reject);
		}
		return then.apply(promise, arguments);
	};

	return promise;
}

module.exports = lazyPromise;

},{"./attempt":36}],40:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var empty = {};

/**
 * Mix the properties from the source object into the destination object.
 * When the same property occurs in more then one object, the right most
 * value wins.
 *
 * @param {Object} dest the object to copy properties to
 * @param {Object} sources the objects to copy properties from.  May be 1 to N arguments, but not an Array.
 * @return {Object} the destination object
 */
function mixin(dest /*, sources... */) {
	var i, l, source, name;

	if (!dest) { dest = {}; }
	for (i = 1, l = arguments.length; i < l; i += 1) {
		source = arguments[i];
		for (name in source) {
			if (!(name in dest) || (dest[name] !== source[name] && (!(name in empty) || empty[name] !== source[name]))) {
				dest[name] = source[name];
			}
		}
	}

	return dest; // Object
}

module.exports = mixin;

},{}],41:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Normalize HTTP header names using the pseudo camel case.
 *
 * For example:
 *   content-type         -> Content-Type
 *   accepts              -> Accepts
 *   x-custom-header-name -> X-Custom-Header-Name
 *
 * @param {string} name the raw header name
 * @return {string} the normalized header name
 */
function normalizeHeaderName(name) {
	return name.toLowerCase()
		.split('-')
		.map(function (chunk) { return chunk.charAt(0).toUpperCase() + chunk.slice(1); })
		.join('-');
}

module.exports = normalizeHeaderName;

},{}],42:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/*jshint latedef: nofunc */

var normalizeHeaderName = require('./normalizeHeaderName');

function property(promise, name) {
	return promise.then(
		function (value) {
			return value && value[name];
		},
		function (value) {
			return Promise.reject(value && value[name]);
		}
	);
}

/**
 * Obtain the response entity
 *
 * @returns {Promise} for the response entity
 */
function entity() {
	/*jshint validthis:true */
	return property(this, 'entity');
}

/**
 * Obtain the response status
 *
 * @returns {Promise} for the response status
 */
function status() {
	/*jshint validthis:true */
	return property(property(this, 'status'), 'code');
}

/**
 * Obtain the response headers map
 *
 * @returns {Promise} for the response headers map
 */
function headers() {
	/*jshint validthis:true */
	return property(this, 'headers');
}

/**
 * Obtain a specific response header
 *
 * @param {String} headerName the header to retrieve
 * @returns {Promise} for the response header's value
 */
function header(headerName) {
	/*jshint validthis:true */
	headerName = normalizeHeaderName(headerName);
	return property(this.headers(), headerName);
}

/**
 * Follow a related resource
 *
 * The relationship to follow may be define as a plain string, an object
 * with the rel and params, or an array containing one or more entries
 * with the previous forms.
 *
 * Examples:
 *   response.follow('next')
 *
 *   response.follow({ rel: 'next', params: { pageSize: 100 } })
 *
 *   response.follow([
 *       { rel: 'items', params: { projection: 'noImages' } },
 *       'search',
 *       { rel: 'findByGalleryIsNull', params: { projection: 'noImages' } },
 *       'items'
 *   ])
 *
 * @param {String|Object|Array} rels one, or more, relationships to follow
 * @returns ResponsePromise<Response> related resource
 */
function follow(rels) {
	/*jshint validthis:true */
	rels = [].concat(rels);

	return make(rels.reduce(function (response, rel) {
		return response.then(function (response) {
			if (typeof rel === 'string') {
				rel = { rel: rel };
			}
			if (typeof response.entity.clientFor !== 'function') {
				throw new Error('Hypermedia response expected');
			}
			var client = response.entity.clientFor(rel.rel);
			return client({ params: rel.params });
		});
	}, this));
}

/**
 * Wrap a Promise as an ResponsePromise
 *
 * @param {Promise<Response>} promise the promise for an HTTP Response
 * @returns {ResponsePromise<Response>} wrapped promise for Response with additional helper methods
 */
function make(promise) {
	promise.status = status;
	promise.headers = headers;
	promise.header = header;
	promise.entity = entity;
	promise.follow = follow;
	return promise;
}

function responsePromise(obj, callback, errback) {
	return make(Promise.resolve(obj).then(callback, errback));
}

responsePromise.make = make;
responsePromise.reject = function (val) {
	return make(Promise.reject(val));
};
responsePromise.promise = function (func) {
	return make(new Promise(func));
};

module.exports = responsePromise;

},{"./normalizeHeaderName":41}],43:[function(require,module,exports){
/*
 * Copyright 2015-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var charMap;

charMap = (function () {
	var strings = {
		alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
		digit: '0123456789'
	};

	strings.genDelims = ':/?#[]@';
	strings.subDelims = '!$&\'()*+,;=';
	strings.reserved = strings.genDelims + strings.subDelims;
	strings.unreserved = strings.alpha + strings.digit + '-._~';
	strings.url = strings.reserved + strings.unreserved;
	strings.scheme = strings.alpha + strings.digit + '+-.';
	strings.userinfo = strings.unreserved + strings.subDelims + ':';
	strings.host = strings.unreserved + strings.subDelims;
	strings.port = strings.digit;
	strings.pchar = strings.unreserved + strings.subDelims + ':@';
	strings.segment = strings.pchar;
	strings.path = strings.segment + '/';
	strings.query = strings.pchar + '/?';
	strings.fragment = strings.pchar + '/?';

	return Object.keys(strings).reduce(function (charMap, set) {
		charMap[set] = strings[set].split('').reduce(function (chars, myChar) {
			chars[myChar] = true;
			return chars;
		}, {});
		return charMap;
	}, {});
}());

function encode(str, allowed) {
	if (typeof str !== 'string') {
		throw new Error('String required for URL encoding');
	}
	return str.split('').map(function (myChar) {
		if (allowed.hasOwnProperty(myChar)) {
			return myChar;
		}
		var code = myChar.charCodeAt(0);
		if (code <= 127) {
			var encoded = code.toString(16).toUpperCase();
 			return '%' + (encoded.length % 2 === 1 ? '0' : '') + encoded;
		}
		else {
			return encodeURIComponent(myChar).toUpperCase();
		}
	}).join('');
}

function makeEncoder(allowed) {
	allowed = allowed || charMap.unreserved;
	return function (str) {
		return encode(str, allowed);
	};
}

function decode(str) {
	return decodeURIComponent(str);
}

module.exports = {

	/*
	 * Decode URL encoded strings
	 *
	 * @param {string} URL encoded string
	 * @returns {string} URL decoded string
	 */
	decode: decode,

	/*
	 * URL encode a string
	 *
	 * All but alpha-numerics and a very limited set of punctuation - . _ ~ are
	 * encoded.
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encode: makeEncoder(),

	/*
	* URL encode a URL
	*
	* All character permitted anywhere in a URL are left unencoded even
	* if that character is not permitted in that portion of a URL.
	*
	* Note: This method is typically not what you want.
	*
	* @param {string} string to encode
	* @returns {string} URL encoded string
	*/
	encodeURL: makeEncoder(charMap.url),

	/*
	 * URL encode the scheme portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeScheme: makeEncoder(charMap.scheme),

	/*
	 * URL encode the user info portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeUserInfo: makeEncoder(charMap.userinfo),

	/*
	 * URL encode the host portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeHost: makeEncoder(charMap.host),

	/*
	 * URL encode the port portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodePort: makeEncoder(charMap.port),

	/*
	 * URL encode a path segment portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodePathSegment: makeEncoder(charMap.segment),

	/*
	 * URL encode the path portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodePath: makeEncoder(charMap.path),

	/*
	 * URL encode the query portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeQuery: makeEncoder(charMap.query),

	/*
	 * URL encode the fragment portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeFragment: makeEncoder(charMap.fragment)

};

},{}],44:[function(require,module,exports){
/*
 * Copyright 2015-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var uriEncoder, operations, prefixRE;

uriEncoder = require('./uriEncoder');

prefixRE = /^([^:]*):([0-9]+)$/;
operations = {
	'':  { first: '',  separator: ',', named: false, empty: '',  encoder: uriEncoder.encode },
	'+': { first: '',  separator: ',', named: false, empty: '',  encoder: uriEncoder.encodeURL },
	'#': { first: '#', separator: ',', named: false, empty: '',  encoder: uriEncoder.encodeURL },
	'.': { first: '.', separator: '.', named: false, empty: '',  encoder: uriEncoder.encode },
	'/': { first: '/', separator: '/', named: false, empty: '',  encoder: uriEncoder.encode },
	';': { first: ';', separator: ';', named: true,  empty: '',  encoder: uriEncoder.encode },
	'?': { first: '?', separator: '&', named: true,  empty: '=', encoder: uriEncoder.encode },
	'&': { first: '&', separator: '&', named: true,  empty: '=', encoder: uriEncoder.encode },
	'=': { reserved: true },
	',': { reserved: true },
	'!': { reserved: true },
	'@': { reserved: true },
	'|': { reserved: true }
};

function apply(operation, expression, params) {
	/*jshint maxcomplexity:11 */
	return expression.split(',').reduce(function (result, variable) {
		var opts, value;

		opts = {};
		if (variable.slice(-1) === '*') {
			variable = variable.slice(0, -1);
			opts.explode = true;
		}
		if (prefixRE.test(variable)) {
			var prefix = prefixRE.exec(variable);
			variable = prefix[1];
			opts.maxLength = parseInt(prefix[2]);
		}

		variable = uriEncoder.decode(variable);
		value = params[variable];

		if (value === void 0 || value === null) {
			return result;
		}
		if (Array.isArray(value)) {
			result = value.reduce(function (result, value) {
				if (result.length) {
					result += opts.explode ? operation.separator : ',';
					if (operation.named && opts.explode) {
						result += operation.encoder(variable);
						result += value.length ? '=' : operation.empty;
					}
				}
				else {
					result += operation.first;
					if (operation.named) {
						result += operation.encoder(variable);
						result += value.length ? '=' : operation.empty;
					}
				}
				result += operation.encoder(value);
				return result;
			}, result);
		}
		else if (typeof value === 'object') {
			result = Object.keys(value).reduce(function (result, name) {
				if (result.length) {
					result += opts.explode ? operation.separator : ',';
				}
				else {
					result += operation.first;
					if (operation.named && !opts.explode) {
						result += operation.encoder(variable);
						result += value[name].length ? '=' : operation.empty;
					}
				}
				result += operation.encoder(name);
				result += opts.explode ? '=' : ',';
				result += operation.encoder(value[name]);
				return result;
			}, result);
		}
		else {
			value = String(value);
			if (opts.maxLength) {
				value = value.slice(0, opts.maxLength);
			}
			result += result.length ? operation.separator : operation.first;
			if (operation.named) {
				result += operation.encoder(variable);
				result += value.length ? '=' : operation.empty;
			}
			result += operation.encoder(value);
		}

		return result;
	}, '');
}

function expandExpression(expression, params) {
	var operation;

	operation = operations[expression.slice(0,1)];
	if (operation) {
		expression = expression.slice(1);
	}
	else {
		operation = operations[''];
	}

	if (operation.reserved) {
		throw new Error('Reserved expression operations are not supported');
	}

	return apply(operation, expression, params);
}

function expandTemplate(template, params) {
	var start, end, uri;

	uri = '';
	end = 0;
	while (true) {
		start = template.indexOf('{', end);
		if (start === -1) {
			// no more expressions
			uri += template.slice(end);
			break;
		}
		uri += template.slice(end, start);
		end = template.indexOf('}', start) + 1;
		uri += expandExpression(template.slice(start + 1, end - 1), params);
	}

	return uri;
}

module.exports = {

	/**
	 * Expand a URI Template with parameters to form a URI.
	 *
	 * Full implementation (level 4) of rfc6570.
	 * @see https://tools.ietf.org/html/rfc6570
	 *
	 * @param {string} template URI template
	 * @param {Object} [params] params to apply to the template durring expantion
	 * @returns {string} expanded URI
	 */
	expand: expandTemplate

};

},{"./uriEncoder":43}],45:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXJlY3Rpb25zLmpzIiwibWFpbi5qcyIsInByb2Nlc3NfZ3B4LmpzIiwic2F2ZV9kaXJlY3Rpb25zLmpzIiwidHJhY2tfY29vcmRpbmF0ZXMuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvbWFwYm94L2xpYi9jYWxsYmFja2lmeS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL2NsaWVudC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL2NvbnN0YW50cy5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL2Zvcm1hdF9wb2ludHMuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvbWFwYm94L2xpYi9nZXRfdXNlci5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL2ludmFyaWFudF9sb2NhdGlvbi5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL21ha2Vfc2VydmljZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL3NlcnZpY2VzL2RpcmVjdGlvbnMuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvbWFwYm94L2xpYi9zdGFuZGFyZF9yZXNwb25zZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvdmVuZG9yL2ludmFyaWFudC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvdmVuZG9yL3Byb21pc2UuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9VcmxCdWlsZGVyLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L2NsaWVudC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L2NsaWVudC9kZWZhdWx0LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvY2xpZW50L3hoci5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L2ludGVyY2VwdG9yLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvaW50ZXJjZXB0b3IvZGVmYXVsdFJlcXVlc3QuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9pbnRlcmNlcHRvci9lcnJvckNvZGUuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9pbnRlcmNlcHRvci9taW1lLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvaW50ZXJjZXB0b3IvcGFyYW1zLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvaW50ZXJjZXB0b3IvcGF0aFByZWZpeC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L2ludGVyY2VwdG9yL3RlbXBsYXRlLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvbWltZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L21pbWUvcmVnaXN0cnkuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9taW1lL3R5cGUvYXBwbGljYXRpb24vaGFsLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvbWltZS90eXBlL2FwcGxpY2F0aW9uL2pzb24uanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9taW1lL3R5cGUvYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvbWltZS90eXBlL211bHRpcGFydC9mb3JtLWRhdGEuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9taW1lL3R5cGUvdGV4dC9wbGFpbi5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvYXR0ZW1wdC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvYmFzZTY0LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvdXRpbC9maW5kLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvdXRpbC9sYXp5UHJvbWlzZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvbWl4aW4uanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC91dGlsL25vcm1hbGl6ZUhlYWRlck5hbWUuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC91dGlsL3Jlc3BvbnNlUHJvbWlzZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvdXJpRW5jb2Rlci5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvdXJpVGVtcGxhdGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JEQTtBQUNBO0FBQ0E7Ozs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsY2FsbGJhY2spIHtcblxuXHR2YXIgTWFwYm94Q2xpZW50ID0gcmVxdWlyZSgnbWFwYm94L2xpYi9zZXJ2aWNlcy9kaXJlY3Rpb25zJyk7IFxuXHR2YXIgY2xpZW50ID0gbmV3IE1hcGJveENsaWVudCgncGsuZXlKMUlqb2laVzFwYkdsbFpHRnVibVZ1WW1WeVp5SXNJbUVpT2lKamFYaG1PVEI2Wm5vd01EQXdNblZ6YURWa2NucHNZMk0xSW4wLjMzeUR3VXE2NzBqSEQ4ZmxLanpxeGcnKTtcblxuXHR2YXIgYXJyYXlfbGF0X2xvbmcgPSBbXTsgXG5cdGZvcih2YXIgaT0wOyBpPGNvb3JkaW5hdGVzLmxlbmd0aDsgaSsrKSB7XG5cblx0XHR2YXIgbGF0PSBOdW1iZXIoY29vcmRpbmF0ZXNbaV1bMF0pOyBcblx0XHR2YXIgbG9uZz0gTnVtYmVyKGNvb3JkaW5hdGVzW2ldWzFdKTsgXG5cblx0XHRhcnJheV9sYXRfbG9uZy5wdXNoKHsgbGF0aXR1ZGU6IGxhdCwgbG9uZ2l0dWRlOiBsb25nfSk7IFxuXG5cdH1cblx0XG5cdGNsaWVudC5nZXREaXJlY3Rpb25zKGFycmF5X2xhdF9sb25nLCB7XG5cdFx0ICBwcm9maWxlOiAnbWFwYm94LndhbGtpbmcnLFxuXHRcdCAgYWx0ZXJuYXRpdmVzOiBmYWxzZSxcblx0XHR9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcblx0XHQgICBcdFx0aWYoZXJyPT09bnVsbCkge1xuXHRcdFx0ICAgXHRcdGlmKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHQgICBcdFx0XHRjYWxsYmFjayhyZXN1bHRzKTsgXG5cdFx0XHQgICBcdFx0fVxuXHRcdFx0ICAgXHR9XG5cdFx0fSk7XG59IiwiLy8gV2FpdCBmb3IgZGV2aWNlIEFQSSBsaWJyYXJpZXMgdG8gbG9hZFxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImRldmljZXJlYWR5XCIsIG9uRGV2aWNlUmVhZHksIGZhbHNlKTtcblxuZnVuY3Rpb24gb25EZXZpY2VSZWFkeSgpIHsgXG5cdFxuXHR2YXIgcHJvY2Vzc0dQWCA9IHJlcXVpcmUoJy4vcHJvY2Vzc19ncHguanMnKTsgXG5cblx0dmFyIGdweEZpbGUgPSAncm91dGUuZ3B4JzsgXG5cblx0cHJvY2Vzc0dQWChncHhGaWxlLCBmdW5jdGlvbiAoY29vcmRpbmF0ZXMpIHtcblx0XHRcblx0XHR2YXIgZ2V0RGlyZWN0aW9ucyA9IHJlcXVpcmUoJy4vZGlyZWN0aW9ucy5qcycpOyBcblx0XHRcblx0XHRnZXREaXJlY3Rpb25zKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGRpcmVjdGlvbnMpIHtcblxuXHRcdFx0Ly8gZGV0ZWN0IHdoZW4gcGVyc29uIGlzIGF0IHN0YXJ0IFxuXHRcdFx0dmFyIHNhdmVEaXJlY3Rpb25JbmZvID0gcmVxdWlyZSgnLi9zYXZlX2RpcmVjdGlvbnMuanMnKVxuXHRcdFx0c3RlcHNEYXRhID0gc2F2ZURpcmVjdGlvbkluZm8oZGlyZWN0aW9ucyxncHhGaWxlKTsgXG5cdFx0XHRcblx0XHRcdHZhciBsaXN0ZW5Gb3JDb29yZGluYXRlcyA9IHJlcXVpcmUoJy4vdHJhY2tfY29vcmRpbmF0ZXMuanMnKTsgLy9jb29yZGluYXRlcyBhcmUgaW4gW2xvbmdpdHVkZSwgbGF0aXR1ZGVdIGZvciBnb29nbGUgbWFwcyBsYXQgbG9uZyBnb2VzIHRoZSBvdGhlciB3YXkhXG5cdFx0XHRsaXN0ZW5Gb3JDb29yZGluYXRlcyhzdGVwc0RhdGEpOyBcblxuXHRcdH0pOyBcblx0XHQvLyB2YXIgdHVybl9ieV90dXJuID0gZ2V0RGlyZWN0aW9ucyhjb29yZGluYXRlcyk7XG5cdH0pOyBcbn1cblxuXG4iLCIvL2dldCBncHggZmlsZSBjb250ZW50cyBcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGdweF9maWxlLCBjYWxsYmFjaykge1xuXG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIFxuICAgIHhoci5vcGVuKCdHRVQnLCAnLi9ncHgvJytncHhfZmlsZSwgdHJ1ZSk7XG4gICAgeGhyLnNlbmQobnVsbCk7ICBcblxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09IFhNTEh0dHBSZXF1ZXN0LkRPTkUpIHsgXG5cbiAgICAgICAgICAgIHZhciBjb29yZGluYXRlcyA9IGdldENvb3JkaW5hdGVzKHhoci5yZXNwb25zZVRleHQpO1xuXG4gICAgICAgICAgICBpZih0eXBlb2YgY2FsbGJhY2s9PSdmdW5jdGlvbicpIHsgICBcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhjb29yZGluYXRlcyk7IFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTsgXG5cbi8vcmVhZCByZXR1cm5lZCBjb250ZW50cyBvZiBmaWxlIGludG8gYW4gYXJyYXkgb2YgY29vcmRpbmF0ZXNcbmZ1bmN0aW9uIGdldENvb3JkaW5hdGVzKHhtbF9maWxlKSB7XG5cbiAgICB2YXIgY29vcmRpbmF0ZXNfYXJyYXkgPSBbXTsgIFxuICAgIC8vcGFyc2UgZ3B4IHN0cmluZyBpbnRvIHhtbCBzbyBjYW4gaXRlcmF0ZSBvdmVyXG4gICAgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpOyBcbiAgICB4bWwgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHhtbF9maWxlLCd0ZXh0L3htbCcpOyBcbiAgICAvL2dldCBhbGwgcmVwdCB0YWdzIHRvIGdldCBsYXQvIGxvbmcgb3V0IG9mIHRoZW0gXG4gICAgdmFyIHJ0ZXB0ID0geG1sLnF1ZXJ5U2VsZWN0b3JBbGwoJ3J0ZXB0Jyk7IFxuXG4gICAgZm9yKHZhciBpPTA7IGk8cnRlcHQubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICB2YXIgbGF0ID0gcnRlcHRbaV0uZ2V0QXR0cmlidXRlKCdsYXQnKTsgXG4gICAgICAgIHZhciBsb25nID0gcnRlcHRbaV0uZ2V0QXR0cmlidXRlKCdsb24nKTsgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgIGNvb3JkaW5hdGVzX2FycmF5LnB1c2goW2xhdCwgbG9uZ10pO1xuICAgIH0gXG4gICAgXG4gICAgcmV0dXJuIGNvb3JkaW5hdGVzX2FycmF5OyBcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRpcmVjdGlvbk9iamVjdCwgZmlsZU5hbWUpIHtcblxuXHR2YXIgcm91dGUgPSBkaXJlY3Rpb25PYmplY3RbJ3JvdXRlcyddWzBdOyBcblx0dmFyIHN0ZXBzID0gcm91dGVbJ3N0ZXBzJ107XG5cblx0dmFyIHN0ZXBzUmVsZXZhbnREYXRhID0gW107IFxuXHRmb3IgKHZhciBpPSAwOyBpPCBzdGVwcy5sZW5ndGg7IGkrKykge1xuXG5cdFx0dmFyIGN1cnJlbnRTdGVwPXN0ZXBzW2ldOyBcblxuXHRcdHZhciBkaXJlY3Rpb249Y3VycmVudFN0ZXBbJ2RpcmVjdGlvbiddOyBcblx0XHR2YXIgZGlzdGFuY2U9Y3VycmVudFN0ZXBbJ2Rpc3RhbmNlJ107IFxuXHRcdHZhciBpbnN0cnVjdGlvbj1jdXJyZW50U3RlcFsnbWFuZXV2ZXInXVsnaW5zdHJ1Y3Rpb24nXTsgXG5cdFx0dmFyIHR5cGU9Y3VycmVudFN0ZXBbJ21hbmV1dmVyJ11bJ3R5cGUnXTsgXG5cdFx0dmFyIGNvb3JkaW5hdGVzPWN1cnJlbnRTdGVwWydtYW5ldXZlciddWydsb2NhdGlvbiddWydjb29yZGluYXRlcyddOyAvL2Nvb3JkaW5hdGVzIGFyZSBpbiBbbG9uZ2l0dWRlLCBsYXRpdHVkZV0gZm9yIGdvb2dsZSBtYXBzIGxhdCBsb25nIGdvZXMgdGhlIG90aGVyIHdheSFcblxuXHRcdHN0ZXBzUmVsZXZhbnREYXRhLnB1c2goe2Nvb3JkaW5hdGVzOmNvb3JkaW5hdGVzLCBkaXN0YW5jZTpkaXN0YW5jZSwgZGlyZWN0aW9uOmRpcmVjdGlvbiwgdHlwZTp0eXBlLCBpbnN0cnVjdGlvbjogaW5zdHJ1Y3Rpb259KVxuXHRcdGNvbnNvbGUubG9nKGNvb3JkaW5hdGVzKTsgXG5cdFx0Ly90ZXN0aW5nIHB1cnBvc2VzXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2tleS1jb29yZGluYXRlcycpLmlubmVySFRNTCs9XCJMYXRpdHVkZTogXCIrY29vcmRpbmF0ZXNbMV0rXCIsIExvbmdpdHVkZSBcIitjb29yZGluYXRlc1swXSsgXCI8L2JyPlwiOyAgXG5cdH1cblx0cmV0dXJuIHN0ZXBzUmVsZXZhbnREYXRhOyBcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzRGF0YSkge1xuICB2YXIgdGltZSA9IDA7IFxuXHQvL3N0YXJ0IHRyYWNraW5nXG5cdHZhciB3YXRjaF9pZD0gbmF2aWdhdG9yLmdlb2xvY2F0aW9uLndhdGNoUG9zaXRpb24oXG5cbiAgICAgICAgLy9zdWNjZXNzXG4gICAgICAgIGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAvL2NoZWNrIGFnYWluc3Qgcm91dGUgZGlyZWN0aW9uc1xuICAgICAgICAgICAgdmFyIGxhdCA9IHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZTsgXG4gICAgICAgICAgICB2YXIgbG9uZyA9IHBvc2l0aW9uLmNvb3Jkcy5sb25naXR1ZGU7IFxuICAgICAgICAgICBcdC8vbG9nIGNvb3JkaW5hdGVzLiBub3QgbW9yZSBmcmVxdWVudGx5IHRoYW4gMzAgc2Vjb25kc1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRUaW1lPSBEYXRlLm5vdygpOyBcbiAgICAgICAgICAgIGlmKHRpbWU9PT0wKSB7XG4gICAgICAgICAgICAgICAgdGltZSA9IGN1cnJlbnRUaW1lOyBcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9nLWNvb3JkaW5hdGVzJykuaW5uZXJIVE1MICs9IFwiPHAgY2xhc3M9J2xvZyc+Q3VycmVudCBsYXRpdHVkZSBpcyBcIitsYXQrXCIgYW5kIGN1cnJlbnQgbG9uZ2l0dWRlIGlzIFwiK2xvbmcrXCI8L3A+XCI7IFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZihjdXJyZW50VGltZS10aW1lID4gMzAwMDApIHsgLy8zMCBzZWNvbmRzXG4gICAgICAgICAgICAgICAgICAgIHRpbWU9Y3VycmVudFRpbWU7IFxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9nLWNvb3JkaW5hdGVzJykuaW5uZXJIVE1MICs9IFwiPHAgY2xhc3M9J2xvZyc+Q3VycmVudCBsYXRpdHVkZSBpcyBcIitsYXQrXCIgYW5kIGN1cnJlbnQgbG9uZ2l0dWRlIGlzIFwiK2xvbmcrXCI8L3A+XCI7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgXHQvLyBjb25zb2xlLmxvZyhjb29yZGluYXRlc0RhdGEpOyBcbiAgICAgICAgICAgIC8vcm91bmQgbnVtYmVycyB0byA1IGRlY2ltYWxzIFxuICAgICAgICAgICAgbGF0ID0gbGF0LnRvRml4ZWQoNCk7IFxuICAgICAgICAgICAgbG9uZyA9IGxvbmcudG9GaXhlZCg0KTsgXG4gICAgICAgICAgICAvL2xvZyBpbnN0cnVjdGlvbnNcbiAgICAgICAgICAgIHZhciBpbnN0cnVjdGlvbkRhdGEgPSBuZWFySW5zdHJ1Y3Rpb25Db29yZGluYXRlKGxhdCxsb25nLCBjb29yZGluYXRlc0RhdGEpOyBcbiAgICAgICAgICAgIGlmKGluc3RydWN0aW9uRGF0YSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9nLWluc3RydWN0aW9ucycpLmlubmVySFRNTCArPSBcIjxkaXYgY2xhc3M9J2luc3RydWN0aW9uJz5cIitpbnN0cnVjdGlvbkRhdGEuaW5zdHJ1Y3Rpb24rXCI8L2Rpdj5cIjsgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgIC8vIHZhciB3YXlwb2ludCA9IGlzQ2xvc2UobGF0LGxvbmcpOyAvL3JldHVybnMgZmFsc2UgaWYgbm90IGNsb3NlIHRvIGFueXdoZXJlLCBvciB3YXlwb2ludCBudW1iZXIgaXRzIGNsb3Nlc3QgdG8gaWYgY2xvc2UgdG8gYSB3YXlwb2ludC5cbiAgICAgICAgICAgLy8gaWYod2F5cG9pbnQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgIC8vICAvL3BsYXkgY29ycmVzcG9uZGluZyBhdWRpbyBcbiAgICAgICAgICAgLy8gICAgICBhdWRpb19lbGVtID0gJ3dheXBvaW50Xycrd2F5cG9pbnQ7IFxuICAgICAgICAgICAvLyAgICAgIHBsYXlBdWRpbyhhdWRpb19lbGVtKTsgIFxuICAgICAgICAgICAvLyB9IFxuICAgICAgICAgICAvLyAgLy8gaWYod2F5cG9pbnQpIHtcbiAgICAgICAgICAgLy8gIHJvdXRlX2RhdGEucHVzaChwb3NpdGlvbik7IFxuICAgICAgICB9LFxuICAgICAgICAvL2Vycm9yXG4gICAgICAgIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvdWxkbnQgZ2V0IGNvb3JkaW5hdGVzISEhJyk7IFxuICAgICAgICB9LFxuICAgICAgICAvL3NldHRpbmdzXG4gICAgICAgIHsgZnJlcXVlbmN5OiAxMDAwMCwgZW5hYmxlSGlnaEFjY3VyYWN5OiB0cnVlfVxuXG4gICAgKTsgXG59XG5mdW5jdGlvbiBuZWFySW5zdHJ1Y3Rpb25Db29yZGluYXRlKGxhdCxsb25nLCBpbnN0cnVjdGlvblBvaW50cykgeyAvL2NvbXBhcmUgbGF0IGxvbmcgb2YgZGV2aWNlIHRvIGNvb3JkaW5hdGVzIHdoZXJlIHlvdXIgZ29ubmEgcmVhZCBvdXQgZGF0YSwgc2VlIGlmIHRoZXJlcyBhIG1hdGNoLiBJZiBzbyByZXR1cm4gZGF0YSBmb3IgdGhhdCBjb29yZGluYXRlXG5cblx0XG5cdGZvcih2YXIgaT0wOyBpPGluc3RydWN0aW9uUG9pbnRzLmxlbmd0aDsgaSsrKSB7XG5cblx0XHR2YXIgaW5zdHJ1Y3Rpb25Db29yZGluYXRlcz0gaW5zdHJ1Y3Rpb25Qb2ludHNbaV1bJ2Nvb3JkaW5hdGVzJ107IFxuXHRcdHZhciBpbnN0cnVjdGlvbkNvb3JkaW5hdGVMYXQgPSBpbnN0cnVjdGlvbkNvb3JkaW5hdGVzWzFdOyBcblx0XHR2YXIgaW5zdHJ1Y3Rpb25Db29yZGluYXRlTG9uZyA9IGluc3RydWN0aW9uQ29vcmRpbmF0ZXNbMF07IFxuXG5cdFx0Ly9yb3VuZCB0byA0IGRpZ2l0cyBzbyBpZiB5b3VyIG1vcmUgcm91Z2hseSBuZWFyYnkgLi4uICh0aGlzIHBvc3NpYmx5IG5lZWRzIG1vcmUgdGhpbmtpbmcgYWJvdXQpXG5cdFx0aW5zdHJ1Y3Rpb25Db29yZGluYXRlTGF0ID0gaW5zdHJ1Y3Rpb25Db29yZGluYXRlTGF0LnRvRml4ZWQoNCk7IFxuXHRcdGluc3RydWN0aW9uQ29vcmRpbmF0ZUxvbmcgPSBpbnN0cnVjdGlvbkNvb3JkaW5hdGVMb25nLnRvRml4ZWQoNCk7IFxuXHRcdC8vIGNvbnNvbGUubG9nKCdkZXZpY2UgbGF0aXR1ZGUgaXMnICsgbGF0KTsgXG5cdFx0Ly8gY29uc29sZS5sb2coJ2RldmljZSBsb25naXR1ZGUgaXMnICsgbG9uZyk7IFxuXHRcdGNvbnNvbGUubG9nKCdwb2ludCBsYXQgaXMnICsgaW5zdHJ1Y3Rpb25Db29yZGluYXRlTGF0KTsgXG5cdFx0Y29uc29sZS5sb2coJ3BvaW50IGxvbmcgaXMnICsgaW5zdHJ1Y3Rpb25Db29yZGluYXRlTG9uZyk7IFxuXHRcdFxuXHRcdGlmKGxhdCA9PT0gaW5zdHJ1Y3Rpb25Db29yZGluYXRlTGF0ICYmIGxvbmcgPT09IGluc3RydWN0aW9uQ29vcmRpbmF0ZUxvbmcpIHsgLy9hbGwgdGhlIGNvb3JkaW5hdGVzIGFyZSBzdHJpbmdzIGF0IHRoaXMgcG9pbnQgLi4uIFxuXHRcdFx0cmV0dXJuIGluc3RydWN0aW9uUG9pbnRzW2ldOyBcblx0XHR9XG5cdH1cblx0cmV0dXJuIGZhbHNlOyBcbn1cblxuLy8gZnVuY3Rpb24gaXNDbG9zZShsYXQsIGxvbmcpIHtcblxuLy8gICAgIGZvcih2YXIgaT0wOyBpPGNvb3JkaW5hdGVzX2FycmF5Lmxlbmd0aDsgaSsrKSB7XG5cbi8vICAgICAgICAgLy9pZiBtYXRjaGVzIHRvIDQgZGVjaW1hbCBwbGFjZXMgXG4vLyAgICAgICAgIHZhciB3YXlwb2ludF9sYXQgPSBjb29yZGluYXRlc19hcnJheVtpXVswXTsgXG4vLyAgICAgICAgIHZhciB3YXlwb2ludF9sb25nID0gY29vcmRpbmF0ZXNfYXJyYXlbaV1bMV07IFxuXG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwb3NpdGlvbiBsYXQgbG9uZyBpcycgKyBsYXQgKyAnICcgKyBsb25nKTsgXG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdsYXQgbG9uZyB3YXlwb2ludCBpcycgK3dheXBvaW50X2xhdCArICcgJyArIHdheXBvaW50X2xvbmcpOyBcblxuLy8gICAgICAgICBpZigobGF0LnN1YnN0cigwLGxhdC5sZW5ndGggLTEpID09PSB3YXlwb2ludF9sYXQuc3Vic3RyKDAsd2F5cG9pbnRfbGF0Lmxlbmd0aC0xKSkgJiYgXG4vLyAgICAgICAgICAgICAobG9uZy5zdWJzdHIoMCwgbG9uZy5sZW5ndGggLTEpID09PSB3YXlwb2ludF9sb25nLnN1YnN0cigwLHdheXBvaW50X2xvbmcubGVuZ3RoLTEpKSkge1xuICAgICAgXG4vLyAgICAgICAgICAgICByZXR1cm4gaSsxOyBcbi8vICAgICAgICAgfVxuLy8gICAgIH1cbi8vICAgICByZXR1cm4gZmFsc2U7IFxuLy8gfSIsIid1c2Ugc3RyaWN0JztcblxuaWYgKHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuICAvLyBpbnN0YWxsIEVTNiBQcm9taXNlIHBvbHlmaWxsXG4gIHJlcXVpcmUoJy4uL3ZlbmRvci9wcm9taXNlJyk7XG59XG5cbnZhciBpbnRlcmNlcHRvciA9IHJlcXVpcmUoJ3Jlc3QvaW50ZXJjZXB0b3InKTtcblxudmFyIGNhbGxiYWNraWZ5ID0gaW50ZXJjZXB0b3Ioe1xuICBzdWNjZXNzOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSByZXNwb25zZSAmJiByZXNwb25zZS5jYWxsYmFjaztcblxuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlLmVudGl0eSwgcmVzcG9uc2UpO1xuICAgIH1cblxuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSxcbiAgZXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHZhciBjYWxsYmFjayA9IHJlc3BvbnNlICYmIHJlc3BvbnNlLmNhbGxiYWNrO1xuXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIGVyciA9IHJlc3BvbnNlLmVycm9yIHx8IHJlc3BvbnNlLmVudGl0eTtcbiAgICAgIGlmICh0eXBlb2YgZXJyICE9PSAnb2JqZWN0JykgZXJyID0gbmV3IEVycm9yKGVycik7XG4gICAgICBjYWxsYmFjayhlcnIpO1xuICAgIH1cblxuICAgIHJldHVybiByZXNwb25zZTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gY2FsbGJhY2tpZnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmlmICh0eXBlb2YgUHJvbWlzZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgLy8gaW5zdGFsbCBFUzYgUHJvbWlzZSBwb2x5ZmlsbFxuICByZXF1aXJlKCcuLi92ZW5kb3IvcHJvbWlzZScpO1xufVxuXG52YXIgcmVzdCA9IHJlcXVpcmUoJ3Jlc3QnKTtcbnZhciBzdGFuZGFyZFJlc3BvbnNlID0gcmVxdWlyZSgnLi9zdGFuZGFyZF9yZXNwb25zZScpO1xudmFyIGNhbGxiYWNraWZ5ID0gcmVxdWlyZSgnLi9jYWxsYmFja2lmeScpO1xuXG4vLyByZXN0LmpzIGNsaWVudCB3aXRoIE1JTUUgc3VwcG9ydFxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgcmV0dXJuIHJlc3RcbiAgICAud3JhcChyZXF1aXJlKCdyZXN0L2ludGVyY2VwdG9yL2Vycm9yQ29kZScpKVxuICAgIC53cmFwKHJlcXVpcmUoJ3Jlc3QvaW50ZXJjZXB0b3IvcGF0aFByZWZpeCcpLCB7IHByZWZpeDogY29uZmlnLmVuZHBvaW50IH0pXG4gICAgLndyYXAocmVxdWlyZSgncmVzdC9pbnRlcmNlcHRvci9taW1lJyksIHsgbWltZTogJ2FwcGxpY2F0aW9uL2pzb24nIH0pXG4gICAgLndyYXAocmVxdWlyZSgncmVzdC9pbnRlcmNlcHRvci9wYXJhbXMnKSlcbiAgICAud3JhcChyZXF1aXJlKCdyZXN0L2ludGVyY2VwdG9yL2RlZmF1bHRSZXF1ZXN0JyksIHtcbiAgICAgIHBhcmFtczogeyBhY2Nlc3NfdG9rZW46IGNvbmZpZy5hY2Nlc3NUb2tlbiB9XG4gICAgfSlcbiAgICAud3JhcChyZXF1aXJlKCdyZXN0L2ludGVyY2VwdG9yL3RlbXBsYXRlJykpXG4gICAgLndyYXAoc3RhbmRhcmRSZXNwb25zZSlcbiAgICAud3JhcChjYWxsYmFja2lmeSk7XG59O1xuIiwiLy8gV2Uga2VlcCBhbGwgb2YgdGhlIGNvbnN0YW50cyB0aGF0IGRlY2xhcmUgZW5kcG9pbnRzIGluIG9uZVxuLy8gcGxhY2UsIHNvIHRoYXQgd2UgY291bGQgY29uY2VpdmFibHkgdXBkYXRlIHRoaXMgZm9yIEFQSSBsYXlvdXRcbi8vIHJldmlzaW9ucy5cbm1vZHVsZS5leHBvcnRzLkRFRkFVTFRfRU5EUE9JTlQgPSAnaHR0cHM6Ly9hcGkubWFwYm94LmNvbSc7XG5cbm1vZHVsZS5leHBvcnRzLkFQSV9HRU9DT0RJTkdfRk9SV0FSRCA9ICcvZ2VvY29kaW5nL3Y1L3tkYXRhc2V0fS97cXVlcnl9Lmpzb257P3Byb3hpbWl0eSxjb3VudHJ5LHR5cGVzLGJib3gsbGltaXR9Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9HRU9DT0RJTkdfUkVWRVJTRSA9ICcvZ2VvY29kaW5nL3Y1L3tkYXRhc2V0fS97bG9uZ2l0dWRlfSx7bGF0aXR1ZGV9Lmpzb257P3R5cGVzLGxpbWl0fSc7XG5cbm1vZHVsZS5leHBvcnRzLkFQSV9ESVJFQ1RJT05TID0gJy92NC9kaXJlY3Rpb25zL3twcm9maWxlfS97ZW5jb2RlZFdheXBvaW50c30uanNvbns/YWx0ZXJuYXRpdmVzLGluc3RydWN0aW9ucyxnZW9tZXRyeSxzdGVwc30nO1xubW9kdWxlLmV4cG9ydHMuQVBJX0RJU1RBTkNFID0gJy9kaXN0YW5jZXMvdjEvbWFwYm94L3twcm9maWxlfSc7XG5cbm1vZHVsZS5leHBvcnRzLkFQSV9TVVJGQUNFID0gJy92NC9zdXJmYWNlL3ttYXBpZH0uanNvbns/bGF5ZXIsZmllbGRzLHBvaW50cyxnZW9qc29uLGludGVycG9sYXRlLGVuY29kZWRfcG9seWxpbmV9JztcblxubW9kdWxlLmV4cG9ydHMuQVBJX1VQTE9BRFMgPSAnL3VwbG9hZHMvdjEve293bmVyfSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfVVBMT0FEID0gJy91cGxvYWRzL3YxL3tvd25lcn0ve3VwbG9hZH0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1VQTE9BRF9DUkVERU5USUFMUyA9ICcvdXBsb2Fkcy92MS97b3duZXJ9L2NyZWRlbnRpYWxzJztcblxubW9kdWxlLmV4cG9ydHMuQVBJX01BVENISU5HID0gJy9tYXRjaGluZy92NC97cHJvZmlsZX0uanNvbic7XG5cbm1vZHVsZS5leHBvcnRzLkFQSV9EQVRBU0VUX0RBVEFTRVRTID0gJy9kYXRhc2V0cy92MS97b3duZXJ9ez9saW1pdCxzdGFydCxmcmVzaH0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX0RBVEFTRVRfREFUQVNFVCA9ICcvZGF0YXNldHMvdjEve293bmVyfS97ZGF0YXNldH0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX0RBVEFTRVRfRkVBVFVSRVMgPSAnL2RhdGFzZXRzL3YxL3tvd25lcn0ve2RhdGFzZXR9L2ZlYXR1cmVzez9yZXZlcnNlLGxpbWl0LHN0YXJ0fSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfREFUQVNFVF9GRUFUVVJFID0gJy9kYXRhc2V0cy92MS97b3duZXJ9L3tkYXRhc2V0fS9mZWF0dXJlcy97aWR9JztcblxubW9kdWxlLmV4cG9ydHMuQVBJX1RJTEVTVEFUU19TVEFUSVNUSUNTID0gJy90aWxlc3RhdHMvdjEve293bmVyfS97dGlsZXNldH0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1RJTEVTVEFUU19MQVlFUiA9ICcvdGlsZXN0YXRzL3YxL3tvd25lcn0ve3RpbGVzZXR9L3tsYXllcn0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1RJTEVTVEFUU19BVFRSSUJVVEUgPSAnL3RpbGVzdGF0cy92MS97b3duZXJ9L3t0aWxlc2V0fS97bGF5ZXJ9L3thdHRyaWJ1dGV9JztcblxubW9kdWxlLmV4cG9ydHMuQVBJX1NUQVRJQyA9ICcvdjQve21hcGlkfXsrb3ZlcmxheX0veyt4eXp9L3t3aWR0aH14e2hlaWdodH17K3JldGluYX17LmZvcm1hdH17P2FjY2Vzc190b2tlbn0nO1xuXG5tb2R1bGUuZXhwb3J0cy5BUElfU1RZTEVTX0xJU1QgPSAnL3N0eWxlcy92MS97b3duZXJ9Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9TVFlMRVNfQ1JFQVRFID0gJy9zdHlsZXMvdjEve293bmVyfSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfU1RZTEVTX1JFQUQgPSAnL3N0eWxlcy92MS97b3duZXJ9L3tzdHlsZWlkfSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfU1RZTEVTX1VQREFURSA9ICcvc3R5bGVzL3YxL3tvd25lcn0ve3N0eWxlaWR9Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9TVFlMRVNfREVMRVRFID0gJy9zdHlsZXMvdjEve293bmVyfS97c3R5bGVpZH0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1NUWUxFU19FTUJFRCA9ICcvc3R5bGVzL3YxL3tvd25lcn0ve3N0eWxlaWR9Lmh0bWx7P3pvb213aGVlbCx0aXRsZSxhY2Nlc3NfdG9rZW59Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9TVFlMRVNfU1BSSVRFID0gJy9zdHlsZXMvdjEve293bmVyfS97c3R5bGVpZH0vc3ByaXRleytyZXRpbmF9ey5mb3JtYXR9Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9TVFlMRVNfU1BSSVRFX0FERF9JQ09OID0gJy9zdHlsZXMvdjEve293bmVyfS97c3R5bGVpZH0vc3ByaXRlL3tpY29uTmFtZX0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1NUWUxFU19TUFJJVEVfREVMRVRFX0lDT04gPSAnL3N0eWxlcy92MS97b3duZXJ9L3tzdHlsZWlkfS9zcHJpdGUve2ljb25OYW1lfSc7XG5cbm1vZHVsZS5leHBvcnRzLkFQSV9TVFlMRVNfRk9OVF9HTFlQSF9SQU5HRVMgPSAnL2ZvbnRzL3YxL3tvd25lcn0ve2ZvbnR9L3tzdGFydH0te2VuZH0ucGJmJ1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW52YXJpYW50TG9jYXRpb24gPSByZXF1aXJlKCcuL2ludmFyaWFudF9sb2NhdGlvbicpO1xuXG4vKipcbiAqIEZvcm1hdCB3YXlwaW9udHMgaW4gYSB3YXkgdGhhdCdzIGZyaWVuZGx5IHRvIHRoZSBkaXJlY3Rpb25zIGFuZCBzdXJmYWNlXG4gKiBBUEk6IGNvbW1hLXNlcGFyYXRlZCBsYXRpdHVkZSwgbG9uZ2l0dWRlIHBhaXJzIHdpdGggc2VtaWNvbG9ucyBiZXR3ZWVuXG4gKiB0aGVtLlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gd2F5cG9pbnRzIGFycmF5IG9mIG9iamVjdHMgd2l0aCBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlXG4gKiBwcm9wZXJ0aWVzXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBmb3JtYXR0ZWQgcG9pbnRzXG4gKiBAdGhyb3dzIHtFcnJvcn0gaWYgdGhlIGlucHV0IGlzIGludmFsaWRcbiAqL1xuZnVuY3Rpb24gZm9ybWF0UG9pbnRzKHdheXBvaW50cykge1xuICByZXR1cm4gd2F5cG9pbnRzLm1hcChmdW5jdGlvbihsb2NhdGlvbikge1xuICAgIGludmFyaWFudExvY2F0aW9uKGxvY2F0aW9uKTtcbiAgICByZXR1cm4gbG9jYXRpb24ubG9uZ2l0dWRlICsgJywnICsgbG9jYXRpb24ubGF0aXR1ZGU7XG4gIH0pLmpvaW4oJzsnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtYXRQb2ludHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiNjQgPSByZXF1aXJlKCdyZXN0L3V0aWwvYmFzZTY0Jyk7XG5cbi8qKlxuICogQWNjZXNzIHRva2VucyBhY3R1YWxseSBhcmUgZGF0YSwgYW5kIHVzaW5nIHRoZW0gd2UgY2FuIGRlcml2ZVxuICogYSB1c2VyJ3MgdXNlcm5hbWUuIFRoaXMgbWV0aG9kIGF0dGVtcHRzIHRvIGRvIGp1c3QgdGhhdCxcbiAqIGRlY29kaW5nIHRoZSBwYXJ0IG9mIHRoZSB0b2tlbiBhZnRlciB0aGUgZmlyc3QgYC5gIGludG9cbiAqIGEgdXNlcm5hbWUuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiBhbiBhY2Nlc3MgdG9rZW5cbiAqIEByZXR1cm4ge3N0cmluZ30gdXNlcm5hbWVcbiAqL1xuZnVuY3Rpb24gZ2V0VXNlcih0b2tlbikge1xuICB2YXIgZGF0YSA9IHRva2VuLnNwbGl0KCcuJylbMV07XG4gIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gIGRhdGEgPSBkYXRhLnJlcGxhY2UoLy0vZywgJysnKS5yZXBsYWNlKC9fL2csICcvJyk7XG5cbiAgdmFyIG1vZCA9IGRhdGEubGVuZ3RoICUgNDtcbiAgaWYgKG1vZCA9PT0gMikgZGF0YSArPSAnPT0nO1xuICBpZiAobW9kID09PSAzKSBkYXRhICs9ICc9JztcbiAgaWYgKG1vZCA9PT0gMSB8fCBtb2QgPiAzKSByZXR1cm4gbnVsbDtcblxuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGI2NC5kZWNvZGUoZGF0YSkpLnU7XG4gIH0gY2F0Y2goZXJyKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRVc2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnLi4vdmVuZG9yL2ludmFyaWFudCcpO1xuXG4vKipcbiAqIEdpdmVuIGFuIG9iamVjdCB0aGF0IHNob3VsZCBiZSBhIGxvY2F0aW9uLCBlbnN1cmUgdGhhdCBpdCBoYXNcbiAqIHZhbGlkIG51bWVyaWMgbG9uZ2l0dWRlICYgbGF0aXR1ZGUgcHJvcGVydGllc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBsb2NhdGlvbiBvYmplY3Qgd2l0aCBsb25naXR1ZGUgYW5kIGxhdGl0dWRlIHZhbHVlc1xuICogQHRocm93cyB7QXNzZXJ0RXJyb3J9IGlmIHRoZSBvYmplY3QgaXMgbm90IGEgdmFsaWQgbG9jYXRpb25cbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9IG5vdGhpbmdcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGludmFyaWFudExvY2F0aW9uKGxvY2F0aW9uKSB7XG4gIGludmFyaWFudCh0eXBlb2YgbG9jYXRpb24ubGF0aXR1ZGUgPT09ICdudW1iZXInICYmXG4gICAgdHlwZW9mIGxvY2F0aW9uLmxvbmdpdHVkZSA9PT0gJ251bWJlcicsXG4gICAgJ2xvY2F0aW9uIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggbnVtZXJpYyBsYXRpdHVkZSAmIGxvbmdpdHVkZSBwcm9wZXJ0aWVzJyk7XG4gIGlmIChsb2NhdGlvbi56b29tICE9PSB1bmRlZmluZWQpIHtcbiAgICBpbnZhcmlhbnQodHlwZW9mIGxvY2F0aW9uLnpvb20gPT09ICdudW1iZXInLCAnem9vbSBtdXN0IGJlIG51bWVyaWMnKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudExvY2F0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnLi4vdmVuZG9yL2ludmFyaWFudCcpO1xudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG52YXIgY2xpZW50ID0gcmVxdWlyZSgnLi9jbGllbnQnKTtcbnZhciBnZXRVc2VyID0gcmVxdWlyZSgnLi9nZXRfdXNlcicpO1xuXG4vKipcbiAqIFNlcnZpY2VzIGFsbCBoYXZlIHRoZSBzYW1lIGNvbnN0cnVjdG9yIHBhdHRlcm46IHlvdSBpbml0aWFsaXplIHRoZW1cbiAqIHdpdGggYW4gYWNjZXNzIHRva2VuIGFuZCBvcHRpb25zLCBhbmQgdGhleSB2YWxpZGF0ZSB0aG9zZSBhcmd1bWVudHNcbiAqIGluIGEgcHJlZGljdGFibGUgd2F5LiBUaGlzIGlzIGEgY29uc3RydWN0b3ItZ2VuZXJhdG9yIHRoYXQgbWFrZXNcbiAqIGl0IHBvc3NpYmxlIHRvIHJlcXVpcmUgZWFjaCBzZXJ2aWNlJ3MgQVBJIGluZGl2aWR1YWxseS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIG5hbWUgb2YgdGhlIE1hcGJveCBBUEkgdGhpcyBjbGFzcyB3aWxsIGFjY2VzczpcbiAqIHRoaXMgaXMgc2V0IHRvIHRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiBzbyBpdCB3aWxsIHNob3cgdXAgaW4gdHJhY2ViYWNrc1xuICogQHJldHVybnMge0Z1bmN0aW9ufSBjb25zdHJ1Y3RvciBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBtYWtlU2VydmljZShuYW1lKSB7XG5cbiAgZnVuY3Rpb24gc2VydmljZShhY2Nlc3NUb2tlbiwgb3B0aW9ucykge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG5cbiAgICBpbnZhcmlhbnQodHlwZW9mIGFjY2Vzc1Rva2VuID09PSAnc3RyaW5nJyxcbiAgICAgICdhY2Nlc3NUb2tlbiByZXF1aXJlZCB0byBpbnN0YW50aWF0ZSBNYXBib3ggY2xpZW50Jyk7XG5cbiAgICB2YXIgZW5kcG9pbnQgPSBjb25zdGFudHMuREVGQVVMVF9FTkRQT0lOVDtcblxuICAgIGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGludmFyaWFudCh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcsICdvcHRpb25zIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICBpZiAob3B0aW9ucy5lbmRwb2ludCkge1xuICAgICAgICBpbnZhcmlhbnQodHlwZW9mIG9wdGlvbnMuZW5kcG9pbnQgPT09ICdzdHJpbmcnLCAnZW5kcG9pbnQgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgICBlbmRwb2ludCA9IG9wdGlvbnMuZW5kcG9pbnQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5hY2NvdW50KSB7XG4gICAgICAgIGludmFyaWFudCh0eXBlb2Ygb3B0aW9ucy5hY2NvdW50ID09PSAnc3RyaW5nJywgJ2FjY291bnQgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgICB0aGlzLm93bmVyID0gb3B0aW9ucy5hY2NvdW50O1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50KHtcbiAgICAgIGVuZHBvaW50OiBlbmRwb2ludCxcbiAgICAgIGFjY2Vzc1Rva2VuOiBhY2Nlc3NUb2tlblxuICAgIH0pO1xuXG4gICAgdGhpcy5hY2Nlc3NUb2tlbiA9IGFjY2Vzc1Rva2VuO1xuICAgIHRoaXMuZW5kcG9pbnQgPSBlbmRwb2ludDtcbiAgICB0aGlzLm93bmVyID0gdGhpcy5vd25lciB8fCBnZXRVc2VyKGFjY2Vzc1Rva2VuKTtcbiAgICBpbnZhcmlhbnQoISF0aGlzLm93bmVyLCAnY291bGQgbm90IGRldGVybWluZSBhY2NvdW50IGZyb20gcHJvdmlkZWQgYWNjZXNzVG9rZW4nKTtcblxuICB9XG5cbiAgcmV0dXJuIHNlcnZpY2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbWFrZVNlcnZpY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCcuLi8uLi92ZW5kb3IvaW52YXJpYW50JyksXG4gIGZvcm1hdFBvaW50cyA9IHJlcXVpcmUoJy4uL2Zvcm1hdF9wb2ludHMnKSxcbiAgbWFrZVNlcnZpY2UgPSByZXF1aXJlKCcuLi9tYWtlX3NlcnZpY2UnKSxcbiAgY29uc3RhbnRzID0gcmVxdWlyZSgnLi4vY29uc3RhbnRzJyk7XG5cbnZhciBNYXBib3hEaXJlY3Rpb25zID0gbWFrZVNlcnZpY2UoJ01hcGJveERpcmVjdGlvbnMnKTtcblxuLyoqXG4gKiBGaW5kIGRpcmVjdGlvbnMgZnJvbSBBIHRvIEIsIG9yIGJldHdlZW4gYW55IG51bWJlciBvZiBsb2NhdGlvbnMuXG4gKiBDb25zdWx0IHRoZSBbTWFwYm94IERpcmVjdGlvbnMgQVBJXShodHRwczovL3d3dy5tYXBib3guY29tL2RldmVsb3BlcnMvYXBpL2RpcmVjdGlvbnMvKVxuICogZm9yIG1vcmUgZG9jdW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0FycmF5PE9iamVjdD59IHdheXBvaW50cyBhbiBhcnJheSBvZiBvYmplY3RzIHdpdGggYGxhdGl0dWRlYFxuICogYW5kIGBsb25naXR1ZGVgIHByb3BlcnRpZXMgdGhhdCByZXByZXNlbnQgd2F5cG9pbnRzIGluIG9yZGVyLiBVcCB0b1xuICogMjUgd2F5cG9pbnRzIGNhbiBiZSBzcGVjaWZpZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIGFkZGl0aW9uYWwgb3B0aW9ucyBtZWFudCB0byB0dW5lXG4gKiB0aGUgcmVxdWVzdFxuICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLnByb2ZpbGU9bWFwYm94LmRyaXZpbmddIHRoZSBkaXJlY3Rpb25zXG4gKiBwcm9maWxlLCB3aGljaCBkZXRlcm1pbmVzIGhvdyB0byBwcmlvcml0aXplIGRpZmZlcmVudCByb3V0ZXMuXG4gKiBPcHRpb25zIGFyZSBgJ21hcGJveC5kcml2aW5nJ2AsIHdoaWNoIGFzc3VtZXMgdHJhbnNwb3J0YXRpb24gdmlhIGFuXG4gKiBhdXRvbW9iaWxlIGFuZCB3aWxsIHVzZSBoaWdod2F5cywgYCdtYXBib3gud2Fsa2luZydgLCB3aGljaCBhdm9pZHNcbiAqIHN0cmVldHMgd2l0aG91dCBzaWRld2Fsa3MsIGFuZCBgJ21hcGJveC5jeWNsaW5nJ2AsIHdoaWNoIHByZWZlcnMgc3RyZWV0c1xuICogd2l0aCBiaWN5Y2xlIGxhbmVzIGFuZCBsb3dlciBzcGVlZCBsaW1pdHMgZm9yIHRyYW5zcG9ydGF0aW9uIHZpYVxuICogYmljeWNsZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5hbHRlcm5hdGl2ZXM9dHJ1ZV0gd2hldGhlciB0byBnZW5lcmF0ZVxuICogYWx0ZXJuYXRpdmUgcm91dGVzIGFsb25nIHdpdGggdGhlIHByZWZlcnJlZCByb3V0ZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5pbnN0cnVjdGlvbnM9dGV4dF0gZm9ybWF0IGZvciB0dXJuLWJ5LXR1cm5cbiAqIGluc3RydWN0aW9ucyBhbG9uZyB0aGUgcm91dGUuXG4gKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuZ2VvbWV0cnk9Z2VvanNvbl0gZm9ybWF0IGZvciB0aGUgcmV0dXJuZWRcbiAqIHJvdXRlLiBPcHRpb25zIGFyZSBgJ2dlb2pzb24nYCwgYCdwb2x5bGluZSdgLCBvciBgZmFsc2VgOiBgcG9seWxpbmVgXG4gKiB5aWVsZHMgbW9yZSBjb21wYWN0IHJlc3BvbnNlcyB3aGljaCBjYW4gYmUgZGVjb2RlZCBvbiB0aGUgY2xpZW50IHNpZGUuXG4gKiBbR2VvSlNPTl0oaHR0cDovL2dlb2pzb24ub3JnLyksIHRoZSBkZWZhdWx0LCBpcyBjb21wYXRpYmxlIHdpdGggbGlicmFyaWVzXG4gKiBsaWtlIFtNYXBib3ggR0xdKGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vbWFwYm94LWdsLyksXG4gKiBMZWFmbGV0IGFuZCBbTWFwYm94LmpzXShodHRwczovL3d3dy5tYXBib3guY29tL21hcGJveC5qcy8pLiBgZmFsc2VgXG4gKiBvbWl0cyB0aGUgZ2VvbWV0cnkgZW50aXJlbHkgYW5kIG9ubHkgcmV0dXJucyBpbnN0cnVjdGlvbnMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBjYWxsZWQgd2l0aCAoZXJyLCByZXN1bHRzKVxuICogQHJldHVybnMge3VuZGVmaW5lZH0gbm90aGluZywgY2FsbHMgY2FsbGJhY2tcbiAqIEBtZW1iZXJvZiBNYXBib3hDbGllbnRcbiAqIEBleGFtcGxlXG4gKiB2YXIgbWFwYm94Q2xpZW50ID0gbmV3IE1hcGJveENsaWVudCgnQUNDRVNTVE9LRU4nKTtcbiAqIG1hcGJveENsaWVudC5nZXREaXJlY3Rpb25zKFxuICogICBbXG4gKiAgICAgeyBsYXRpdHVkZTogMzMuNiwgbG9uZ2l0dWRlOiAtOTUuNDQzMSB9LFxuICogICAgIHsgbGF0aXR1ZGU6IDMzLjIsIGxvbmdpdHVkZTogLTk1LjQ0MzEgfSBdLFxuICogICBmdW5jdGlvbihlcnIsIHJlcykge1xuICogICAvLyByZXMgaXMgYSBkb2N1bWVudCB3aXRoIGRpcmVjdGlvbnNcbiAqIH0pO1xuICpcbiAqIC8vIFdpdGggb3B0aW9uc1xuICogbWFwYm94Q2xpZW50LmdldERpcmVjdGlvbnMoW1xuICogICB7IGxhdGl0dWRlOiAzMy42ODc1NDMxLCBsb25naXR1ZGU6IC05NS40NDMxMTQyIH0sXG4gKiAgIHsgbGF0aXR1ZGU6IDMzLjY4NzU0MzEsIGxvbmdpdHVkZTogLTk1LjQ4MzExNDIgfVxuICogXSwge1xuICogICBwcm9maWxlOiAnbWFwYm94LndhbGtpbmcnLFxuICogICBpbnN0cnVjdGlvbnM6ICdodG1sJyxcbiAqICAgYWx0ZXJuYXRpdmVzOiBmYWxzZSxcbiAqICAgZ2VvbWV0cnk6ICdwb2x5bGluZSdcbiAqIH0sIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICogICBjb25zb2xlLmxvZyhyZXN1bHRzLm9yaWdpbik7XG4gKiB9KTtcbiAqL1xuTWFwYm94RGlyZWN0aW9ucy5wcm90b3R5cGUuZ2V0RGlyZWN0aW9ucyA9IGZ1bmN0aW9uKHdheXBvaW50cywgb3B0aW9ucywgY2FsbGJhY2spIHtcblxuICAvLyBwZXJtaXQgdGhlIG9wdGlvbnMgYXJndW1lbnQgdG8gYmUgb21pdHRlZFxuICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0ge307XG4gIH0gZWxzZSBpZiAob3B0aW9ucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgLy8gdHlwZWNoZWNrIGFyZ3VtZW50c1xuICBpbnZhcmlhbnQoQXJyYXkuaXNBcnJheSh3YXlwb2ludHMpLCAnd2F5cG9pbnRzIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgaW52YXJpYW50KHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0JywgJ29wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QnKTtcblxuICB2YXIgZW5jb2RlZFdheXBvaW50cyA9IGZvcm1hdFBvaW50cyh3YXlwb2ludHMpO1xuXG4gIHZhciBwcm9maWxlID0gJ21hcGJveC5kcml2aW5nJyxcbiAgICBhbHRlcm5hdGl2ZXMgPSB0cnVlLFxuICAgIHN0ZXBzID0gdHJ1ZSxcbiAgICBnZW9tZXRyeSA9ICdnZW9qc29uJyxcbiAgICBpbnN0cnVjdGlvbnMgPSAndGV4dCc7XG5cbiAgaWYgKG9wdGlvbnMucHJvZmlsZSkge1xuICAgIGludmFyaWFudCh0eXBlb2Ygb3B0aW9ucy5wcm9maWxlID09PSAnc3RyaW5nJywgJ3Byb2ZpbGUgb3B0aW9uIG11c3QgYmUgc3RyaW5nJyk7XG4gICAgcHJvZmlsZSA9IG9wdGlvbnMucHJvZmlsZTtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5hbHRlcm5hdGl2ZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaW52YXJpYW50KHR5cGVvZiBvcHRpb25zLmFsdGVybmF0aXZlcyA9PT0gJ2Jvb2xlYW4nLCAnYWx0ZXJuYXRpdmVzIG9wdGlvbiBtdXN0IGJlIGJvb2xlYW4nKTtcbiAgICBhbHRlcm5hdGl2ZXMgPSBvcHRpb25zLmFsdGVybmF0aXZlcztcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5zdGVwcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpbnZhcmlhbnQodHlwZW9mIG9wdGlvbnMuc3RlcHMgPT09ICdib29sZWFuJywgJ3N0ZXBzIG9wdGlvbiBtdXN0IGJlIGJvb2xlYW4nKTtcbiAgICBzdGVwcyA9IG9wdGlvbnMuc3RlcHM7XG4gIH1cblxuICBpZiAob3B0aW9ucy5nZW9tZXRyeSkge1xuICAgIGludmFyaWFudCh0eXBlb2Ygb3B0aW9ucy5nZW9tZXRyeSA9PT0gJ3N0cmluZycsICdnZW9tZXRyeSBvcHRpb24gbXVzdCBiZSBzdHJpbmcnKTtcbiAgICBnZW9tZXRyeSA9IG9wdGlvbnMuZ2VvbWV0cnk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5pbnN0cnVjdGlvbnMpIHtcbiAgICBpbnZhcmlhbnQodHlwZW9mIG9wdGlvbnMuaW5zdHJ1Y3Rpb25zID09PSAnc3RyaW5nJywgJ2luc3RydWN0aW9ucyBvcHRpb24gbXVzdCBiZSBzdHJpbmcnKTtcbiAgICBpbnN0cnVjdGlvbnMgPSBvcHRpb25zLmluc3RydWN0aW9ucztcbiAgfVxuXG4gIHJldHVybiB0aGlzLmNsaWVudCh7XG4gICAgcGF0aDogY29uc3RhbnRzLkFQSV9ESVJFQ1RJT05TLFxuICAgIHBhcmFtczoge1xuICAgICAgZW5jb2RlZFdheXBvaW50czogZW5jb2RlZFdheXBvaW50cyxcbiAgICAgIHByb2ZpbGU6IHByb2ZpbGUsXG4gICAgICBpbnN0cnVjdGlvbnM6IGluc3RydWN0aW9ucyxcbiAgICAgIGdlb21ldHJ5OiBnZW9tZXRyeSxcbiAgICAgIGFsdGVybmF0aXZlczogYWx0ZXJuYXRpdmVzLFxuICAgICAgc3RlcHM6IHN0ZXBzXG4gICAgfSxcbiAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcGJveERpcmVjdGlvbnM7XG4iLCJ2YXIgaW50ZXJjZXB0b3IgPSByZXF1aXJlKCdyZXN0L2ludGVyY2VwdG9yJyk7XG5cbnZhciBzdGFuZGFyZFJlc3BvbnNlID0gaW50ZXJjZXB0b3Ioe1xuICByZXNwb25zZTogdHJhbnNmb3JtLFxufSk7XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybShyZXNwb25zZSkge1xuICByZXR1cm4ge1xuICAgIHVybDogcmVzcG9uc2UudXJsLFxuICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzID8gcmVzcG9uc2Uuc3RhdHVzLmNvZGUgOiB1bmRlZmluZWQsXG4gICAgaGVhZGVyczogcmVzcG9uc2UuaGVhZGVycyxcbiAgICBlbnRpdHk6IHJlc3BvbnNlLmVudGl0eSxcbiAgICBlcnJvcjogcmVzcG9uc2UuZXJyb3IsXG4gICAgY2FsbGJhY2s6IHJlc3BvbnNlLnJlcXVlc3QuY2FsbGJhY2tcbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhbmRhcmRSZXNwb25zZTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciBOT0RFX0VOViA9IHByb2Nlc3MuZW52Lk5PREVfRU5WO1xuXG52YXIgaW52YXJpYW50ID0gZnVuY3Rpb24oY29uZGl0aW9uLCBmb3JtYXQsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgaWYgKE5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArXG4gICAgICAgICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGUsIGZdO1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICBmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24oKSB7IHJldHVybiBhcmdzW2FyZ0luZGV4KytdOyB9KVxuICAgICAgKTtcbiAgICAgIGVycm9yLm5hbWUgPSAnSW52YXJpYW50IFZpb2xhdGlvbic7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcbiIsIiFmdW5jdGlvbih0KXtcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz10KCk6XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZSh0KTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93P3dpbmRvdy5Qcm9taXNlPXQoKTpcInVuZGVmaW5lZFwiIT10eXBlb2YgZ2xvYmFsP2dsb2JhbC5Qcm9taXNlPXQoKTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2VsZiYmKHNlbGYuUHJvbWlzZT10KCkpfShmdW5jdGlvbigpe3ZhciB0O3JldHVybiBmdW5jdGlvbiBlKHQsbixvKXtmdW5jdGlvbiByKHUsYyl7aWYoIW5bdV0pe2lmKCF0W3VdKXt2YXIgZj1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFjJiZmKXJldHVybiBmKHUsITApO2lmKGkpcmV0dXJuIGkodSwhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIit1K1wiJ1wiKX12YXIgcz1uW3VdPXtleHBvcnRzOnt9fTt0W3VdWzBdLmNhbGwocy5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbdV1bMV1bZV07cmV0dXJuIHIobj9uOmUpfSxzLHMuZXhwb3J0cyxlLHQsbixvKX1yZXR1cm4gblt1XS5leHBvcnRzfWZvcih2YXIgaT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLHU9MDt1PG8ubGVuZ3RoO3UrKylyKG9bdV0pO3JldHVybiByfSh7MTpbZnVuY3Rpb24odCxlLG4pe3ZhciBvPXQoXCIuLi9saWIvZGVjb3JhdG9ycy91bmhhbmRsZWRSZWplY3Rpb25cIikscj1vKHQoXCIuLi9saWIvUHJvbWlzZVwiKSk7ZS5leHBvcnRzPVwidW5kZWZpbmVkXCIhPXR5cGVvZiBnbG9iYWw/Z2xvYmFsLlByb21pc2U9cjpcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2VsZj9zZWxmLlByb21pc2U9cjpyfSx7XCIuLi9saWIvUHJvbWlzZVwiOjIsXCIuLi9saWIvZGVjb3JhdG9ycy91bmhhbmRsZWRSZWplY3Rpb25cIjo0fV0sMjpbZnVuY3Rpb24oZSxuLG8peyFmdW5jdGlvbih0KXtcInVzZSBzdHJpY3RcIjt0KGZ1bmN0aW9uKHQpe3ZhciBlPXQoXCIuL21ha2VQcm9taXNlXCIpLG49dChcIi4vU2NoZWR1bGVyXCIpLG89dChcIi4vZW52XCIpLmFzYXA7cmV0dXJuIGUoe3NjaGVkdWxlcjpuZXcgbihvKX0pfSl9KFwiZnVuY3Rpb25cIj09dHlwZW9mIHQmJnQuYW1kP3Q6ZnVuY3Rpb24odCl7bi5leHBvcnRzPXQoZSl9KX0se1wiLi9TY2hlZHVsZXJcIjozLFwiLi9lbnZcIjo1LFwiLi9tYWtlUHJvbWlzZVwiOjd9XSwzOltmdW5jdGlvbihlLG4sbyl7IWZ1bmN0aW9uKHQpe1widXNlIHN0cmljdFwiO3QoZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQpe3RoaXMuX2FzeW5jPXQsdGhpcy5fcnVubmluZz0hMSx0aGlzLl9xdWV1ZT10aGlzLHRoaXMuX3F1ZXVlTGVuPTAsdGhpcy5fYWZ0ZXJRdWV1ZT17fSx0aGlzLl9hZnRlclF1ZXVlTGVuPTA7dmFyIGU9dGhpczt0aGlzLmRyYWluPWZ1bmN0aW9uKCl7ZS5fZHJhaW4oKX19cmV0dXJuIHQucHJvdG90eXBlLmVucXVldWU9ZnVuY3Rpb24odCl7dGhpcy5fcXVldWVbdGhpcy5fcXVldWVMZW4rK109dCx0aGlzLnJ1bigpfSx0LnByb3RvdHlwZS5hZnRlclF1ZXVlPWZ1bmN0aW9uKHQpe3RoaXMuX2FmdGVyUXVldWVbdGhpcy5fYWZ0ZXJRdWV1ZUxlbisrXT10LHRoaXMucnVuKCl9LHQucHJvdG90eXBlLnJ1bj1mdW5jdGlvbigpe3RoaXMuX3J1bm5pbmd8fCh0aGlzLl9ydW5uaW5nPSEwLHRoaXMuX2FzeW5jKHRoaXMuZHJhaW4pKX0sdC5wcm90b3R5cGUuX2RyYWluPWZ1bmN0aW9uKCl7Zm9yKHZhciB0PTA7dDx0aGlzLl9xdWV1ZUxlbjsrK3QpdGhpcy5fcXVldWVbdF0ucnVuKCksdGhpcy5fcXVldWVbdF09dm9pZCAwO2Zvcih0aGlzLl9xdWV1ZUxlbj0wLHRoaXMuX3J1bm5pbmc9ITEsdD0wO3Q8dGhpcy5fYWZ0ZXJRdWV1ZUxlbjsrK3QpdGhpcy5fYWZ0ZXJRdWV1ZVt0XS5ydW4oKSx0aGlzLl9hZnRlclF1ZXVlW3RdPXZvaWQgMDt0aGlzLl9hZnRlclF1ZXVlTGVuPTB9LHR9KX0oXCJmdW5jdGlvblwiPT10eXBlb2YgdCYmdC5hbWQ/dDpmdW5jdGlvbih0KXtuLmV4cG9ydHM9dCgpfSl9LHt9XSw0OltmdW5jdGlvbihlLG4sbyl7IWZ1bmN0aW9uKHQpe1widXNlIHN0cmljdFwiO3QoZnVuY3Rpb24odCl7ZnVuY3Rpb24gZSh0KXt0aHJvdyB0fWZ1bmN0aW9uIG4oKXt9dmFyIG89dChcIi4uL2VudlwiKS5zZXRUaW1lcixyPXQoXCIuLi9mb3JtYXRcIik7cmV0dXJuIGZ1bmN0aW9uKHQpe2Z1bmN0aW9uIGkodCl7dC5oYW5kbGVkfHwobC5wdXNoKHQpLGEoXCJQb3RlbnRpYWxseSB1bmhhbmRsZWQgcmVqZWN0aW9uIFtcIit0LmlkK1wiXSBcIityLmZvcm1hdEVycm9yKHQudmFsdWUpKSl9ZnVuY3Rpb24gdSh0KXt2YXIgZT1sLmluZGV4T2YodCk7ZT49MCYmKGwuc3BsaWNlKGUsMSksaChcIkhhbmRsZWQgcHJldmlvdXMgcmVqZWN0aW9uIFtcIit0LmlkK1wiXSBcIityLmZvcm1hdE9iamVjdCh0LnZhbHVlKSkpfWZ1bmN0aW9uIGModCxlKXtwLnB1c2godCxlKSxudWxsPT09ZCYmKGQ9byhmLDApKX1mdW5jdGlvbiBmKCl7Zm9yKGQ9bnVsbDtwLmxlbmd0aD4wOylwLnNoaWZ0KCkocC5zaGlmdCgpKX12YXIgcyxhPW4saD1uO1widW5kZWZpbmVkXCIhPXR5cGVvZiBjb25zb2xlJiYocz1jb25zb2xlLGE9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHMuZXJyb3I/ZnVuY3Rpb24odCl7cy5lcnJvcih0KX06ZnVuY3Rpb24odCl7cy5sb2codCl9LGg9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHMuaW5mbz9mdW5jdGlvbih0KXtzLmluZm8odCl9OmZ1bmN0aW9uKHQpe3MubG9nKHQpfSksdC5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uPWZ1bmN0aW9uKHQpe2MoaSx0KX0sdC5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZD1mdW5jdGlvbih0KXtjKHUsdCl9LHQub25GYXRhbFJlamVjdGlvbj1mdW5jdGlvbih0KXtjKGUsdC52YWx1ZSl9O3ZhciBwPVtdLGw9W10sZD1udWxsO3JldHVybiB0fX0pfShcImZ1bmN0aW9uXCI9PXR5cGVvZiB0JiZ0LmFtZD90OmZ1bmN0aW9uKHQpe24uZXhwb3J0cz10KGUpfSl9LHtcIi4uL2VudlwiOjUsXCIuLi9mb3JtYXRcIjo2fV0sNTpbZnVuY3Rpb24oZSxuLG8peyFmdW5jdGlvbih0KXtcInVzZSBzdHJpY3RcIjt0KGZ1bmN0aW9uKHQpe2Z1bmN0aW9uIGUoKXtyZXR1cm5cInVuZGVmaW5lZFwiIT10eXBlb2YgcHJvY2VzcyYmXCJbb2JqZWN0IHByb2Nlc3NdXCI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocHJvY2Vzcyl9ZnVuY3Rpb24gbigpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXImJk11dGF0aW9uT2JzZXJ2ZXJ8fFwiZnVuY3Rpb25cIj09dHlwZW9mIFdlYktpdE11dGF0aW9uT2JzZXJ2ZXImJldlYktpdE11dGF0aW9uT2JzZXJ2ZXJ9ZnVuY3Rpb24gbyh0KXtmdW5jdGlvbiBlKCl7dmFyIHQ9bjtuPXZvaWQgMCx0KCl9dmFyIG4sbz1kb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlwiKSxyPW5ldyB0KGUpO3Iub2JzZXJ2ZShvLHtjaGFyYWN0ZXJEYXRhOiEwfSk7dmFyIGk9MDtyZXR1cm4gZnVuY3Rpb24odCl7bj10LG8uZGF0YT1pXj0xfX12YXIgcixpPVwidW5kZWZpbmVkXCIhPXR5cGVvZiBzZXRUaW1lb3V0JiZzZXRUaW1lb3V0LHU9ZnVuY3Rpb24odCxlKXtyZXR1cm4gc2V0VGltZW91dCh0LGUpfSxjPWZ1bmN0aW9uKHQpe3JldHVybiBjbGVhclRpbWVvdXQodCl9LGY9ZnVuY3Rpb24odCl7cmV0dXJuIGkodCwwKX07aWYoZSgpKWY9ZnVuY3Rpb24odCl7cmV0dXJuIHByb2Nlc3MubmV4dFRpY2sodCl9O2Vsc2UgaWYocj1uKCkpZj1vKHIpO2Vsc2UgaWYoIWkpe3ZhciBzPXQsYT1zKFwidmVydHhcIik7dT1mdW5jdGlvbih0LGUpe3JldHVybiBhLnNldFRpbWVyKGUsdCl9LGM9YS5jYW5jZWxUaW1lcixmPWEucnVuT25Mb29wfHxhLnJ1bk9uQ29udGV4dH1yZXR1cm57c2V0VGltZXI6dSxjbGVhclRpbWVyOmMsYXNhcDpmfX0pfShcImZ1bmN0aW9uXCI9PXR5cGVvZiB0JiZ0LmFtZD90OmZ1bmN0aW9uKHQpe24uZXhwb3J0cz10KGUpfSl9LHt9XSw2OltmdW5jdGlvbihlLG4sbyl7IWZ1bmN0aW9uKHQpe1widXNlIHN0cmljdFwiO3QoZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQpe3ZhciBuPVwib2JqZWN0XCI9PXR5cGVvZiB0JiZudWxsIT09dCYmKHQuc3RhY2t8fHQubWVzc2FnZSk/dC5zdGFja3x8dC5tZXNzYWdlOmUodCk7cmV0dXJuIHQgaW5zdGFuY2VvZiBFcnJvcj9uOm4rXCIgKFdBUk5JTkc6IG5vbi1FcnJvciB1c2VkKVwifWZ1bmN0aW9uIGUodCl7dmFyIGU9U3RyaW5nKHQpO3JldHVyblwiW29iamVjdCBPYmplY3RdXCI9PT1lJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgSlNPTiYmKGU9bih0LGUpKSxlfWZ1bmN0aW9uIG4odCxlKXt0cnl7cmV0dXJuIEpTT04uc3RyaW5naWZ5KHQpfWNhdGNoKG4pe3JldHVybiBlfX1yZXR1cm57Zm9ybWF0RXJyb3I6dCxmb3JtYXRPYmplY3Q6ZSx0cnlTdHJpbmdpZnk6bn19KX0oXCJmdW5jdGlvblwiPT10eXBlb2YgdCYmdC5hbWQ/dDpmdW5jdGlvbih0KXtuLmV4cG9ydHM9dCgpfSl9LHt9XSw3OltmdW5jdGlvbihlLG4sbyl7IWZ1bmN0aW9uKHQpe1widXNlIHN0cmljdFwiO3QoZnVuY3Rpb24oKXtyZXR1cm4gZnVuY3Rpb24odCl7ZnVuY3Rpb24gZSh0LGUpe3RoaXMuX2hhbmRsZXI9dD09PV8/ZTpuKHQpfWZ1bmN0aW9uIG4odCl7ZnVuY3Rpb24gZSh0KXtyLnJlc29sdmUodCl9ZnVuY3Rpb24gbih0KXtyLnJlamVjdCh0KX1mdW5jdGlvbiBvKHQpe3Iubm90aWZ5KHQpfXZhciByPW5ldyBiO3RyeXt0KGUsbixvKX1jYXRjaChpKXtuKGkpfXJldHVybiByfWZ1bmN0aW9uIG8odCl7cmV0dXJuIFModCk/dDpuZXcgZShfLG5ldyB4KHkodCkpKX1mdW5jdGlvbiByKHQpe3JldHVybiBuZXcgZShfLG5ldyB4KG5ldyBQKHQpKSl9ZnVuY3Rpb24gaSgpe3JldHVybiAkfWZ1bmN0aW9uIHUoKXtyZXR1cm4gbmV3IGUoXyxuZXcgYil9ZnVuY3Rpb24gYyh0LGUpe3ZhciBuPW5ldyBiKHQucmVjZWl2ZXIsdC5qb2luKCkuY29udGV4dCk7cmV0dXJuIG5ldyBlKF8sbil9ZnVuY3Rpb24gZih0KXtyZXR1cm4gYShLLG51bGwsdCl9ZnVuY3Rpb24gcyh0LGUpe3JldHVybiBhKEYsdCxlKX1mdW5jdGlvbiBhKHQsbixvKXtmdW5jdGlvbiByKGUscix1KXt1LnJlc29sdmVkfHxoKG8saSxlLHQobixyLGUpLHUpfWZ1bmN0aW9uIGkodCxlLG4pe2FbdF09ZSwwPT09LS1zJiZuLmJlY29tZShuZXcgcShhKSl9Zm9yKHZhciB1LGM9XCJmdW5jdGlvblwiPT10eXBlb2Ygbj9yOmksZj1uZXcgYixzPW8ubGVuZ3RoPj4+MCxhPW5ldyBBcnJheShzKSxwPTA7cDxvLmxlbmd0aCYmIWYucmVzb2x2ZWQ7KytwKXU9b1twXSx2b2lkIDAhPT11fHxwIGluIG8/aChvLGMscCx1LGYpOi0tcztyZXR1cm4gMD09PXMmJmYuYmVjb21lKG5ldyBxKGEpKSxuZXcgZShfLGYpfWZ1bmN0aW9uIGgodCxlLG4sbyxyKXtpZihVKG8pKXt2YXIgaT1tKG8pLHU9aS5zdGF0ZSgpOzA9PT11P2kuZm9sZChlLG4sdm9pZCAwLHIpOnU+MD9lKG4saS52YWx1ZSxyKTooci5iZWNvbWUoaSkscCh0LG4rMSxpKSl9ZWxzZSBlKG4sbyxyKX1mdW5jdGlvbiBwKHQsZSxuKXtmb3IodmFyIG89ZTtvPHQubGVuZ3RoOysrbylsKHkodFtvXSksbil9ZnVuY3Rpb24gbCh0LGUpe2lmKHQhPT1lKXt2YXIgbj10LnN0YXRlKCk7MD09PW4/dC52aXNpdCh0LHZvaWQgMCx0Ll91bnJlcG9ydCk6MD5uJiZ0Ll91bnJlcG9ydCgpfX1mdW5jdGlvbiBkKHQpe3JldHVyblwib2JqZWN0XCIhPXR5cGVvZiB0fHxudWxsPT09dD9yKG5ldyBUeXBlRXJyb3IoXCJub24taXRlcmFibGUgcGFzc2VkIHRvIHJhY2UoKVwiKSk6MD09PXQubGVuZ3RoP2koKToxPT09dC5sZW5ndGg/byh0WzBdKTp2KHQpfWZ1bmN0aW9uIHYodCl7dmFyIG4sbyxyLGk9bmV3IGI7Zm9yKG49MDtuPHQubGVuZ3RoOysrbilpZihvPXRbbl0sdm9pZCAwIT09b3x8biBpbiB0KXtpZihyPXkobyksMCE9PXIuc3RhdGUoKSl7aS5iZWNvbWUocikscCh0LG4rMSxyKTticmVha31yLnZpc2l0KGksaS5yZXNvbHZlLGkucmVqZWN0KX1yZXR1cm4gbmV3IGUoXyxpKX1mdW5jdGlvbiB5KHQpe3JldHVybiBTKHQpP3QuX2hhbmRsZXIuam9pbigpOlUodCk/aih0KTpuZXcgcSh0KX1mdW5jdGlvbiBtKHQpe3JldHVybiBTKHQpP3QuX2hhbmRsZXIuam9pbigpOmoodCl9ZnVuY3Rpb24gaih0KXt0cnl7dmFyIGU9dC50aGVuO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIGU/bmV3IGcoZSx0KTpuZXcgcSh0KX1jYXRjaChuKXtyZXR1cm4gbmV3IFAobil9fWZ1bmN0aW9uIF8oKXt9ZnVuY3Rpb24gdygpe31mdW5jdGlvbiBiKHQsbil7ZS5jcmVhdGVDb250ZXh0KHRoaXMsbiksdGhpcy5jb25zdW1lcnM9dm9pZCAwLHRoaXMucmVjZWl2ZXI9dCx0aGlzLmhhbmRsZXI9dm9pZCAwLHRoaXMucmVzb2x2ZWQ9ITF9ZnVuY3Rpb24geCh0KXt0aGlzLmhhbmRsZXI9dH1mdW5jdGlvbiBnKHQsZSl7Yi5jYWxsKHRoaXMpLEkuZW5xdWV1ZShuZXcgRSh0LGUsdGhpcykpfWZ1bmN0aW9uIHEodCl7ZS5jcmVhdGVDb250ZXh0KHRoaXMpLHRoaXMudmFsdWU9dH1mdW5jdGlvbiBQKHQpe2UuY3JlYXRlQ29udGV4dCh0aGlzKSx0aGlzLmlkPSsrWSx0aGlzLnZhbHVlPXQsdGhpcy5oYW5kbGVkPSExLHRoaXMucmVwb3J0ZWQ9ITEsdGhpcy5fcmVwb3J0KCl9ZnVuY3Rpb24gUih0LGUpe3RoaXMucmVqZWN0aW9uPXQsdGhpcy5jb250ZXh0PWV9ZnVuY3Rpb24gQyh0KXt0aGlzLnJlamVjdGlvbj10fWZ1bmN0aW9uIE8oKXtyZXR1cm4gbmV3IFAobmV3IFR5cGVFcnJvcihcIlByb21pc2UgY3ljbGVcIikpfWZ1bmN0aW9uIFQodCxlKXt0aGlzLmNvbnRpbnVhdGlvbj10LHRoaXMuaGFuZGxlcj1lfWZ1bmN0aW9uIFEodCxlKXt0aGlzLmhhbmRsZXI9ZSx0aGlzLnZhbHVlPXR9ZnVuY3Rpb24gRSh0LGUsbil7dGhpcy5fdGhlbj10LHRoaXMudGhlbmFibGU9ZSx0aGlzLnJlc29sdmVyPW59ZnVuY3Rpb24gTCh0LGUsbixvLHIpe3RyeXt0LmNhbGwoZSxuLG8scil9Y2F0Y2goaSl7byhpKX19ZnVuY3Rpb24gayh0LGUsbixvKXt0aGlzLmY9dCx0aGlzLno9ZSx0aGlzLmM9bix0aGlzLnRvPW8sdGhpcy5yZXNvbHZlcj1YLHRoaXMucmVjZWl2ZXI9dGhpc31mdW5jdGlvbiBTKHQpe3JldHVybiB0IGluc3RhbmNlb2YgZX1mdW5jdGlvbiBVKHQpe3JldHVybihcIm9iamVjdFwiPT10eXBlb2YgdHx8XCJmdW5jdGlvblwiPT10eXBlb2YgdCkmJm51bGwhPT10fWZ1bmN0aW9uIEgodCxuLG8scil7cmV0dXJuXCJmdW5jdGlvblwiIT10eXBlb2YgdD9yLmJlY29tZShuKTooZS5lbnRlckNvbnRleHQobiksVyh0LG4udmFsdWUsbyxyKSx2b2lkIGUuZXhpdENvbnRleHQoKSl9ZnVuY3Rpb24gTih0LG4sbyxyLGkpe3JldHVyblwiZnVuY3Rpb25cIiE9dHlwZW9mIHQ/aS5iZWNvbWUobyk6KGUuZW50ZXJDb250ZXh0KG8pLHoodCxuLG8udmFsdWUscixpKSx2b2lkIGUuZXhpdENvbnRleHQoKSl9ZnVuY3Rpb24gTSh0LG4sbyxyLGkpe3JldHVyblwiZnVuY3Rpb25cIiE9dHlwZW9mIHQ/aS5ub3RpZnkobik6KGUuZW50ZXJDb250ZXh0KG8pLEEodCxuLHIsaSksdm9pZCBlLmV4aXRDb250ZXh0KCkpfWZ1bmN0aW9uIEYodCxlLG4pe3RyeXtyZXR1cm4gdChlLG4pfWNhdGNoKG8pe3JldHVybiByKG8pfX1mdW5jdGlvbiBXKHQsZSxuLG8pe3RyeXtvLmJlY29tZSh5KHQuY2FsbChuLGUpKSl9Y2F0Y2gocil7by5iZWNvbWUobmV3IFAocikpfX1mdW5jdGlvbiB6KHQsZSxuLG8scil7dHJ5e3QuY2FsbChvLGUsbixyKX1jYXRjaChpKXtyLmJlY29tZShuZXcgUChpKSl9fWZ1bmN0aW9uIEEodCxlLG4sbyl7dHJ5e28ubm90aWZ5KHQuY2FsbChuLGUpKX1jYXRjaChyKXtvLm5vdGlmeShyKX19ZnVuY3Rpb24gSih0LGUpe2UucHJvdG90eXBlPVYodC5wcm90b3R5cGUpLGUucHJvdG90eXBlLmNvbnN0cnVjdG9yPWV9ZnVuY3Rpb24gSyh0LGUpe3JldHVybiBlfWZ1bmN0aW9uIEQoKXt9ZnVuY3Rpb24gRygpe3JldHVyblwidW5kZWZpbmVkXCIhPXR5cGVvZiBwcm9jZXNzJiZudWxsIT09cHJvY2VzcyYmXCJmdW5jdGlvblwiPT10eXBlb2YgcHJvY2Vzcy5lbWl0P2Z1bmN0aW9uKHQsZSl7cmV0dXJuXCJ1bmhhbmRsZWRSZWplY3Rpb25cIj09PXQ/cHJvY2Vzcy5lbWl0KHQsZS52YWx1ZSxlKTpwcm9jZXNzLmVtaXQodCxlKX06XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNlbGYmJlwiZnVuY3Rpb25cIj09dHlwZW9mIEN1c3RvbUV2ZW50P2Z1bmN0aW9uKHQsZSxuKXt2YXIgbz0hMTt0cnl7dmFyIHI9bmV3IG4oXCJ1bmhhbmRsZWRSZWplY3Rpb25cIik7bz1yIGluc3RhbmNlb2Ygbn1jYXRjaChpKXt9cmV0dXJuIG8/ZnVuY3Rpb24odCxvKXt2YXIgcj1uZXcgbih0LHtkZXRhaWw6e3JlYXNvbjpvLnZhbHVlLGtleTpvfSxidWJibGVzOiExLGNhbmNlbGFibGU6ITB9KTtyZXR1cm4hZS5kaXNwYXRjaEV2ZW50KHIpfTp0fShELHNlbGYsQ3VzdG9tRXZlbnQpOkR9dmFyIEk9dC5zY2hlZHVsZXIsQj1HKCksVj1PYmplY3QuY3JlYXRlfHxmdW5jdGlvbih0KXtmdW5jdGlvbiBlKCl7fXJldHVybiBlLnByb3RvdHlwZT10LG5ldyBlfTtlLnJlc29sdmU9byxlLnJlamVjdD1yLGUubmV2ZXI9aSxlLl9kZWZlcj11LGUuX2hhbmRsZXI9eSxlLnByb3RvdHlwZS50aGVuPWZ1bmN0aW9uKHQsZSxuKXt2YXIgbz10aGlzLl9oYW5kbGVyLHI9by5qb2luKCkuc3RhdGUoKTtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiB0JiZyPjB8fFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUmJjA+cilyZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IoXyxvKTt2YXIgaT10aGlzLl9iZWdldCgpLHU9aS5faGFuZGxlcjtyZXR1cm4gby5jaGFpbih1LG8ucmVjZWl2ZXIsdCxlLG4pLGl9LGUucHJvdG90eXBlW1wiY2F0Y2hcIl09ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMudGhlbih2b2lkIDAsdCl9LGUucHJvdG90eXBlLl9iZWdldD1mdW5jdGlvbigpe3JldHVybiBjKHRoaXMuX2hhbmRsZXIsdGhpcy5jb25zdHJ1Y3Rvcil9LGUuYWxsPWYsZS5yYWNlPWQsZS5fdHJhdmVyc2U9cyxlLl92aXNpdFJlbWFpbmluZz1wLF8ucHJvdG90eXBlLndoZW49Xy5wcm90b3R5cGUuYmVjb21lPV8ucHJvdG90eXBlLm5vdGlmeT1fLnByb3RvdHlwZS5mYWlsPV8ucHJvdG90eXBlLl91bnJlcG9ydD1fLnByb3RvdHlwZS5fcmVwb3J0PUQsXy5wcm90b3R5cGUuX3N0YXRlPTAsXy5wcm90b3R5cGUuc3RhdGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fc3RhdGV9LF8ucHJvdG90eXBlLmpvaW49ZnVuY3Rpb24oKXtmb3IodmFyIHQ9dGhpczt2b2lkIDAhPT10LmhhbmRsZXI7KXQ9dC5oYW5kbGVyO3JldHVybiB0fSxfLnByb3RvdHlwZS5jaGFpbj1mdW5jdGlvbih0LGUsbixvLHIpe3RoaXMud2hlbih7cmVzb2x2ZXI6dCxyZWNlaXZlcjplLGZ1bGZpbGxlZDpuLHJlamVjdGVkOm8scHJvZ3Jlc3M6cn0pfSxfLnByb3RvdHlwZS52aXNpdD1mdW5jdGlvbih0LGUsbixvKXt0aGlzLmNoYWluKFgsdCxlLG4sbyl9LF8ucHJvdG90eXBlLmZvbGQ9ZnVuY3Rpb24odCxlLG4sbyl7dGhpcy53aGVuKG5ldyBrKHQsZSxuLG8pKX0sSihfLHcpLHcucHJvdG90eXBlLmJlY29tZT1mdW5jdGlvbih0KXt0LmZhaWwoKX07dmFyIFg9bmV3IHc7SihfLGIpLGIucHJvdG90eXBlLl9zdGF0ZT0wLGIucHJvdG90eXBlLnJlc29sdmU9ZnVuY3Rpb24odCl7dGhpcy5iZWNvbWUoeSh0KSl9LGIucHJvdG90eXBlLnJlamVjdD1mdW5jdGlvbih0KXt0aGlzLnJlc29sdmVkfHx0aGlzLmJlY29tZShuZXcgUCh0KSl9LGIucHJvdG90eXBlLmpvaW49ZnVuY3Rpb24oKXtpZighdGhpcy5yZXNvbHZlZClyZXR1cm4gdGhpcztmb3IodmFyIHQ9dGhpczt2b2lkIDAhPT10LmhhbmRsZXI7KWlmKHQ9dC5oYW5kbGVyLHQ9PT10aGlzKXJldHVybiB0aGlzLmhhbmRsZXI9TygpO3JldHVybiB0fSxiLnByb3RvdHlwZS5ydW49ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmNvbnN1bWVycyxlPXRoaXMuaGFuZGxlcjt0aGlzLmhhbmRsZXI9dGhpcy5oYW5kbGVyLmpvaW4oKSx0aGlzLmNvbnN1bWVycz12b2lkIDA7Zm9yKHZhciBuPTA7bjx0Lmxlbmd0aDsrK24pZS53aGVuKHRbbl0pfSxiLnByb3RvdHlwZS5iZWNvbWU9ZnVuY3Rpb24odCl7dGhpcy5yZXNvbHZlZHx8KHRoaXMucmVzb2x2ZWQ9ITAsdGhpcy5oYW5kbGVyPXQsdm9pZCAwIT09dGhpcy5jb25zdW1lcnMmJkkuZW5xdWV1ZSh0aGlzKSx2b2lkIDAhPT10aGlzLmNvbnRleHQmJnQuX3JlcG9ydCh0aGlzLmNvbnRleHQpKX0sYi5wcm90b3R5cGUud2hlbj1mdW5jdGlvbih0KXt0aGlzLnJlc29sdmVkP0kuZW5xdWV1ZShuZXcgVCh0LHRoaXMuaGFuZGxlcikpOnZvaWQgMD09PXRoaXMuY29uc3VtZXJzP3RoaXMuY29uc3VtZXJzPVt0XTp0aGlzLmNvbnN1bWVycy5wdXNoKHQpfSxiLnByb3RvdHlwZS5ub3RpZnk9ZnVuY3Rpb24odCl7dGhpcy5yZXNvbHZlZHx8SS5lbnF1ZXVlKG5ldyBRKHQsdGhpcykpfSxiLnByb3RvdHlwZS5mYWlsPWZ1bmN0aW9uKHQpe3ZhciBlPVwidW5kZWZpbmVkXCI9PXR5cGVvZiB0P3RoaXMuY29udGV4dDp0O3RoaXMucmVzb2x2ZWQmJnRoaXMuaGFuZGxlci5qb2luKCkuZmFpbChlKX0sYi5wcm90b3R5cGUuX3JlcG9ydD1mdW5jdGlvbih0KXt0aGlzLnJlc29sdmVkJiZ0aGlzLmhhbmRsZXIuam9pbigpLl9yZXBvcnQodCl9LGIucHJvdG90eXBlLl91bnJlcG9ydD1mdW5jdGlvbigpe3RoaXMucmVzb2x2ZWQmJnRoaXMuaGFuZGxlci5qb2luKCkuX3VucmVwb3J0KCl9LEooXyx4KSx4LnByb3RvdHlwZS53aGVuPWZ1bmN0aW9uKHQpe0kuZW5xdWV1ZShuZXcgVCh0LHRoaXMpKX0seC5wcm90b3R5cGUuX3JlcG9ydD1mdW5jdGlvbih0KXt0aGlzLmpvaW4oKS5fcmVwb3J0KHQpfSx4LnByb3RvdHlwZS5fdW5yZXBvcnQ9ZnVuY3Rpb24oKXt0aGlzLmpvaW4oKS5fdW5yZXBvcnQoKX0sSihiLGcpLEooXyxxKSxxLnByb3RvdHlwZS5fc3RhdGU9MSxxLnByb3RvdHlwZS5mb2xkPWZ1bmN0aW9uKHQsZSxuLG8pe04odCxlLHRoaXMsbixvKX0scS5wcm90b3R5cGUud2hlbj1mdW5jdGlvbih0KXtIKHQuZnVsZmlsbGVkLHRoaXMsdC5yZWNlaXZlcix0LnJlc29sdmVyKX07dmFyIFk9MDtKKF8sUCksUC5wcm90b3R5cGUuX3N0YXRlPS0xLFAucHJvdG90eXBlLmZvbGQ9ZnVuY3Rpb24odCxlLG4sbyl7by5iZWNvbWUodGhpcyl9LFAucHJvdG90eXBlLndoZW49ZnVuY3Rpb24odCl7XCJmdW5jdGlvblwiPT10eXBlb2YgdC5yZWplY3RlZCYmdGhpcy5fdW5yZXBvcnQoKSxIKHQucmVqZWN0ZWQsdGhpcyx0LnJlY2VpdmVyLHQucmVzb2x2ZXIpfSxQLnByb3RvdHlwZS5fcmVwb3J0PWZ1bmN0aW9uKHQpe0kuYWZ0ZXJRdWV1ZShuZXcgUih0aGlzLHQpKX0sUC5wcm90b3R5cGUuX3VucmVwb3J0PWZ1bmN0aW9uKCl7dGhpcy5oYW5kbGVkfHwodGhpcy5oYW5kbGVkPSEwLEkuYWZ0ZXJRdWV1ZShuZXcgQyh0aGlzKSkpfSxQLnByb3RvdHlwZS5mYWlsPWZ1bmN0aW9uKHQpe3RoaXMucmVwb3J0ZWQ9ITAsQihcInVuaGFuZGxlZFJlamVjdGlvblwiLHRoaXMpLGUub25GYXRhbFJlamVjdGlvbih0aGlzLHZvaWQgMD09PXQ/dGhpcy5jb250ZXh0OnQpfSxSLnByb3RvdHlwZS5ydW49ZnVuY3Rpb24oKXt0aGlzLnJlamVjdGlvbi5oYW5kbGVkfHx0aGlzLnJlamVjdGlvbi5yZXBvcnRlZHx8KHRoaXMucmVqZWN0aW9uLnJlcG9ydGVkPSEwLEIoXCJ1bmhhbmRsZWRSZWplY3Rpb25cIix0aGlzLnJlamVjdGlvbil8fGUub25Qb3RlbnRpYWxseVVuaGFuZGxlZFJlamVjdGlvbih0aGlzLnJlamVjdGlvbix0aGlzLmNvbnRleHQpKX0sQy5wcm90b3R5cGUucnVuPWZ1bmN0aW9uKCl7dGhpcy5yZWplY3Rpb24ucmVwb3J0ZWQmJihCKFwicmVqZWN0aW9uSGFuZGxlZFwiLHRoaXMucmVqZWN0aW9uKXx8ZS5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZCh0aGlzLnJlamVjdGlvbikpfSxlLmNyZWF0ZUNvbnRleHQ9ZS5lbnRlckNvbnRleHQ9ZS5leGl0Q29udGV4dD1lLm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb249ZS5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZD1lLm9uRmF0YWxSZWplY3Rpb249RDt2YXIgWj1uZXcgXywkPW5ldyBlKF8sWik7cmV0dXJuIFQucHJvdG90eXBlLnJ1bj1mdW5jdGlvbigpe3RoaXMuaGFuZGxlci5qb2luKCkud2hlbih0aGlzLmNvbnRpbnVhdGlvbil9LFEucHJvdG90eXBlLnJ1bj1mdW5jdGlvbigpe3ZhciB0PXRoaXMuaGFuZGxlci5jb25zdW1lcnM7aWYodm9pZCAwIT09dClmb3IodmFyIGUsbj0wO248dC5sZW5ndGg7KytuKWU9dFtuXSxNKGUucHJvZ3Jlc3MsdGhpcy52YWx1ZSx0aGlzLmhhbmRsZXIsZS5yZWNlaXZlcixlLnJlc29sdmVyKX0sRS5wcm90b3R5cGUucnVuPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0KXtvLnJlc29sdmUodCl9ZnVuY3Rpb24gZSh0KXtvLnJlamVjdCh0KX1mdW5jdGlvbiBuKHQpe28ubm90aWZ5KHQpfXZhciBvPXRoaXMucmVzb2x2ZXI7TCh0aGlzLl90aGVuLHRoaXMudGhlbmFibGUsdCxlLG4pfSxrLnByb3RvdHlwZS5mdWxmaWxsZWQ9ZnVuY3Rpb24odCl7dGhpcy5mLmNhbGwodGhpcy5jLHRoaXMueix0LHRoaXMudG8pfSxrLnByb3RvdHlwZS5yZWplY3RlZD1mdW5jdGlvbih0KXt0aGlzLnRvLnJlamVjdCh0KX0say5wcm90b3R5cGUucHJvZ3Jlc3M9ZnVuY3Rpb24odCl7dGhpcy50by5ub3RpZnkodCl9LGV9fSl9KFwiZnVuY3Rpb25cIj09dHlwZW9mIHQmJnQuYW1kP3Q6ZnVuY3Rpb24odCl7bi5leHBvcnRzPXQoKX0pfSx7fV19LHt9LFsxXSkoMSl9KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVByb21pc2UubWluLmpzLm1hcFxuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIG1peGluLCB4V1dXRm9ybVVSTEVuY29kZXIsIG9yaWdpbiwgdXJsUkUsIGFic29sdXRlVXJsUkUsIGZ1bGx5UXVhbGlmaWVkVXJsUkU7XG5cbm1peGluID0gcmVxdWlyZSgnLi91dGlsL21peGluJyk7XG54V1dXRm9ybVVSTEVuY29kZXIgPSByZXF1aXJlKCcuL21pbWUvdHlwZS9hcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKTtcblxudXJsUkUgPSAvKFthLXpdW2EtejAtOVxcK1xcLVxcLl0qOilcXC9cXC8oW15AXStAKT8oKFteOlxcL10rKSg6KFswLTldKykpPyk/KFxcL1tePyNdKik/KFxcP1teI10qKT8oI1xcUyopPy9pO1xuYWJzb2x1dGVVcmxSRSA9IC9eKFthLXpdW2EtejAtOVxcLVxcK1xcLl0qOlxcL1xcL3xcXC8pL2k7XG5mdWxseVF1YWxpZmllZFVybFJFID0gLyhbYS16XVthLXowLTlcXCtcXC1cXC5dKjopXFwvXFwvKFteQF0rQCk/KChbXjpcXC9dKykoOihbMC05XSspKT8pP1xcLy9pO1xuXG4vKipcbiAqIEFwcGx5IHBhcmFtcyB0byB0aGUgdGVtcGxhdGUgdG8gY3JlYXRlIGEgVVJMLlxuICpcbiAqIFBhcmFtZXRlcnMgdGhhdCBhcmUgbm90IGFwcGxpZWQgZGlyZWN0bHkgdG8gdGhlIHRlbXBsYXRlLCBhcmUgYXBwZW5kZWRcbiAqIHRvIHRoZSBVUkwgYXMgcXVlcnkgc3RyaW5nIHBhcmFtZXRlcnMuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRlbXBsYXRlIHRoZSBVUkkgdGVtcGxhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgcGFyYW1ldGVycyB0byBhcHBseSB0byB0aGUgdGVtcGxhdGVcbiAqIEByZXR1cm4ge3N0cmluZ30gdGhlIHJlc3VsdGluZyBVUkxcbiAqL1xuZnVuY3Rpb24gYnVpbGRVcmwodGVtcGxhdGUsIHBhcmFtcykge1xuXHQvLyBpbnRlcm5hbCBidWlsZGVyIHRvIGNvbnZlcnQgdGVtcGxhdGUgd2l0aCBwYXJhbXMuXG5cdHZhciB1cmwsIG5hbWUsIHF1ZXJ5U3RyaW5nUGFyYW1zLCBxdWVyeVN0cmluZywgcmU7XG5cblx0dXJsID0gdGVtcGxhdGU7XG5cdHF1ZXJ5U3RyaW5nUGFyYW1zID0ge307XG5cblx0aWYgKHBhcmFtcykge1xuXHRcdGZvciAobmFtZSBpbiBwYXJhbXMpIHtcblx0XHRcdC8qanNoaW50IGZvcmluOmZhbHNlICovXG5cdFx0XHRyZSA9IG5ldyBSZWdFeHAoJ1xcXFx7JyArIG5hbWUgKyAnXFxcXH0nKTtcblx0XHRcdGlmIChyZS50ZXN0KHVybCkpIHtcblx0XHRcdFx0dXJsID0gdXJsLnJlcGxhY2UocmUsIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNbbmFtZV0pLCAnZycpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHF1ZXJ5U3RyaW5nUGFyYW1zW25hbWVdID0gcGFyYW1zW25hbWVdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHF1ZXJ5U3RyaW5nID0geFdXV0Zvcm1VUkxFbmNvZGVyLndyaXRlKHF1ZXJ5U3RyaW5nUGFyYW1zKTtcblx0XHRpZiAocXVlcnlTdHJpbmcpIHtcblx0XHRcdHVybCArPSB1cmwuaW5kZXhPZignPycpID09PSAtMSA/ICc/JyA6ICcmJztcblx0XHRcdHVybCArPSBxdWVyeVN0cmluZztcblx0XHR9XG5cdH1cblx0cmV0dXJuIHVybDtcbn1cblxuZnVuY3Rpb24gc3RhcnRzV2l0aChzdHIsIHRlc3QpIHtcblx0cmV0dXJuIHN0ci5pbmRleE9mKHRlc3QpID09PSAwO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBVUkwgQnVpbGRlclxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfFVybEJ1aWxkZXJ9IHRlbXBsYXRlIHRoZSBiYXNlIHRlbXBsYXRlIHRvIGJ1aWxkIGZyb20sIG1heSBiZSBhbm90aGVyIFVybEJ1aWxkZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSBiYXNlIHBhcmFtZXRlcnNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBVcmxCdWlsZGVyKHRlbXBsYXRlLCBwYXJhbXMpIHtcblx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFVybEJ1aWxkZXIpKSB7XG5cdFx0Ly8gaW52b2tlIGFzIGEgY29uc3RydWN0b3Jcblx0XHRyZXR1cm4gbmV3IFVybEJ1aWxkZXIodGVtcGxhdGUsIHBhcmFtcyk7XG5cdH1cblxuXHRpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBVcmxCdWlsZGVyKSB7XG5cdFx0dGhpcy5fdGVtcGxhdGUgPSB0ZW1wbGF0ZS50ZW1wbGF0ZTtcblx0XHR0aGlzLl9wYXJhbXMgPSBtaXhpbih7fSwgdGhpcy5fcGFyYW1zLCBwYXJhbXMpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdHRoaXMuX3RlbXBsYXRlID0gKHRlbXBsYXRlIHx8ICcnKS50b1N0cmluZygpO1xuXHRcdHRoaXMuX3BhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblx0fVxufVxuXG5VcmxCdWlsZGVyLnByb3RvdHlwZSA9IHtcblxuXHQvKipcblx0ICogQ3JlYXRlIGEgbmV3IFVybEJ1aWxkZXIgaW5zdGFuY2UgdGhhdCBleHRlbmRzIHRoZSBjdXJyZW50IGJ1aWxkZXIuXG5cdCAqIFRoZSBjdXJyZW50IGJ1aWxkZXIgaXMgdW5tb2RpZmllZC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IFt0ZW1wbGF0ZV0gVVJMIHRlbXBsYXRlIHRvIGFwcGVuZCB0byB0aGUgY3VycmVudCB0ZW1wbGF0ZVxuXHQgKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gcGFyYW1zIHRvIGNvbWJpbmUgd2l0aCBjdXJyZW50IHBhcmFtcy4gIE5ldyBwYXJhbXMgb3ZlcnJpZGUgZXhpc3RpbmcgcGFyYW1zXG5cdCAqIEByZXR1cm4ge1VybEJ1aWxkZXJ9IHRoZSBuZXcgYnVpbGRlclxuXHQgKi9cblx0YXBwZW5kOiBmdW5jdGlvbiAodGVtcGxhdGUsICBwYXJhbXMpIHtcblx0XHQvLyBUT0RPIGNvbnNpZGVyIHF1ZXJ5IHN0cmluZ3MgYW5kIGZyYWdtZW50c1xuXHRcdHJldHVybiBuZXcgVXJsQnVpbGRlcih0aGlzLl90ZW1wbGF0ZSArIHRlbXBsYXRlLCBtaXhpbih7fSwgdGhpcy5fcGFyYW1zLCBwYXJhbXMpKTtcblx0fSxcblxuXHQvKipcblx0ICogQ3JlYXRlIGEgbmV3IFVybEJ1aWxkZXIgd2l0aCBhIGZ1bGx5IHF1YWxpZmllZCBVUkwgYmFzZWQgb24gdGhlXG5cdCAqIHdpbmRvdydzIGxvY2F0aW9uIG9yIGJhc2UgaHJlZiBhbmQgdGhlIGN1cnJlbnQgdGVtcGxhdGVzIHJlbGF0aXZlIFVSTC5cblx0ICpcblx0ICogUGF0aCB2YXJpYWJsZXMgYXJlIHByZXNlcnZlZC5cblx0ICpcblx0ICogKkJyb3dzZXIgb25seSpcblx0ICpcblx0ICogQHJldHVybiB7VXJsQnVpbGRlcn0gdGhlIGZ1bGx5IHF1YWxpZmllZCBVUkwgdGVtcGxhdGVcblx0ICovXG5cdGZ1bGx5UXVhbGlmeTogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0eXBlb2YgbG9jYXRpb24gPT09ICd1bmRlZmluZWQnKSB7IHJldHVybiB0aGlzOyB9XG5cdFx0aWYgKHRoaXMuaXNGdWxseVF1YWxpZmllZCgpKSB7IHJldHVybiB0aGlzOyB9XG5cblx0XHR2YXIgdGVtcGxhdGUgPSB0aGlzLl90ZW1wbGF0ZTtcblxuXHRcdGlmIChzdGFydHNXaXRoKHRlbXBsYXRlLCAnLy8nKSkge1xuXHRcdFx0dGVtcGxhdGUgPSBvcmlnaW4ucHJvdG9jb2wgKyB0ZW1wbGF0ZTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoc3RhcnRzV2l0aCh0ZW1wbGF0ZSwgJy8nKSkge1xuXHRcdFx0dGVtcGxhdGUgPSBvcmlnaW4ub3JpZ2luICsgdGVtcGxhdGU7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKCF0aGlzLmlzQWJzb2x1dGUoKSkge1xuXHRcdFx0dGVtcGxhdGUgPSBvcmlnaW4ub3JpZ2luICsgb3JpZ2luLnBhdGhuYW1lLnN1YnN0cmluZygwLCBvcmlnaW4ucGF0aG5hbWUubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuXHRcdH1cblxuXHRcdGlmICh0ZW1wbGF0ZS5pbmRleE9mKCcvJywgOCkgPT09IC0xKSB7XG5cdFx0XHQvLyBkZWZhdWx0IHRoZSBwYXRobmFtZSB0byAnLydcblx0XHRcdHRlbXBsYXRlID0gdGVtcGxhdGUgKyAnLyc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ldyBVcmxCdWlsZGVyKHRlbXBsYXRlLCB0aGlzLl9wYXJhbXMpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBUcnVlIGlmIHRoZSBVUkwgaXMgYWJzb2x1dGVcblx0ICpcblx0ICogQHJldHVybiB7Ym9vbGVhbn1cblx0ICovXG5cdGlzQWJzb2x1dGU6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gYWJzb2x1dGVVcmxSRS50ZXN0KHRoaXMuYnVpbGQoKSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFRydWUgaWYgdGhlIFVSTCBpcyBmdWxseSBxdWFsaWZpZWRcblx0ICpcblx0ICogQHJldHVybiB7Ym9vbGVhbn1cblx0ICovXG5cdGlzRnVsbHlRdWFsaWZpZWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gZnVsbHlRdWFsaWZpZWRVcmxSRS50ZXN0KHRoaXMuYnVpbGQoKSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFRydWUgaWYgdGhlIFVSTCBpcyBjcm9zcyBvcmlnaW4uIFRoZSBwcm90b2NvbCwgaG9zdCBhbmQgcG9ydCBtdXN0IG5vdCBiZVxuXHQgKiB0aGUgc2FtZSBpbiBvcmRlciB0byBiZSBjcm9zcyBvcmlnaW4sXG5cdCAqXG5cdCAqIEByZXR1cm4ge2Jvb2xlYW59XG5cdCAqL1xuXHRpc0Nyb3NzT3JpZ2luOiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCFvcmlnaW4pIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHR2YXIgdXJsID0gdGhpcy5wYXJ0cygpO1xuXHRcdHJldHVybiB1cmwucHJvdG9jb2wgIT09IG9yaWdpbi5wcm90b2NvbCB8fFxuXHRcdCAgICAgICB1cmwuaG9zdG5hbWUgIT09IG9yaWdpbi5ob3N0bmFtZSB8fFxuXHRcdCAgICAgICB1cmwucG9ydCAhPT0gb3JpZ2luLnBvcnQ7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNwbGl0IGEgVVJMIGludG8gaXRzIGNvbnNpdHVlbnQgcGFydHMgZm9sbG93aW5nIHRoZSBuYW1pbmcgY29udmVudGlvbiBvZlxuXHQgKiAnd2luZG93LmxvY2F0aW9uJy4gT25lIGRpZmZlcmVuY2UgaXMgdGhhdCB0aGUgcG9ydCB3aWxsIGNvbnRhaW4gdGhlXG5cdCAqIHByb3RvY29sIGRlZmF1bHQgaWYgbm90IHNwZWNpZmllZC5cblx0ICpcblx0ICogQHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL0RPTS93aW5kb3cubG9jYXRpb25cblx0ICpcblx0ICogQHJldHVybnMge09iamVjdH0gYSAnd2luZG93LmxvY2F0aW9uJy1saWtlIG9iamVjdFxuXHQgKi9cblx0cGFydHM6IGZ1bmN0aW9uICgpIHtcblx0XHQvKmpzaGludCBtYXhjb21wbGV4aXR5OjIwICovXG5cdFx0dmFyIHVybCwgcGFydHM7XG5cdFx0dXJsID0gdGhpcy5mdWxseVF1YWxpZnkoKS5idWlsZCgpLm1hdGNoKHVybFJFKTtcblx0XHRwYXJ0cyA9IHtcblx0XHRcdGhyZWY6IHVybFswXSxcblx0XHRcdHByb3RvY29sOiB1cmxbMV0sXG5cdFx0XHRob3N0OiB1cmxbM10gfHwgJycsXG5cdFx0XHRob3N0bmFtZTogdXJsWzRdIHx8ICcnLFxuXHRcdFx0cG9ydDogdXJsWzZdLFxuXHRcdFx0cGF0aG5hbWU6IHVybFs3XSB8fCAnJyxcblx0XHRcdHNlYXJjaDogdXJsWzhdIHx8ICcnLFxuXHRcdFx0aGFzaDogdXJsWzldIHx8ICcnXG5cdFx0fTtcblx0XHRwYXJ0cy5vcmlnaW4gPSBwYXJ0cy5wcm90b2NvbCArICcvLycgKyBwYXJ0cy5ob3N0O1xuXHRcdHBhcnRzLnBvcnQgPSBwYXJ0cy5wb3J0IHx8IChwYXJ0cy5wcm90b2NvbCA9PT0gJ2h0dHBzOicgPyAnNDQzJyA6IHBhcnRzLnByb3RvY29sID09PSAnaHR0cDonID8gJzgwJyA6ICcnKTtcblx0XHRyZXR1cm4gcGFydHM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV4cGFuZCB0aGUgdGVtcGxhdGUgcmVwbGFjaW5nIHBhdGggdmFyaWFibGVzIHdpdGggcGFyYW1ldGVyc1xuXHQgKlxuXHQgKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gcGFyYW1zIHRvIGNvbWJpbmUgd2l0aCBjdXJyZW50IHBhcmFtcy4gIE5ldyBwYXJhbXMgb3ZlcnJpZGUgZXhpc3RpbmcgcGFyYW1zXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gdGhlIGV4cGFuZGVkIFVSTFxuXHQgKi9cblx0YnVpbGQ6IGZ1bmN0aW9uIChwYXJhbXMpIHtcblx0XHRyZXR1cm4gYnVpbGRVcmwodGhpcy5fdGVtcGxhdGUsIG1peGluKHt9LCB0aGlzLl9wYXJhbXMsIHBhcmFtcykpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBAc2VlIGJ1aWxkXG5cdCAqL1xuXHR0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLmJ1aWxkKCk7XG5cdH1cblxufTtcblxub3JpZ2luID0gdHlwZW9mIGxvY2F0aW9uICE9PSAndW5kZWZpbmVkJyA/IG5ldyBVcmxCdWlsZGVyKGxvY2F0aW9uLmhyZWYpLnBhcnRzKCkgOiB2b2lkIDA7XG5cbm1vZHVsZS5leHBvcnRzID0gVXJsQnVpbGRlcjtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNC0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciByZXN0ID0gcmVxdWlyZSgnLi9jbGllbnQvZGVmYXVsdCcpLFxuICAgIGJyb3dzZXIgPSByZXF1aXJlKCcuL2NsaWVudC94aHInKTtcblxucmVzdC5zZXRQbGF0Zm9ybURlZmF1bHRDbGllbnQoYnJvd3Nlcik7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVzdDtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNC0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQWRkIGNvbW1vbiBoZWxwZXIgbWV0aG9kcyB0byBhIGNsaWVudCBpbXBsXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gaW1wbCB0aGUgY2xpZW50IGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0ge0NsaWVudH0gW3RhcmdldF0gdGFyZ2V0IG9mIHRoaXMgY2xpZW50LCB1c2VkIHdoZW4gd3JhcHBpbmcgb3RoZXIgY2xpZW50c1xuICogQHJldHVybnMge0NsaWVudH0gdGhlIGNsaWVudCBpbXBsIHdpdGggYWRkaXRpb25hbCBtZXRob2RzXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2xpZW50KGltcGwsIHRhcmdldCkge1xuXG5cdGlmICh0YXJnZXQpIHtcblxuXHRcdC8qKlxuXHRcdCAqIEByZXR1cm5zIHtDbGllbnR9IHRoZSB0YXJnZXQgY2xpZW50XG5cdFx0ICovXG5cdFx0aW1wbC5za2lwID0gZnVuY3Rpb24gc2tpcCgpIHtcblx0XHRcdHJldHVybiB0YXJnZXQ7XG5cdFx0fTtcblxuXHR9XG5cblx0LyoqXG5cdCAqIEFsbG93IGEgY2xpZW50IHRvIGVhc2lseSBiZSB3cmFwcGVkIGJ5IGFuIGludGVyY2VwdG9yXG5cdCAqXG5cdCAqIEBwYXJhbSB7SW50ZXJjZXB0b3J9IGludGVyY2VwdG9yIHRoZSBpbnRlcmNlcHRvciB0byB3cmFwIHRoaXMgY2xpZW50IHdpdGhcblx0ICogQHBhcmFtIFtjb25maWddIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBpbnRlcmNlcHRvclxuXHQgKiBAcmV0dXJucyB7Q2xpZW50fSB0aGUgbmV3bHkgd3JhcHBlZCBjbGllbnRcblx0ICovXG5cdGltcGwud3JhcCA9IGZ1bmN0aW9uIHdyYXAoaW50ZXJjZXB0b3IsIGNvbmZpZykge1xuXHRcdHJldHVybiBpbnRlcmNlcHRvcihpbXBsLCBjb25maWcpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBAZGVwcmVjYXRlZFxuXHQgKi9cblx0aW1wbC5jaGFpbiA9IGZ1bmN0aW9uIGNoYWluKCkge1xuXHRcdGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdyZXN0LmpzOiBjbGllbnQuY2hhaW4oKSBpcyBkZXByZWNhdGVkLCB1c2UgY2xpZW50LndyYXAoKSBpbnN0ZWFkJyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGltcGwud3JhcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdHJldHVybiBpbXBsO1xuXG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE0LTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBQbGFpbiBKUyBPYmplY3QgY29udGFpbmluZyBwcm9wZXJ0aWVzIHRoYXQgcmVwcmVzZW50IGFuIEhUVFAgcmVxdWVzdC5cbiAqXG4gKiBEZXBlbmRpbmcgb24gdGhlIGNhcGFiaWxpdGllcyBvZiB0aGUgdW5kZXJseWluZyBjbGllbnQsIGEgcmVxdWVzdFxuICogbWF5IGJlIGNhbmNlbGFibGUuIElmIGEgcmVxdWVzdCBtYXkgYmUgY2FuY2VsZWQsIHRoZSBjbGllbnQgd2lsbCBhZGRcbiAqIGEgY2FuY2VsZWQgZmxhZyBhbmQgY2FuY2VsIGZ1bmN0aW9uIHRvIHRoZSByZXF1ZXN0IG9iamVjdC4gQ2FuY2VsaW5nXG4gKiB0aGUgcmVxdWVzdCB3aWxsIHB1dCB0aGUgcmVzcG9uc2UgaW50byBhbiBlcnJvciBzdGF0ZS5cbiAqXG4gKiBAZmllbGQge3N0cmluZ30gW21ldGhvZD0nR0VUJ10gSFRUUCBtZXRob2QsIGNvbW1vbmx5IEdFVCwgUE9TVCwgUFVULCBERUxFVEUgb3IgSEVBRFxuICogQGZpZWxkIHtzdHJpbmd8VXJsQnVpbGRlcn0gW3BhdGg9JyddIHBhdGggdGVtcGxhdGUgd2l0aCBvcHRpb25hbCBwYXRoIHZhcmlhYmxlc1xuICogQGZpZWxkIHtPYmplY3R9IFtwYXJhbXNdIHBhcmFtZXRlcnMgZm9yIHRoZSBwYXRoIHRlbXBsYXRlIGFuZCBxdWVyeSBzdHJpbmdcbiAqIEBmaWVsZCB7T2JqZWN0fSBbaGVhZGVyc10gY3VzdG9tIEhUVFAgaGVhZGVycyB0byBzZW5kLCBpbiBhZGRpdGlvbiB0byB0aGUgY2xpZW50cyBkZWZhdWx0IGhlYWRlcnNcbiAqIEBmaWVsZCBbZW50aXR5XSB0aGUgSFRUUCBlbnRpdHksIGNvbW1vbiBmb3IgUE9TVCBvciBQVVQgcmVxdWVzdHNcbiAqIEBmaWVsZCB7Ym9vbGVhbn0gW2NhbmNlbGVkXSB0cnVlIGlmIHRoZSByZXF1ZXN0IGhhcyBiZWVuIGNhbmNlbGVkLCBzZXQgYnkgdGhlIGNsaWVudFxuICogQGZpZWxkIHtGdW5jdGlvbn0gW2NhbmNlbF0gY2FuY2VscyB0aGUgcmVxdWVzdCBpZiBpbnZva2VkLCBwcm92aWRlZCBieSB0aGUgY2xpZW50XG4gKiBAZmllbGQge0NsaWVudH0gW29yaWdpbmF0b3JdIHRoZSBjbGllbnQgdGhhdCBmaXJzdCBoYW5kbGVkIHRoaXMgcmVxdWVzdCwgcHJvdmlkZWQgYnkgdGhlIGludGVyY2VwdG9yXG4gKlxuICogQGNsYXNzIFJlcXVlc3RcbiAqL1xuXG4vKipcbiAqIFBsYWluIEpTIE9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCByZXByZXNlbnQgYW4gSFRUUCByZXNwb25zZVxuICpcbiAqIEBmaWVsZCB7T2JqZWN0fSBbcmVxdWVzdF0gdGhlIHJlcXVlc3Qgb2JqZWN0IGFzIHJlY2VpdmVkIGJ5IHRoZSByb290IGNsaWVudFxuICogQGZpZWxkIHtPYmplY3R9IFtyYXddIHRoZSB1bmRlcmx5aW5nIHJlcXVlc3Qgb2JqZWN0LCBsaWtlIFhtbEh0dHBSZXF1ZXN0IGluIGEgYnJvd3NlclxuICogQGZpZWxkIHtudW1iZXJ9IFtzdGF0dXMuY29kZV0gc3RhdHVzIGNvZGUgb2YgdGhlIHJlc3BvbnNlIChpLmUuIDIwMCwgNDA0KVxuICogQGZpZWxkIHtzdHJpbmd9IFtzdGF0dXMudGV4dF0gc3RhdHVzIHBocmFzZSBvZiB0aGUgcmVzcG9uc2VcbiAqIEBmaWVsZCB7T2JqZWN0XSBbaGVhZGVyc10gcmVzcG9uc2UgaGVhZGVycyBoYXNoIG9mIG5vcm1hbGl6ZWQgbmFtZSwgdmFsdWUgcGFpcnNcbiAqIEBmaWVsZCBbZW50aXR5XSB0aGUgcmVzcG9uc2UgYm9keVxuICpcbiAqIEBjbGFzcyBSZXNwb25zZVxuICovXG5cbi8qKlxuICogSFRUUCBjbGllbnQgcGFydGljdWxhcmx5IHN1aXRlZCBmb3IgUkVTVGZ1bCBvcGVyYXRpb25zLlxuICpcbiAqIEBmaWVsZCB7ZnVuY3Rpb259IHdyYXAgd3JhcHMgdGhpcyBjbGllbnQgd2l0aCBhIG5ldyBpbnRlcmNlcHRvciByZXR1cm5pbmcgdGhlIHdyYXBwZWQgY2xpZW50XG4gKlxuICogQHBhcmFtIHtSZXF1ZXN0fSB0aGUgSFRUUCByZXF1ZXN0XG4gKiBAcmV0dXJucyB7UmVzcG9uc2VQcm9taXNlPFJlc3BvbnNlPn0gYSBwcm9taXNlIHRoZSByZXNvbHZlcyB0byB0aGUgSFRUUCByZXNwb25zZVxuICpcbiAqIEBjbGFzcyBDbGllbnRcbiAqL1xuXG4gLyoqXG4gICogRXh0ZW5kZWQgd2hlbi5qcyBQcm9taXNlcy9BKyBwcm9taXNlIHdpdGggSFRUUCBzcGVjaWZpYyBoZWxwZXJzXG4gICpxXG4gICogQG1ldGhvZCBlbnRpdHkgcHJvbWlzZSBmb3IgdGhlIEhUVFAgZW50aXR5XG4gICogQG1ldGhvZCBzdGF0dXMgcHJvbWlzZSBmb3IgdGhlIEhUVFAgc3RhdHVzIGNvZGVcbiAgKiBAbWV0aG9kIGhlYWRlcnMgcHJvbWlzZSBmb3IgdGhlIEhUVFAgcmVzcG9uc2UgaGVhZGVyc1xuICAqIEBtZXRob2QgaGVhZGVyIHByb21pc2UgZm9yIGEgc3BlY2lmaWMgSFRUUCByZXNwb25zZSBoZWFkZXJcbiAgKlxuICAqIEBjbGFzcyBSZXNwb25zZVByb21pc2VcbiAgKiBAZXh0ZW5kcyBQcm9taXNlXG4gICovXG5cbnZhciBjbGllbnQsIHRhcmdldCwgcGxhdGZvcm1EZWZhdWx0O1xuXG5jbGllbnQgPSByZXF1aXJlKCcuLi9jbGllbnQnKTtcblxuaWYgKHR5cGVvZiBQcm9taXNlICE9PSAnZnVuY3Rpb24nICYmIGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIHtcblx0Y29uc29sZS5sb2coJ0FuIEVTNiBQcm9taXNlIGltcGxlbWVudGF0aW9uIGlzIHJlcXVpcmVkIHRvIHVzZSByZXN0LmpzLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2N1am9qcy93aGVuL2Jsb2IvbWFzdGVyL2RvY3MvZXM2LXByb21pc2Utc2hpbS5tZCBmb3IgdXNpbmcgd2hlbi5qcyBhcyBhIFByb21pc2UgcG9seWZpbGwuJyk7XG59XG5cbi8qKlxuICogTWFrZSBhIHJlcXVlc3Qgd2l0aCB0aGUgZGVmYXVsdCBjbGllbnRcbiAqIEBwYXJhbSB7UmVxdWVzdH0gdGhlIEhUVFAgcmVxdWVzdFxuICogQHJldHVybnMge1Byb21pc2U8UmVzcG9uc2U+fSBhIHByb21pc2UgdGhlIHJlc29sdmVzIHRvIHRoZSBIVFRQIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRDbGllbnQoKSB7XG5cdHJldHVybiB0YXJnZXQuYXBwbHkodm9pZCAwLCBhcmd1bWVudHMpO1xufVxuXG4vKipcbiAqIENoYW5nZSB0aGUgZGVmYXVsdCBjbGllbnRcbiAqIEBwYXJhbSB7Q2xpZW50fSBjbGllbnQgdGhlIG5ldyBkZWZhdWx0IGNsaWVudFxuICovXG5kZWZhdWx0Q2xpZW50LnNldERlZmF1bHRDbGllbnQgPSBmdW5jdGlvbiBzZXREZWZhdWx0Q2xpZW50KGNsaWVudCkge1xuXHR0YXJnZXQgPSBjbGllbnQ7XG59O1xuXG4vKipcbiAqIE9idGFpbiBhIGRpcmVjdCByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgZGVmYXVsdCBjbGllbnRcbiAqIEByZXR1cm5zIHtDbGllbnR9IHRoZSBkZWZhdWx0IGNsaWVudFxuICovXG5kZWZhdWx0Q2xpZW50LmdldERlZmF1bHRDbGllbnQgPSBmdW5jdGlvbiBnZXREZWZhdWx0Q2xpZW50KCkge1xuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxuLyoqXG4gKiBSZXNldCB0aGUgZGVmYXVsdCBjbGllbnQgdG8gdGhlIHBsYXRmb3JtIGRlZmF1bHRcbiAqL1xuZGVmYXVsdENsaWVudC5yZXNldERlZmF1bHRDbGllbnQgPSBmdW5jdGlvbiByZXNldERlZmF1bHRDbGllbnQoKSB7XG5cdHRhcmdldCA9IHBsYXRmb3JtRGVmYXVsdDtcbn07XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuZGVmYXVsdENsaWVudC5zZXRQbGF0Zm9ybURlZmF1bHRDbGllbnQgPSBmdW5jdGlvbiBzZXRQbGF0Zm9ybURlZmF1bHRDbGllbnQoY2xpZW50KSB7XG5cdGlmIChwbGF0Zm9ybURlZmF1bHQpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byByZWRlZmluZSBwbGF0Zm9ybURlZmF1bHRDbGllbnQnKTtcblx0fVxuXHR0YXJnZXQgPSBwbGF0Zm9ybURlZmF1bHQgPSBjbGllbnQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsaWVudChkZWZhdWx0Q2xpZW50KTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBub3JtYWxpemVIZWFkZXJOYW1lLCByZXNwb25zZVByb21pc2UsIGNsaWVudCwgaGVhZGVyU3BsaXRSRTtcblxubm9ybWFsaXplSGVhZGVyTmFtZSA9IHJlcXVpcmUoJy4uL3V0aWwvbm9ybWFsaXplSGVhZGVyTmFtZScpO1xucmVzcG9uc2VQcm9taXNlID0gcmVxdWlyZSgnLi4vdXRpbC9yZXNwb25zZVByb21pc2UnKTtcbmNsaWVudCA9IHJlcXVpcmUoJy4uL2NsaWVudCcpO1xuXG4vLyBhY2NvcmRpbmcgdG8gdGhlIHNwZWMsIHRoZSBsaW5lIGJyZWFrIGlzICdcXHJcXG4nLCBidXQgZG9lc24ndCBob2xkIHRydWUgaW4gcHJhY3RpY2VcbmhlYWRlclNwbGl0UkUgPSAvW1xccnxcXG5dKy87XG5cbmZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXcpIHtcblx0Ly8gTm90ZTogU2V0LUNvb2tpZSB3aWxsIGJlIHJlbW92ZWQgYnkgdGhlIGJyb3dzZXJcblx0dmFyIGhlYWRlcnMgPSB7fTtcblxuXHRpZiAoIXJhdykgeyByZXR1cm4gaGVhZGVyczsgfVxuXG5cdHJhdy50cmltKCkuc3BsaXQoaGVhZGVyU3BsaXRSRSkuZm9yRWFjaChmdW5jdGlvbiAoaGVhZGVyKSB7XG5cdFx0dmFyIGJvdW5kYXJ5LCBuYW1lLCB2YWx1ZTtcblx0XHRib3VuZGFyeSA9IGhlYWRlci5pbmRleE9mKCc6Jyk7XG5cdFx0bmFtZSA9IG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVyLnN1YnN0cmluZygwLCBib3VuZGFyeSkudHJpbSgpKTtcblx0XHR2YWx1ZSA9IGhlYWRlci5zdWJzdHJpbmcoYm91bmRhcnkgKyAxKS50cmltKCk7XG5cdFx0aWYgKGhlYWRlcnNbbmFtZV0pIHtcblx0XHRcdGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnNbbmFtZV0pKSB7XG5cdFx0XHRcdC8vIGFkZCB0byBhbiBleGlzdGluZyBhcnJheVxuXHRcdFx0XHRoZWFkZXJzW25hbWVdLnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdC8vIGNvbnZlcnQgc2luZ2xlIHZhbHVlIHRvIGFycmF5XG5cdFx0XHRcdGhlYWRlcnNbbmFtZV0gPSBbaGVhZGVyc1tuYW1lXSwgdmFsdWVdO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdC8vIG5ldywgc2luZ2xlIHZhbHVlXG5cdFx0XHRoZWFkZXJzW25hbWVdID0gdmFsdWU7XG5cdFx0fVxuXHR9KTtcblxuXHRyZXR1cm4gaGVhZGVycztcbn1cblxuZnVuY3Rpb24gc2FmZU1peGluKHRhcmdldCwgc291cmNlKSB7XG5cdE9iamVjdC5rZXlzKHNvdXJjZSB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuXHRcdC8vIG1ha2Ugc3VyZSB0aGUgcHJvcGVydHkgYWxyZWFkeSBleGlzdHMgYXNcblx0XHQvLyBJRSA2IHdpbGwgYmxvdyB1cCBpZiB3ZSBhZGQgYSBuZXcgcHJvcFxuXHRcdGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkocHJvcCkgJiYgcHJvcCBpbiB0YXJnZXQpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdC8vIGlnbm9yZSwgZXhwZWN0ZWQgZm9yIHNvbWUgcHJvcGVydGllcyBhdCBzb21lIHBvaW50cyBpbiB0aGUgcmVxdWVzdCBsaWZlY3ljbGVcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cdHJldHVybiB0YXJnZXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2xpZW50KGZ1bmN0aW9uIHhocihyZXF1ZXN0KSB7XG5cdHJldHVybiByZXNwb25zZVByb21pc2UucHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0Lypqc2hpbnQgbWF4Y29tcGxleGl0eToyMCAqL1xuXG5cdFx0dmFyIGNsaWVudCwgbWV0aG9kLCB1cmwsIGhlYWRlcnMsIGVudGl0eSwgaGVhZGVyTmFtZSwgcmVzcG9uc2UsIFhIUjtcblxuXHRcdHJlcXVlc3QgPSB0eXBlb2YgcmVxdWVzdCA9PT0gJ3N0cmluZycgPyB7IHBhdGg6IHJlcXVlc3QgfSA6IHJlcXVlc3QgfHwge307XG5cdFx0cmVzcG9uc2UgPSB7IHJlcXVlc3Q6IHJlcXVlc3QgfTtcblxuXHRcdGlmIChyZXF1ZXN0LmNhbmNlbGVkKSB7XG5cdFx0XHRyZXNwb25zZS5lcnJvciA9ICdwcmVjYW5jZWxlZCc7XG5cdFx0XHRyZWplY3QocmVzcG9uc2UpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdFhIUiA9IHJlcXVlc3QuZW5naW5lIHx8IFhNTEh0dHBSZXF1ZXN0O1xuXHRcdGlmICghWEhSKSB7XG5cdFx0XHRyZWplY3QoeyByZXF1ZXN0OiByZXF1ZXN0LCBlcnJvcjogJ3hoci1ub3QtYXZhaWxhYmxlJyB9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlbnRpdHkgPSByZXF1ZXN0LmVudGl0eTtcblx0XHRyZXF1ZXN0Lm1ldGhvZCA9IHJlcXVlc3QubWV0aG9kIHx8IChlbnRpdHkgPyAnUE9TVCcgOiAnR0VUJyk7XG5cdFx0bWV0aG9kID0gcmVxdWVzdC5tZXRob2Q7XG5cdFx0dXJsID0gcmVzcG9uc2UudXJsID0gcmVxdWVzdC5wYXRoIHx8ICcnO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNsaWVudCA9IHJlc3BvbnNlLnJhdyA9IG5ldyBYSFIoKTtcblxuXHRcdFx0Ly8gbWl4aW4gZXh0cmEgcmVxdWVzdCBwcm9wZXJ0aWVzIGJlZm9yZSBhbmQgYWZ0ZXIgb3BlbmluZyB0aGUgcmVxdWVzdCBhcyBzb21lIHByb3BlcnRpZXMgcmVxdWlyZSBiZWluZyBzZXQgYXQgZGlmZmVyZW50IHBoYXNlcyBvZiB0aGUgcmVxdWVzdFxuXHRcdFx0c2FmZU1peGluKGNsaWVudCwgcmVxdWVzdC5taXhpbik7XG5cdFx0XHRjbGllbnQub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG5cdFx0XHRzYWZlTWl4aW4oY2xpZW50LCByZXF1ZXN0Lm1peGluKTtcblxuXHRcdFx0aGVhZGVycyA9IHJlcXVlc3QuaGVhZGVycztcblx0XHRcdGZvciAoaGVhZGVyTmFtZSBpbiBoZWFkZXJzKSB7XG5cdFx0XHRcdC8qanNoaW50IGZvcmluOmZhbHNlICovXG5cdFx0XHRcdGlmIChoZWFkZXJOYW1lID09PSAnQ29udGVudC1UeXBlJyAmJiBoZWFkZXJzW2hlYWRlck5hbWVdID09PSAnbXVsdGlwYXJ0L2Zvcm0tZGF0YScpIHtcblx0XHRcdFx0XHQvLyBYTUxIdHRwUmVxdWVzdCBnZW5lcmF0ZXMgaXRzIG93biBDb250ZW50LVR5cGUgaGVhZGVyIHdpdGggdGhlXG5cdFx0XHRcdFx0Ly8gYXBwcm9wcmlhdGUgbXVsdGlwYXJ0IGJvdW5kYXJ5IHdoZW4gc2VuZGluZyBtdWx0aXBhcnQvZm9ybS1kYXRhLlxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2xpZW50LnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyTmFtZSwgaGVhZGVyc1toZWFkZXJOYW1lXSk7XG5cdFx0XHR9XG5cblx0XHRcdHJlcXVlc3QuY2FuY2VsZWQgPSBmYWxzZTtcblx0XHRcdHJlcXVlc3QuY2FuY2VsID0gZnVuY3Rpb24gY2FuY2VsKCkge1xuXHRcdFx0XHRyZXF1ZXN0LmNhbmNlbGVkID0gdHJ1ZTtcblx0XHRcdFx0Y2xpZW50LmFib3J0KCk7XG5cdFx0XHRcdHJlamVjdChyZXNwb25zZSk7XG5cdFx0XHR9O1xuXG5cdFx0XHRjbGllbnQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKC8qIGUgKi8pIHtcblx0XHRcdFx0aWYgKHJlcXVlc3QuY2FuY2VsZWQpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdGlmIChjbGllbnQucmVhZHlTdGF0ZSA9PT0gKFhIUi5ET05FIHx8IDQpKSB7XG5cdFx0XHRcdFx0cmVzcG9uc2Uuc3RhdHVzID0ge1xuXHRcdFx0XHRcdFx0Y29kZTogY2xpZW50LnN0YXR1cyxcblx0XHRcdFx0XHRcdHRleHQ6IGNsaWVudC5zdGF0dXNUZXh0XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRyZXNwb25zZS5oZWFkZXJzID0gcGFyc2VIZWFkZXJzKGNsaWVudC5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSk7XG5cdFx0XHRcdFx0cmVzcG9uc2UuZW50aXR5ID0gY2xpZW50LnJlc3BvbnNlVGV4dDtcblxuXHRcdFx0XHRcdC8vICMxMjUgLS0gU29tZXRpbWVzIElFOC05IHVzZXMgMTIyMyBpbnN0ZWFkIG9mIDIwNFxuXHRcdFx0XHRcdC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTAwNDY5NzIvbXNpZS1yZXR1cm5zLXN0YXR1cy1jb2RlLW9mLTEyMjMtZm9yLWFqYXgtcmVxdWVzdFxuXHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXMuY29kZSA9PT0gMTIyMykge1xuXHRcdFx0XHRcdFx0cmVzcG9uc2Uuc3RhdHVzLmNvZGUgPSAyMDQ7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1cy5jb2RlID4gMCkge1xuXHRcdFx0XHRcdFx0Ly8gY2hlY2sgc3RhdHVzIGNvZGUgYXMgcmVhZHlzdGF0ZWNoYW5nZSBmaXJlcyBiZWZvcmUgZXJyb3IgZXZlbnRcblx0XHRcdFx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGdpdmUgdGhlIGVycm9yIGNhbGxiYWNrIGEgY2hhbmNlIHRvIGZpcmUgYmVmb3JlIHJlc29sdmluZ1xuXHRcdFx0XHRcdFx0Ly8gcmVxdWVzdHMgZm9yIGZpbGU6Ly8gVVJMcyBkbyBub3QgaGF2ZSBhIHN0YXR1cyBjb2RlXG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0cmVzb2x2ZShyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHR9LCAwKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNsaWVudC5vbmVycm9yID0gZnVuY3Rpb24gKC8qIGUgKi8pIHtcblx0XHRcdFx0XHRyZXNwb25zZS5lcnJvciA9ICdsb2FkZXJyb3InO1xuXHRcdFx0XHRcdHJlamVjdChyZXNwb25zZSk7XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBJRSA2IHdpbGwgbm90IHN1cHBvcnQgZXJyb3IgaGFuZGxpbmdcblx0XHRcdH1cblxuXHRcdFx0Y2xpZW50LnNlbmQoZW50aXR5KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdHJlc3BvbnNlLmVycm9yID0gJ2xvYWRlcnJvcic7XG5cdFx0XHRyZWplY3QocmVzcG9uc2UpO1xuXHRcdH1cblxuXHR9KTtcbn0pO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRDbGllbnQsIG1peGluLCByZXNwb25zZVByb21pc2UsIGNsaWVudDtcblxuZGVmYXVsdENsaWVudCA9IHJlcXVpcmUoJy4vY2xpZW50L2RlZmF1bHQnKTtcbm1peGluID0gcmVxdWlyZSgnLi91dGlsL21peGluJyk7XG5yZXNwb25zZVByb21pc2UgPSByZXF1aXJlKCcuL3V0aWwvcmVzcG9uc2VQcm9taXNlJyk7XG5jbGllbnQgPSByZXF1aXJlKCcuL2NsaWVudCcpO1xuXG4vKipcbiAqIEludGVyY2VwdG9ycyBoYXZlIHRoZSBhYmlsaXR5IHRvIGludGVyY2VwdCB0aGUgcmVxdWVzdCBhbmQvb3JnIHJlc3BvbnNlXG4gKiBvYmplY3RzLiAgVGhleSBtYXkgYXVnbWVudCwgcHJ1bmUsIHRyYW5zZm9ybSBvciByZXBsYWNlIHRoZVxuICogcmVxdWVzdC9yZXNwb25zZSBhcyBuZWVkZWQuICBDbGllbnRzIG1heSBiZSBjb21wb3NlZCBieSB3cmFwcGluZ1xuICogdG9nZXRoZXIgbXVsdGlwbGUgaW50ZXJjZXB0b3JzLlxuICpcbiAqIENvbmZpZ3VyZWQgaW50ZXJjZXB0b3JzIGFyZSBmdW5jdGlvbmFsIGluIG5hdHVyZS4gIFdyYXBwaW5nIGEgY2xpZW50IGluXG4gKiBhbiBpbnRlcmNlcHRvciB3aWxsIG5vdCBhZmZlY3QgdGhlIGNsaWVudCwgbWVyZWx5IHRoZSBkYXRhIHRoYXQgZmxvd3MgaW5cbiAqIGFuZCBvdXQgb2YgdGhhdCBjbGllbnQuICBBIGNvbW1vbiBjb25maWd1cmF0aW9uIGNhbiBiZSBjcmVhdGVkIG9uY2UgYW5kXG4gKiBzaGFyZWQ7IHNwZWNpYWxpemF0aW9uIGNhbiBiZSBjcmVhdGVkIGJ5IGZ1cnRoZXIgd3JhcHBpbmcgdGhhdCBjbGllbnRcbiAqIHdpdGggY3VzdG9tIGludGVyY2VwdG9ycy5cbiAqXG4gKiBAcGFyYW0ge0NsaWVudH0gW3RhcmdldF0gY2xpZW50IHRvIHdyYXBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnXSBjb25maWd1cmF0aW9uIGZvciB0aGUgaW50ZXJjZXB0b3IsIHByb3BlcnRpZXMgd2lsbCBiZSBzcGVjaWZpYyB0byB0aGUgaW50ZXJjZXB0b3IgaW1wbGVtZW50YXRpb25cbiAqIEByZXR1cm5zIHtDbGllbnR9IEEgY2xpZW50IHdyYXBwZWQgd2l0aCB0aGUgaW50ZXJjZXB0b3JcbiAqXG4gKiBAY2xhc3MgSW50ZXJjZXB0b3JcbiAqL1xuXG5mdW5jdGlvbiBkZWZhdWx0SW5pdEhhbmRsZXIoY29uZmlnKSB7XG5cdHJldHVybiBjb25maWc7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRSZXF1ZXN0SGFuZGxlcihyZXF1ZXN0IC8qLCBjb25maWcsIG1ldGEgKi8pIHtcblx0cmV0dXJuIHJlcXVlc3Q7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UgLyosIGNvbmZpZywgbWV0YSAqLykge1xuXHRyZXR1cm4gcmVzcG9uc2U7XG59XG5cbi8qKlxuICogQWx0ZXJuYXRlIHJldHVybiB0eXBlIGZvciB0aGUgcmVxdWVzdCBoYW5kbGVyIHRoYXQgYWxsb3dzIGZvciBtb3JlIGNvbXBsZXggaW50ZXJhY3Rpb25zLlxuICpcbiAqIEBwYXJhbSBwcm9wZXJ0aWVzLnJlcXVlc3QgdGhlIHRyYWRpdGlvbmFsIHJlcXVlc3QgcmV0dXJuIG9iamVjdFxuICogQHBhcmFtIHtQcm9taXNlfSBbcHJvcGVydGllcy5hYm9ydF0gcHJvbWlzZSB0aGF0IHJlc29sdmVzIGlmL3doZW4gdGhlIHJlcXVlc3QgaXMgYWJvcnRlZFxuICogQHBhcmFtIHtDbGllbnR9IFtwcm9wZXJ0aWVzLmNsaWVudF0gb3ZlcnJpZGUgdGhlIGRlZmluZWQgY2xpZW50IHdpdGggYW4gYWx0ZXJuYXRlIGNsaWVudFxuICogQHBhcmFtIFtwcm9wZXJ0aWVzLnJlc3BvbnNlXSByZXNwb25zZSBmb3IgdGhlIHJlcXVlc3QsIHNob3J0IGNpcmN1aXQgdGhlIHJlcXVlc3RcbiAqL1xuZnVuY3Rpb24gQ29tcGxleFJlcXVlc3QocHJvcGVydGllcykge1xuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgQ29tcGxleFJlcXVlc3QpKSB7XG5cdFx0Ly8gaW4gY2FzZSB1c2VycyBmb3JnZXQgdGhlICduZXcnIGRvbid0IG1peCBpbnRvIHRoZSBpbnRlcmNlcHRvclxuXHRcdHJldHVybiBuZXcgQ29tcGxleFJlcXVlc3QocHJvcGVydGllcyk7XG5cdH1cblx0bWl4aW4odGhpcywgcHJvcGVydGllcyk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGludGVyY2VwdG9yIGZvciB0aGUgcHJvdmlkZWQgaGFuZGxlcnMuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2hhbmRsZXJzLmluaXRdIG9uZSB0aW1lIGludGlhbGl6YXRpb24sIG11c3QgcmV0dXJuIHRoZSBjb25maWcgb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaGFuZGxlcnMucmVxdWVzdF0gcmVxdWVzdCBoYW5kbGVyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaGFuZGxlcnMucmVzcG9uc2VdIHJlc3BvbnNlIGhhbmRsZXIgcmVnYXJkbGVzcyBvZiBlcnJvciBzdGF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2hhbmRsZXJzLnN1Y2Nlc3NdIHJlc3BvbnNlIGhhbmRsZXIgd2hlbiB0aGUgcmVxdWVzdCBpcyBub3QgaW4gZXJyb3JcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtoYW5kbGVycy5lcnJvcl0gcmVzcG9uc2UgaGFuZGxlciB3aGVuIHRoZSByZXF1ZXN0IGlzIGluIGVycm9yLCBtYXkgYmUgdXNlZCB0byAndW5yZWplY3QnIGFuIGVycm9yIHN0YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaGFuZGxlcnMuY2xpZW50XSB0aGUgY2xpZW50IHRvIHVzZSBpZiBvdGhlcndpc2Ugbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gcGxhdGZvcm0gZGVmYXVsdCBjbGllbnRcbiAqXG4gKiBAcmV0dXJucyB7SW50ZXJjZXB0b3J9XG4gKi9cbmZ1bmN0aW9uIGludGVyY2VwdG9yKGhhbmRsZXJzKSB7XG5cblx0dmFyIGluaXRIYW5kbGVyLCByZXF1ZXN0SGFuZGxlciwgc3VjY2Vzc1Jlc3BvbnNlSGFuZGxlciwgZXJyb3JSZXNwb25zZUhhbmRsZXI7XG5cblx0aGFuZGxlcnMgPSBoYW5kbGVycyB8fCB7fTtcblxuXHRpbml0SGFuZGxlciAgICAgICAgICAgID0gaGFuZGxlcnMuaW5pdCAgICB8fCBkZWZhdWx0SW5pdEhhbmRsZXI7XG5cdHJlcXVlc3RIYW5kbGVyICAgICAgICAgPSBoYW5kbGVycy5yZXF1ZXN0IHx8IGRlZmF1bHRSZXF1ZXN0SGFuZGxlcjtcblx0c3VjY2Vzc1Jlc3BvbnNlSGFuZGxlciA9IGhhbmRsZXJzLnN1Y2Nlc3MgfHwgaGFuZGxlcnMucmVzcG9uc2UgfHwgZGVmYXVsdFJlc3BvbnNlSGFuZGxlcjtcblx0ZXJyb3JSZXNwb25zZUhhbmRsZXIgICA9IGhhbmRsZXJzLmVycm9yICAgfHwgZnVuY3Rpb24gKCkge1xuXHRcdC8vIFByb3BhZ2F0ZSB0aGUgcmVqZWN0aW9uLCB3aXRoIHRoZSByZXN1bHQgb2YgdGhlIGhhbmRsZXJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKChoYW5kbGVycy5yZXNwb25zZSB8fCBkZWZhdWx0UmVzcG9uc2VIYW5kbGVyKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKVxuXHRcdFx0LnRoZW4oUHJvbWlzZS5yZWplY3QuYmluZChQcm9taXNlKSk7XG5cdH07XG5cblx0cmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGNvbmZpZykge1xuXG5cdFx0aWYgKHR5cGVvZiB0YXJnZXQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRjb25maWcgPSB0YXJnZXQ7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR0YXJnZXQgPSBoYW5kbGVycy5jbGllbnQgfHwgZGVmYXVsdENsaWVudDtcblx0XHR9XG5cblx0XHRjb25maWcgPSBpbml0SGFuZGxlcihjb25maWcgfHwge30pO1xuXG5cdFx0ZnVuY3Rpb24gaW50ZXJjZXB0ZWRDbGllbnQocmVxdWVzdCkge1xuXHRcdFx0dmFyIGNvbnRleHQsIG1ldGE7XG5cdFx0XHRjb250ZXh0ID0ge307XG5cdFx0XHRtZXRhID0geyAnYXJndW1lbnRzJzogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSwgY2xpZW50OiBpbnRlcmNlcHRlZENsaWVudCB9O1xuXHRcdFx0cmVxdWVzdCA9IHR5cGVvZiByZXF1ZXN0ID09PSAnc3RyaW5nJyA/IHsgcGF0aDogcmVxdWVzdCB9IDogcmVxdWVzdCB8fCB7fTtcblx0XHRcdHJlcXVlc3Qub3JpZ2luYXRvciA9IHJlcXVlc3Qub3JpZ2luYXRvciB8fCBpbnRlcmNlcHRlZENsaWVudDtcblx0XHRcdHJldHVybiByZXNwb25zZVByb21pc2UoXG5cdFx0XHRcdHJlcXVlc3RIYW5kbGVyLmNhbGwoY29udGV4dCwgcmVxdWVzdCwgY29uZmlnLCBtZXRhKSxcblx0XHRcdFx0ZnVuY3Rpb24gKHJlcXVlc3QpIHtcblx0XHRcdFx0XHR2YXIgcmVzcG9uc2UsIGFib3J0LCBuZXh0O1xuXHRcdFx0XHRcdG5leHQgPSB0YXJnZXQ7XG5cdFx0XHRcdFx0aWYgKHJlcXVlc3QgaW5zdGFuY2VvZiBDb21wbGV4UmVxdWVzdCkge1xuXHRcdFx0XHRcdFx0Ly8gdW5wYWNrIHJlcXVlc3Rcblx0XHRcdFx0XHRcdGFib3J0ID0gcmVxdWVzdC5hYm9ydDtcblx0XHRcdFx0XHRcdG5leHQgPSByZXF1ZXN0LmNsaWVudCB8fCBuZXh0O1xuXHRcdFx0XHRcdFx0cmVzcG9uc2UgPSByZXF1ZXN0LnJlc3BvbnNlO1xuXHRcdFx0XHRcdFx0Ly8gbm9ybWFsaXplIHJlcXVlc3QsIG11c3QgYmUgbGFzdFxuXHRcdFx0XHRcdFx0cmVxdWVzdCA9IHJlcXVlc3QucmVxdWVzdDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmVzcG9uc2UgPSByZXNwb25zZSB8fCBQcm9taXNlLnJlc29sdmUocmVxdWVzdCkudGhlbihmdW5jdGlvbiAocmVxdWVzdCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXh0KHJlcXVlc3QpKS50aGVuKFxuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlSGFuZGxlci5jYWxsKGNvbnRleHQsIHJlc3BvbnNlLCBjb25maWcsIG1ldGEpO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZXJyb3JSZXNwb25zZUhhbmRsZXIuY2FsbChjb250ZXh0LCByZXNwb25zZSwgY29uZmlnLCBtZXRhKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRyZXR1cm4gYWJvcnQgPyBQcm9taXNlLnJhY2UoW3Jlc3BvbnNlLCBhYm9ydF0pIDogcmVzcG9uc2U7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZ1bmN0aW9uIChlcnJvcikge1xuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCh7IHJlcXVlc3Q6IHJlcXVlc3QsIGVycm9yOiBlcnJvciB9KTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gY2xpZW50KGludGVyY2VwdGVkQ2xpZW50LCB0YXJnZXQpO1xuXHR9O1xufVxuXG5pbnRlcmNlcHRvci5Db21wbGV4UmVxdWVzdCA9IENvbXBsZXhSZXF1ZXN0O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludGVyY2VwdG9yO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEzLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGludGVyY2VwdG9yLCBtaXhpblV0aWwsIGRlZmF1bHRlcjtcblxuaW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvcicpO1xubWl4aW5VdGlsID0gcmVxdWlyZSgnLi4vdXRpbC9taXhpbicpO1xuXG5kZWZhdWx0ZXIgPSAoZnVuY3Rpb24gKCkge1xuXG5cdGZ1bmN0aW9uIG1peGluKHByb3AsIHRhcmdldCwgZGVmYXVsdHMpIHtcblx0XHRpZiAocHJvcCBpbiB0YXJnZXQgfHwgcHJvcCBpbiBkZWZhdWx0cykge1xuXHRcdFx0dGFyZ2V0W3Byb3BdID0gbWl4aW5VdGlsKHt9LCBkZWZhdWx0c1twcm9wXSwgdGFyZ2V0W3Byb3BdKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBjb3B5KHByb3AsIHRhcmdldCwgZGVmYXVsdHMpIHtcblx0XHRpZiAocHJvcCBpbiBkZWZhdWx0cyAmJiAhKHByb3AgaW4gdGFyZ2V0KSkge1xuXHRcdFx0dGFyZ2V0W3Byb3BdID0gZGVmYXVsdHNbcHJvcF07XG5cdFx0fVxuXHR9XG5cblx0dmFyIG1hcHBpbmdzID0ge1xuXHRcdG1ldGhvZDogY29weSxcblx0XHRwYXRoOiBjb3B5LFxuXHRcdHBhcmFtczogbWl4aW4sXG5cdFx0aGVhZGVyczogbWl4aW4sXG5cdFx0ZW50aXR5OiBjb3B5LFxuXHRcdG1peGluOiBtaXhpblxuXHR9O1xuXG5cdHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBkZWZhdWx0cykge1xuXHRcdGZvciAodmFyIHByb3AgaW4gbWFwcGluZ3MpIHtcblx0XHRcdC8qanNoaW50IGZvcmluOiBmYWxzZSAqL1xuXHRcdFx0bWFwcGluZ3NbcHJvcF0ocHJvcCwgdGFyZ2V0LCBkZWZhdWx0cyk7XG5cdFx0fVxuXHRcdHJldHVybiB0YXJnZXQ7XG5cdH07XG5cbn0oKSk7XG5cbi8qKlxuICogUHJvdmlkZSBkZWZhdWx0IHZhbHVlcyBmb3IgYSByZXF1ZXN0LiBUaGVzZSB2YWx1ZXMgd2lsbCBiZSBhcHBsaWVkIHRvIHRoZVxuICogcmVxdWVzdCBpZiB0aGUgcmVxdWVzdCBvYmplY3QgZG9lcyBub3QgYWxyZWFkeSBjb250YWluIGFuIGV4cGxpY2l0IHZhbHVlLlxuICpcbiAqIEZvciAncGFyYW1zJywgJ2hlYWRlcnMnLCBhbmQgJ21peGluJywgaW5kaXZpZHVhbCB2YWx1ZXMgYXJlIG1peGVkIGluIHdpdGggdGhlXG4gKiByZXF1ZXN0J3MgdmFsdWVzLiBUaGUgcmVzdWx0IGlzIGEgbmV3IG9iamVjdCByZXByZXNlbnRpaW5nIHRoZSBjb21iaW5lZFxuICogcmVxdWVzdCBhbmQgY29uZmlnIHZhbHVlcy4gTmVpdGhlciBpbnB1dCBvYmplY3QgaXMgbXV0YXRlZC5cbiAqXG4gKiBAcGFyYW0ge0NsaWVudH0gW2NsaWVudF0gY2xpZW50IHRvIHdyYXBcbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29uZmlnLm1ldGhvZF0gdGhlIGRlZmF1bHQgbWV0aG9kXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvbmZpZy5wYXRoXSB0aGUgZGVmYXVsdCBwYXRoXG4gKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5wYXJhbXNdIHRoZSBkZWZhdWx0IHBhcmFtcywgbWl4ZWQgd2l0aCB0aGUgcmVxdWVzdCdzIGV4aXN0aW5nIHBhcmFtc1xuICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcuaGVhZGVyc10gdGhlIGRlZmF1bHQgaGVhZGVycywgbWl4ZWQgd2l0aCB0aGUgcmVxdWVzdCdzIGV4aXN0aW5nIGhlYWRlcnNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLm1peGluXSB0aGUgZGVmYXVsdCBcIm1peGluc1wiIChodHRwL2h0dHBzIG9wdGlvbnMpLCBtaXhlZCB3aXRoIHRoZSByZXF1ZXN0J3MgZXhpc3RpbmcgXCJtaXhpbnNcIlxuICpcbiAqIEByZXR1cm5zIHtDbGllbnR9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gaW50ZXJjZXB0b3Ioe1xuXHRyZXF1ZXN0OiBmdW5jdGlvbiBoYW5kbGVSZXF1ZXN0KHJlcXVlc3QsIGNvbmZpZykge1xuXHRcdHJldHVybiBkZWZhdWx0ZXIocmVxdWVzdCwgY29uZmlnKTtcblx0fVxufSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW50ZXJjZXB0b3I7XG5cbmludGVyY2VwdG9yID0gcmVxdWlyZSgnLi4vaW50ZXJjZXB0b3InKTtcblxuLyoqXG4gKiBSZWplY3RzIHRoZSByZXNwb25zZSBwcm9taXNlIGJhc2VkIG9uIHRoZSBzdGF0dXMgY29kZS5cbiAqXG4gKiBDb2RlcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gdGhlIHByb3ZpZGVkIHZhbHVlIGFyZSByZWplY3RlZC4gIERlZmF1bHRcbiAqIHZhbHVlIDQwMC5cbiAqXG4gKiBAcGFyYW0ge0NsaWVudH0gW2NsaWVudF0gY2xpZW50IHRvIHdyYXBcbiAqIEBwYXJhbSB7bnVtYmVyfSBbY29uZmlnLmNvZGU9NDAwXSBjb2RlIHRvIGluZGljYXRlIGEgcmVqZWN0aW9uXG4gKlxuICogQHJldHVybnMge0NsaWVudH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBpbnRlcmNlcHRvcih7XG5cdGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblx0XHRjb25maWcuY29kZSA9IGNvbmZpZy5jb2RlIHx8IDQwMDtcblx0XHRyZXR1cm4gY29uZmlnO1xuXHR9LFxuXHRyZXNwb25zZTogZnVuY3Rpb24gKHJlc3BvbnNlLCBjb25maWcpIHtcblx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzICYmIHJlc3BvbnNlLnN0YXR1cy5jb2RlID49IGNvbmZpZy5jb2RlKSB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QocmVzcG9uc2UpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdH1cbn0pO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGludGVyY2VwdG9yLCBtaW1lLCByZWdpc3RyeSwgbm9vcENvbnZlcnRlciwgbWlzc2luZ0NvbnZlcnRlciwgYXR0ZW1wdDtcblxuaW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvcicpO1xubWltZSA9IHJlcXVpcmUoJy4uL21pbWUnKTtcbnJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi4vbWltZS9yZWdpc3RyeScpO1xuYXR0ZW1wdCA9IHJlcXVpcmUoJy4uL3V0aWwvYXR0ZW1wdCcpO1xuXG5ub29wQ29udmVydGVyID0ge1xuXHRyZWFkOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmo7IH0sXG5cdHdyaXRlOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmo7IH1cbn07XG5cbm1pc3NpbmdDb252ZXJ0ZXIgPSB7XG5cdHJlYWQ6IGZ1bmN0aW9uICgpIHsgdGhyb3cgJ05vIHJlYWQgbWV0aG9kIGZvdW5kIG9uIGNvbnZlcnRlcic7IH0sXG5cdHdyaXRlOiBmdW5jdGlvbiAoKSB7IHRocm93ICdObyB3cml0ZSBtZXRob2QgZm91bmQgb24gY29udmVydGVyJzsgfVxufTtcblxuLyoqXG4gKiBNSU1FIHR5cGUgc3VwcG9ydCBmb3IgcmVxdWVzdCBhbmQgcmVzcG9uc2UgZW50aXRpZXMuICBFbnRpdGllcyBhcmVcbiAqIChkZSlzZXJpYWxpemVkIHVzaW5nIHRoZSBjb252ZXJ0ZXIgZm9yIHRoZSBNSU1FIHR5cGUuXG4gKlxuICogUmVxdWVzdCBlbnRpdGllcyBhcmUgY29udmVydGVkIHVzaW5nIHRoZSBkZXNpcmVkIGNvbnZlcnRlciBhbmQgdGhlXG4gKiAnQWNjZXB0JyByZXF1ZXN0IGhlYWRlciBwcmVmZXJzIHRoaXMgTUlNRS5cbiAqXG4gKiBSZXNwb25zZSBlbnRpdGllcyBhcmUgY29udmVydGVkIGJhc2VkIG9uIHRoZSBDb250ZW50LVR5cGUgcmVzcG9uc2UgaGVhZGVyLlxuICpcbiAqIEBwYXJhbSB7Q2xpZW50fSBbY2xpZW50XSBjbGllbnQgdG8gd3JhcFxuICogQHBhcmFtIHtzdHJpbmd9IFtjb25maWcubWltZT0ndGV4dC9wbGFpbiddIE1JTUUgdHlwZSB0byBlbmNvZGUgdGhlIHJlcXVlc3RcbiAqICAgZW50aXR5XG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvbmZpZy5hY2NlcHRdIEFjY2VwdCBoZWFkZXIgZm9yIHRoZSByZXF1ZXN0XG4gKiBAcGFyYW0ge0NsaWVudH0gW2NvbmZpZy5jbGllbnQ9PHJlcXVlc3Qub3JpZ2luYXRvcj5dIGNsaWVudCBwYXNzZWQgdG8gdGhlXG4gKiAgIGNvbnZlcnRlciwgZGVmYXVsdHMgdG8gdGhlIGNsaWVudCBvcmlnaW5hdGluZyB0aGUgcmVxdWVzdFxuICogQHBhcmFtIHtSZWdpc3RyeX0gW2NvbmZpZy5yZWdpc3RyeV0gTUlNRSByZWdpc3RyeSwgZGVmYXVsdHMgdG8gdGhlIHJvb3RcbiAqICAgcmVnaXN0cnlcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5wZXJtaXNzaXZlXSBBbGxvdyBhbiB1bmtvd24gcmVxdWVzdCBNSU1FIHR5cGVcbiAqXG4gKiBAcmV0dXJucyB7Q2xpZW50fVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGludGVyY2VwdG9yKHtcblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXHRcdGNvbmZpZy5yZWdpc3RyeSA9IGNvbmZpZy5yZWdpc3RyeSB8fCByZWdpc3RyeTtcblx0XHRyZXR1cm4gY29uZmlnO1xuXHR9LFxuXHRyZXF1ZXN0OiBmdW5jdGlvbiAocmVxdWVzdCwgY29uZmlnKSB7XG5cdFx0dmFyIHR5cGUsIGhlYWRlcnM7XG5cblx0XHRoZWFkZXJzID0gcmVxdWVzdC5oZWFkZXJzIHx8IChyZXF1ZXN0LmhlYWRlcnMgPSB7fSk7XG5cdFx0dHlwZSA9IG1pbWUucGFyc2UoaGVhZGVyc1snQ29udGVudC1UeXBlJ10gfHwgY29uZmlnLm1pbWUgfHwgJ3RleHQvcGxhaW4nKTtcblx0XHRoZWFkZXJzLkFjY2VwdCA9IGhlYWRlcnMuQWNjZXB0IHx8IGNvbmZpZy5hY2NlcHQgfHwgdHlwZS5yYXcgKyAnLCBhcHBsaWNhdGlvbi9qc29uO3E9MC44LCB0ZXh0L3BsYWluO3E9MC41LCAqLyo7cT0wLjInO1xuXG5cdFx0aWYgKCEoJ2VudGl0eScgaW4gcmVxdWVzdCkpIHtcblx0XHRcdHJldHVybiByZXF1ZXN0O1xuXHRcdH1cblxuXHRcdGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gdHlwZS5yYXc7XG5cblx0XHRyZXR1cm4gY29uZmlnLnJlZ2lzdHJ5Lmxvb2t1cCh0eXBlKVsnY2F0Y2gnXShmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBmYWlsZWQgdG8gcmVzb2x2ZSBjb252ZXJ0ZXJcblx0XHRcdGlmIChjb25maWcucGVybWlzc2l2ZSkge1xuXHRcdFx0XHRyZXR1cm4gbm9vcENvbnZlcnRlcjtcblx0XHRcdH1cblx0XHRcdHRocm93ICdtaW1lLXVua25vd24nO1xuXHRcdH0pLnRoZW4oZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuXHRcdFx0dmFyIGNsaWVudCA9IGNvbmZpZy5jbGllbnQgfHwgcmVxdWVzdC5vcmlnaW5hdG9yLFxuXHRcdFx0XHR3cml0ZSA9IGNvbnZlcnRlci53cml0ZSB8fCBtaXNzaW5nQ29udmVydGVyLndyaXRlO1xuXG5cdFx0XHRyZXR1cm4gYXR0ZW1wdCh3cml0ZS5iaW5kKHZvaWQgMCwgcmVxdWVzdC5lbnRpdHksIHsgY2xpZW50OiBjbGllbnQsIHJlcXVlc3Q6IHJlcXVlc3QsIG1pbWU6IHR5cGUsIHJlZ2lzdHJ5OiBjb25maWcucmVnaXN0cnkgfSkpXG5cdFx0XHRcdFsnY2F0Y2gnXShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0aHJvdyAnbWltZS1zZXJpYWxpemF0aW9uJztcblx0XHRcdFx0fSlcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZW50aXR5KSB7XG5cdFx0XHRcdFx0cmVxdWVzdC5lbnRpdHkgPSBlbnRpdHk7XG5cdFx0XHRcdFx0cmV0dXJuIHJlcXVlc3Q7XG5cdFx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRyZXNwb25zZTogZnVuY3Rpb24gKHJlc3BvbnNlLCBjb25maWcpIHtcblx0XHRpZiAoIShyZXNwb25zZS5oZWFkZXJzICYmIHJlc3BvbnNlLmhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddICYmIHJlc3BvbnNlLmVudGl0eSkpIHtcblx0XHRcdHJldHVybiByZXNwb25zZTtcblx0XHR9XG5cblx0XHR2YXIgdHlwZSA9IG1pbWUucGFyc2UocmVzcG9uc2UuaGVhZGVyc1snQ29udGVudC1UeXBlJ10pO1xuXG5cdFx0cmV0dXJuIGNvbmZpZy5yZWdpc3RyeS5sb29rdXAodHlwZSlbJ2NhdGNoJ10oZnVuY3Rpb24gKCkgeyByZXR1cm4gbm9vcENvbnZlcnRlcjsgfSkudGhlbihmdW5jdGlvbiAoY29udmVydGVyKSB7XG5cdFx0XHR2YXIgY2xpZW50ID0gY29uZmlnLmNsaWVudCB8fCByZXNwb25zZS5yZXF1ZXN0ICYmIHJlc3BvbnNlLnJlcXVlc3Qub3JpZ2luYXRvcixcblx0XHRcdFx0cmVhZCA9IGNvbnZlcnRlci5yZWFkIHx8IG1pc3NpbmdDb252ZXJ0ZXIucmVhZDtcblxuXHRcdFx0cmV0dXJuIGF0dGVtcHQocmVhZC5iaW5kKHZvaWQgMCwgcmVzcG9uc2UuZW50aXR5LCB7IGNsaWVudDogY2xpZW50LCByZXNwb25zZTogcmVzcG9uc2UsIG1pbWU6IHR5cGUsIHJlZ2lzdHJ5OiBjb25maWcucmVnaXN0cnkgfSkpXG5cdFx0XHRcdFsnY2F0Y2gnXShmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdHJlc3BvbnNlLmVycm9yID0gJ21pbWUtZGVzZXJpYWxpemF0aW9uJztcblx0XHRcdFx0XHRyZXNwb25zZS5jYXVzZSA9IGU7XG5cdFx0XHRcdFx0dGhyb3cgcmVzcG9uc2U7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uIChlbnRpdHkpIHtcblx0XHRcdFx0XHRyZXNwb25zZS5lbnRpdHkgPSBlbnRpdHk7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xuXHRcdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGludGVyY2VwdG9yLCBVcmxCdWlsZGVyO1xuXG5pbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uL2ludGVyY2VwdG9yJyk7XG5VcmxCdWlsZGVyID0gcmVxdWlyZSgnLi4vVXJsQnVpbGRlcicpO1xuXG4vKipcbiAqIEFwcGxpZXMgcmVxdWVzdCBwYXJhbXMgdG8gdGhlIHBhdGggYnkgdG9rZW4gcmVwbGFjZW1lbnRcbiAqXG4gKiBQYXJhbXMgbm90IGFwcGxpZWQgYXMgYSB0b2tlbiBhcmUgYXBwZW5kZWQgdG8gdGhlIHF1ZXJ5IHN0cmluZy4gUGFyYW1zXG4gKiBhcmUgcmVtb3ZlZCBmcm9tIHRoZSByZXF1ZXN0IG9iamVjdCwgYXMgdGhleSBoYXZlIGJlZW4gY29uc3VtZWQuXG4gKlxuICogQGRlcHJlY2F0ZWQgVGhlIHRlbXBsYXRlIGludGVyY2VwdG9yIGByZXN0L2ludGVyY2VwdG9yL3RlbXBsYXRlYCBpcyBhXG4gKiBtdWNoIHJpY2hlciB3YXkgdG8gYXBwbHkgcGFyYW10ZXJzIHRvIGEgdGVtcGxhdGUuIFRoaXMgaW50ZXJjZXB0b3IgaXNcbiAqIGF2YWlsYWJsZSBhcyBhIGJyaWRnZSB0byB1c2VycyB3aG8gcHJldmlvdXNsZWQgZGVwZW5kZWQgb24gdGhpc1xuICogZnVuY3Rpb25hbGl0eSBiZWluZyBhdmFpbGFibGUgZGlyZWN0bHkgb24gY2xpZW50cy5cbiAqXG4gKiBAcGFyYW0ge0NsaWVudH0gW2NsaWVudF0gY2xpZW50IHRvIHdyYXBcbiAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLnBhcmFtc10gZGVmYXVsdCBwYXJhbSB2YWx1ZXNcbiAqXG4gKiBAcmV0dXJucyB7Q2xpZW50fVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGludGVyY2VwdG9yKHtcblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXHRcdGNvbmZpZy5wYXJhbXMgPSBjb25maWcucGFyYW1zIHx8IHt9O1xuXHRcdHJldHVybiBjb25maWc7XG5cdH0sXG5cdHJlcXVlc3Q6IGZ1bmN0aW9uIChyZXF1ZXN0LCBjb25maWcpIHtcblx0XHR2YXIgcGF0aCwgcGFyYW1zO1xuXG5cdFx0cGF0aCA9IHJlcXVlc3QucGF0aCB8fCAnJztcblx0XHRwYXJhbXMgPSByZXF1ZXN0LnBhcmFtcyB8fCB7fTtcblxuXHRcdHJlcXVlc3QucGF0aCA9IG5ldyBVcmxCdWlsZGVyKHBhdGgsIGNvbmZpZy5wYXJhbXMpLmFwcGVuZCgnJywgcGFyYW1zKS5idWlsZCgpO1xuXHRcdGRlbGV0ZSByZXF1ZXN0LnBhcmFtcztcblxuXHRcdHJldHVybiByZXF1ZXN0O1xuXHR9XG59KTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBpbnRlcmNlcHRvciwgVXJsQnVpbGRlcjtcblxuaW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvcicpO1xuVXJsQnVpbGRlciA9IHJlcXVpcmUoJy4uL1VybEJ1aWxkZXInKTtcblxuZnVuY3Rpb24gc3RhcnRzV2l0aChzdHIsIHByZWZpeCkge1xuXHRyZXR1cm4gc3RyLmluZGV4T2YocHJlZml4KSA9PT0gMDtcbn1cblxuZnVuY3Rpb24gZW5kc1dpdGgoc3RyLCBzdWZmaXgpIHtcblx0cmV0dXJuIHN0ci5sYXN0SW5kZXhPZihzdWZmaXgpICsgc3VmZml4Lmxlbmd0aCA9PT0gc3RyLmxlbmd0aDtcbn1cblxuLyoqXG4gKiBQcmVmaXhlcyB0aGUgcmVxdWVzdCBwYXRoIHdpdGggYSBjb21tb24gdmFsdWUuXG4gKlxuICogQHBhcmFtIHtDbGllbnR9IFtjbGllbnRdIGNsaWVudCB0byB3cmFwXG4gKiBAcGFyYW0ge251bWJlcn0gW2NvbmZpZy5wcmVmaXhdIHBhdGggcHJlZml4XG4gKlxuICogQHJldHVybnMge0NsaWVudH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBpbnRlcmNlcHRvcih7XG5cdHJlcXVlc3Q6IGZ1bmN0aW9uIChyZXF1ZXN0LCBjb25maWcpIHtcblx0XHR2YXIgcGF0aDtcblxuXHRcdGlmIChjb25maWcucHJlZml4ICYmICEobmV3IFVybEJ1aWxkZXIocmVxdWVzdC5wYXRoKS5pc0Z1bGx5UXVhbGlmaWVkKCkpKSB7XG5cdFx0XHRwYXRoID0gY29uZmlnLnByZWZpeDtcblx0XHRcdGlmIChyZXF1ZXN0LnBhdGgpIHtcblx0XHRcdFx0aWYgKCFlbmRzV2l0aChwYXRoLCAnLycpICYmICFzdGFydHNXaXRoKHJlcXVlc3QucGF0aCwgJy8nKSkge1xuXHRcdFx0XHRcdC8vIGFkZCBtaXNzaW5nICcvJyBiZXR3ZWVuIHBhdGggc2VjdGlvbnNcblx0XHRcdFx0XHRwYXRoICs9ICcvJztcblx0XHRcdFx0fVxuXHRcdFx0XHRwYXRoICs9IHJlcXVlc3QucGF0aDtcblx0XHRcdH1cblx0XHRcdHJlcXVlc3QucGF0aCA9IHBhdGg7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlcXVlc3Q7XG5cdH1cbn0pO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1LTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGludGVyY2VwdG9yLCB1cmlUZW1wbGF0ZSwgbWl4aW47XG5cbmludGVyY2VwdG9yID0gcmVxdWlyZSgnLi4vaW50ZXJjZXB0b3InKTtcbnVyaVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdXRpbC91cmlUZW1wbGF0ZScpO1xubWl4aW4gPSByZXF1aXJlKCcuLi91dGlsL21peGluJyk7XG5cbi8qKlxuICogQXBwbGllcyByZXF1ZXN0IHBhcmFtcyB0byB0aGUgcGF0aCBhcyBhIFVSSSBUZW1wbGF0ZVxuICpcbiAqIFBhcmFtcyBhcmUgcmVtb3ZlZCBmcm9tIHRoZSByZXF1ZXN0IG9iamVjdCwgYXMgdGhleSBoYXZlIGJlZW4gY29uc3VtZWQuXG4gKlxuICogQHNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjU3MFxuICpcbiAqIEBwYXJhbSB7Q2xpZW50fSBbY2xpZW50XSBjbGllbnQgdG8gd3JhcFxuICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcucGFyYW1zXSBkZWZhdWx0IHBhcmFtIHZhbHVlc1xuICogQHBhcmFtIHtzdHJpbmd9IFtjb25maWcudGVtcGxhdGVdIGRlZmF1bHQgdGVtcGxhdGVcbiAqXG4gKiBAcmV0dXJucyB7Q2xpZW50fVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGludGVyY2VwdG9yKHtcblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXHRcdGNvbmZpZy5wYXJhbXMgPSBjb25maWcucGFyYW1zIHx8IHt9O1xuXHRcdGNvbmZpZy50ZW1wbGF0ZSA9IGNvbmZpZy50ZW1wbGF0ZSB8fCAnJztcblx0XHRyZXR1cm4gY29uZmlnO1xuXHR9LFxuXHRyZXF1ZXN0OiBmdW5jdGlvbiAocmVxdWVzdCwgY29uZmlnKSB7XG5cdFx0dmFyIHRlbXBsYXRlLCBwYXJhbXM7XG5cblx0XHR0ZW1wbGF0ZSA9IHJlcXVlc3QucGF0aCB8fCBjb25maWcudGVtcGxhdGU7XG5cdFx0cGFyYW1zID0gbWl4aW4oe30sIHJlcXVlc3QucGFyYW1zLCBjb25maWcucGFyYW1zKTtcblxuXHRcdHJlcXVlc3QucGF0aCA9IHVyaVRlbXBsYXRlLmV4cGFuZCh0ZW1wbGF0ZSwgcGFyYW1zKTtcblx0XHRkZWxldGUgcmVxdWVzdC5wYXJhbXM7XG5cblx0XHRyZXR1cm4gcmVxdWVzdDtcblx0fVxufSk7XG4iLCIvKlxuKiBDb3B5cmlnaHQgMjAxNC0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuKlxuKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBQYXJzZSBhIE1JTUUgdHlwZSBpbnRvIGl0J3MgY29uc3RpdHVlbnQgcGFydHNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbWltZSBNSU1FIHR5cGUgdG8gcGFyc2VcbiAqIEByZXR1cm4ge3tcbiAqICAge3N0cmluZ30gcmF3IHRoZSBvcmlnaW5hbCBNSU1FIHR5cGVcbiAqICAge3N0cmluZ30gdHlwZSB0aGUgdHlwZSBhbmQgc3VidHlwZVxuICogICB7c3RyaW5nfSBbc3VmZml4XSBtaW1lIHN1ZmZpeCwgaW5jbHVkaW5nIHRoZSBwbHVzLCBpZiBhbnlcbiAqICAge09iamVjdH0gcGFyYW1zIGtleS92YWx1ZSBwYWlyIG9mIGF0dHJpYnV0ZXNcbiAqIH19XG4gKi9cbmZ1bmN0aW9uIHBhcnNlKG1pbWUpIHtcblx0dmFyIHBhcmFtcywgdHlwZTtcblxuXHRwYXJhbXMgPSBtaW1lLnNwbGl0KCc7Jyk7XG5cdHR5cGUgPSBwYXJhbXNbMF0udHJpbSgpLnNwbGl0KCcrJyk7XG5cblx0cmV0dXJuIHtcblx0XHRyYXc6IG1pbWUsXG5cdFx0dHlwZTogdHlwZVswXSxcblx0XHRzdWZmaXg6IHR5cGVbMV0gPyAnKycgKyB0eXBlWzFdIDogJycsXG5cdFx0cGFyYW1zOiBwYXJhbXMuc2xpY2UoMSkucmVkdWNlKGZ1bmN0aW9uIChwYXJhbXMsIHBhaXIpIHtcblx0XHRcdHBhaXIgPSBwYWlyLnNwbGl0KCc9Jyk7XG5cdFx0XHRwYXJhbXNbcGFpclswXS50cmltKCldID0gcGFpclsxXSA/IHBhaXJbMV0udHJpbSgpIDogdm9pZCAwO1xuXHRcdFx0cmV0dXJuIHBhcmFtcztcblx0XHR9LCB7fSlcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHBhcnNlOiBwYXJzZVxufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBtaW1lLCByZWdpc3RyeTtcblxubWltZSA9IHJlcXVpcmUoJy4uL21pbWUnKTtcblxuZnVuY3Rpb24gUmVnaXN0cnkobWltZXMpIHtcblxuXHQvKipcblx0ICogTG9va3VwIHRoZSBjb252ZXJ0ZXIgZm9yIGEgTUlNRSB0eXBlXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIHRoZSBNSU1FIHR5cGVcblx0ICogQHJldHVybiBhIHByb21pc2UgZm9yIHRoZSBjb252ZXJ0ZXJcblx0ICovXG5cdHRoaXMubG9va3VwID0gZnVuY3Rpb24gbG9va3VwKHR5cGUpIHtcblx0XHR2YXIgcGFyc2VkO1xuXG5cdFx0cGFyc2VkID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gbWltZS5wYXJzZSh0eXBlKSA6IHR5cGU7XG5cblx0XHRpZiAobWltZXNbcGFyc2VkLnJhd10pIHtcblx0XHRcdHJldHVybiBtaW1lc1twYXJzZWQucmF3XTtcblx0XHR9XG5cdFx0aWYgKG1pbWVzW3BhcnNlZC50eXBlICsgcGFyc2VkLnN1ZmZpeF0pIHtcblx0XHRcdHJldHVybiBtaW1lc1twYXJzZWQudHlwZSArIHBhcnNlZC5zdWZmaXhdO1xuXHRcdH1cblx0XHRpZiAobWltZXNbcGFyc2VkLnR5cGVdKSB7XG5cdFx0XHRyZXR1cm4gbWltZXNbcGFyc2VkLnR5cGVdO1xuXHRcdH1cblx0XHRpZiAobWltZXNbcGFyc2VkLnN1ZmZpeF0pIHtcblx0XHRcdHJldHVybiBtaW1lc1twYXJzZWQuc3VmZml4XTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdVbmFibGUgdG8gbG9jYXRlIGNvbnZlcnRlciBmb3IgbWltZSBcIicgKyBwYXJzZWQucmF3ICsgJ1wiJykpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBsYXRlIGRpc3BhdGNoZWQgcHJveHkgdG8gdGhlIHRhcmdldCBjb252ZXJ0ZXIuXG5cdCAqXG5cdCAqIENvbW1vbiB3aGVuIGEgY29udmVydGVyIGlzIHJlZ2lzdGVyZWQgdW5kZXIgbXVsdGlwbGUgbmFtZXMgYW5kXG5cdCAqIHNob3VsZCBiZSBrZXB0IGluIHN5bmMgaWYgdXBkYXRlZC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgbWltZSBjb252ZXJ0ZXIgdG8gZGlzcGF0Y2ggdG9cblx0ICogQHJldHVybnMgY29udmVydGVyIHdob3NlIHJlYWQvd3JpdGUgbWV0aG9kcyB0YXJnZXQgdGhlIGRlc2lyZWQgbWltZSBjb252ZXJ0ZXJcblx0ICovXG5cdHRoaXMuZGVsZWdhdGUgPSBmdW5jdGlvbiBkZWxlZ2F0ZSh0eXBlKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlYWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0dmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cdFx0XHRcdHJldHVybiB0aGlzLmxvb2t1cCh0eXBlKS50aGVuKGZ1bmN0aW9uIChjb252ZXJ0ZXIpIHtcblx0XHRcdFx0XHRyZXR1cm4gY29udmVydGVyLnJlYWQuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0XHRcdH0uYmluZCh0aGlzKSk7XG5cdFx0XHR9LmJpbmQodGhpcyksXG5cdFx0XHR3cml0ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2YXIgYXJncyA9IGFyZ3VtZW50cztcblx0XHRcdFx0cmV0dXJuIHRoaXMubG9va3VwKHR5cGUpLnRoZW4oZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuXHRcdFx0XHRcdHJldHVybiBjb252ZXJ0ZXIud3JpdGUuYXBwbHkodGhpcywgYXJncyk7XG5cdFx0XHRcdH0uYmluZCh0aGlzKSk7XG5cdFx0XHR9LmJpbmQodGhpcylcblx0XHR9O1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZWdpc3RlciBhIGN1c3RvbSBjb252ZXJ0ZXIgZm9yIGEgTUlNRSB0eXBlXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIHRoZSBNSU1FIHR5cGVcblx0ICogQHBhcmFtIGNvbnZlcnRlciB0aGUgY29udmVydGVyIGZvciB0aGUgTUlNRSB0eXBlXG5cdCAqIEByZXR1cm4gYSBwcm9taXNlIGZvciB0aGUgY29udmVydGVyXG5cdCAqL1xuXHR0aGlzLnJlZ2lzdGVyID0gZnVuY3Rpb24gcmVnaXN0ZXIodHlwZSwgY29udmVydGVyKSB7XG5cdFx0bWltZXNbdHlwZV0gPSBQcm9taXNlLnJlc29sdmUoY29udmVydGVyKTtcblx0XHRyZXR1cm4gbWltZXNbdHlwZV07XG5cdH07XG5cblx0LyoqXG5cdCAqIENyZWF0ZSBhIGNoaWxkIHJlZ2lzdHJ5IHdob2VzIHJlZ2lzdGVyZWQgY29udmVydGVycyByZW1haW4gbG9jYWwsIHdoaWxlXG5cdCAqIGFibGUgdG8gbG9va3VwIGNvbnZlcnRlcnMgZnJvbSBpdHMgcGFyZW50LlxuXHQgKlxuXHQgKiBAcmV0dXJucyBjaGlsZCBNSU1FIHJlZ2lzdHJ5XG5cdCAqL1xuXHR0aGlzLmNoaWxkID0gZnVuY3Rpb24gY2hpbGQoKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdpc3RyeShPYmplY3QuY3JlYXRlKG1pbWVzKSk7XG5cdH07XG5cbn1cblxucmVnaXN0cnkgPSBuZXcgUmVnaXN0cnkoe30pO1xuXG4vLyBpbmNsdWRlIHByb3ZpZGVkIHNlcmlhbGl6ZXJzXG5yZWdpc3RyeS5yZWdpc3RlcignYXBwbGljYXRpb24vaGFsJywgcmVxdWlyZSgnLi90eXBlL2FwcGxpY2F0aW9uL2hhbCcpKTtcbnJlZ2lzdHJ5LnJlZ2lzdGVyKCdhcHBsaWNhdGlvbi9qc29uJywgcmVxdWlyZSgnLi90eXBlL2FwcGxpY2F0aW9uL2pzb24nKSk7XG5yZWdpc3RyeS5yZWdpc3RlcignYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJywgcmVxdWlyZSgnLi90eXBlL2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpKTtcbnJlZ2lzdHJ5LnJlZ2lzdGVyKCdtdWx0aXBhcnQvZm9ybS1kYXRhJywgcmVxdWlyZSgnLi90eXBlL211bHRpcGFydC9mb3JtLWRhdGEnKSk7XG5yZWdpc3RyeS5yZWdpc3RlcigndGV4dC9wbGFpbicsIHJlcXVpcmUoJy4vdHlwZS90ZXh0L3BsYWluJykpO1xuXG5yZWdpc3RyeS5yZWdpc3RlcignK2pzb24nLCByZWdpc3RyeS5kZWxlZ2F0ZSgnYXBwbGljYXRpb24vanNvbicpKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZWdpc3RyeTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBwYXRoUHJlZml4LCB0ZW1wbGF0ZSwgZmluZCwgbGF6eVByb21pc2UsIHJlc3BvbnNlUHJvbWlzZTtcblxucGF0aFByZWZpeCA9IHJlcXVpcmUoJy4uLy4uLy4uL2ludGVyY2VwdG9yL3BhdGhQcmVmaXgnKTtcbnRlbXBsYXRlID0gcmVxdWlyZSgnLi4vLi4vLi4vaW50ZXJjZXB0b3IvdGVtcGxhdGUnKTtcbmZpbmQgPSByZXF1aXJlKCcuLi8uLi8uLi91dGlsL2ZpbmQnKTtcbmxhenlQcm9taXNlID0gcmVxdWlyZSgnLi4vLi4vLi4vdXRpbC9sYXp5UHJvbWlzZScpO1xucmVzcG9uc2VQcm9taXNlID0gcmVxdWlyZSgnLi4vLi4vLi4vdXRpbC9yZXNwb25zZVByb21pc2UnKTtcblxuZnVuY3Rpb24gZGVmaW5lUHJvcGVydHkob2JqLCBuYW1lLCB2YWx1ZSkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBuYW1lLCB7XG5cdFx0dmFsdWU6IHZhbHVlLFxuXHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHR3cml0ZWFibGU6IHRydWVcblx0fSk7XG59XG5cbi8qKlxuICogSHlwZXJ0ZXh0IEFwcGxpY2F0aW9uIExhbmd1YWdlIHNlcmlhbGl6ZXJcbiAqXG4gKiBJbXBsZW1lbnRlZCB0byBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQta2VsbHktanNvbi1oYWwtMDZcbiAqXG4gKiBBcyB0aGUgc3BlYyBpcyBzdGlsbCBhIGRyYWZ0LCB0aGlzIGltcGxlbWVudGF0aW9uIHdpbGwgYmUgdXBkYXRlZCBhcyB0aGVcbiAqIHNwZWMgZXZvbHZlc1xuICpcbiAqIE9iamVjdHMgYXJlIHJlYWQgYXMgSEFMIGluZGV4aW5nIGxpbmtzIGFuZCBlbWJlZGRlZCBvYmplY3RzIG9uIHRvIHRoZVxuICogcmVzb3VyY2UuIE9iamVjdHMgYXJlIHdyaXR0ZW4gYXMgcGxhaW4gSlNPTi5cbiAqXG4gKiBFbWJlZGRlZCByZWxhdGlvbnNoaXBzIGFyZSBpbmRleGVkIG9udG8gdGhlIHJlc291cmNlIGJ5IHRoZSByZWxhdGlvbnNoaXBcbiAqIGFzIGEgcHJvbWlzZSBmb3IgdGhlIHJlbGF0ZWQgcmVzb3VyY2UuXG4gKlxuICogTGlua3MgYXJlIGluZGV4ZWQgb250byB0aGUgcmVzb3VyY2UgYXMgYSBsYXp5IHByb21pc2UgdGhhdCB3aWxsIEdFVCB0aGVcbiAqIHJlc291cmNlIHdoZW4gYSBoYW5kbGVyIGlzIGZpcnN0IHJlZ2lzdGVyZWQgb24gdGhlIHByb21pc2UuXG4gKlxuICogQSBgcmVxdWVzdEZvcmAgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBlbnRpdHkgdG8gbWFrZSBhIHJlcXVlc3QgZm9yIHRoZVxuICogcmVsYXRpb25zaGlwLlxuICpcbiAqIEEgYGNsaWVudEZvcmAgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBlbnRpdHkgdG8gZ2V0IGEgZnVsbCBDbGllbnQgZm9yIGFcbiAqIHJlbGF0aW9uc2hpcC5cbiAqXG4gKiBUaGUgYF9saW5rc2AgYW5kIGBfZW1iZWRkZWRgIHByb3BlcnRpZXMgb24gdGhlIHJlc291cmNlIGFyZSBtYWRlXG4gKiBub24tZW51bWVyYWJsZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cblx0cmVhZDogZnVuY3Rpb24gKHN0ciwgb3B0cykge1xuXHRcdHZhciBjbGllbnQsIGNvbnNvbGU7XG5cblx0XHRvcHRzID0gb3B0cyB8fCB7fTtcblx0XHRjbGllbnQgPSBvcHRzLmNsaWVudDtcblx0XHRjb25zb2xlID0gb3B0cy5jb25zb2xlIHx8IGNvbnNvbGU7XG5cblx0XHRmdW5jdGlvbiBkZXByZWNhdGlvbldhcm5pbmcocmVsYXRpb25zaGlwLCBkZXByZWNhdGlvbikge1xuXHRcdFx0aWYgKGRlcHJlY2F0aW9uICYmIGNvbnNvbGUgJiYgY29uc29sZS53YXJuIHx8IGNvbnNvbGUubG9nKSB7XG5cdFx0XHRcdChjb25zb2xlLndhcm4gfHwgY29uc29sZS5sb2cpLmNhbGwoY29uc29sZSwgJ1JlbGF0aW9uc2hpcCBcXCcnICsgcmVsYXRpb25zaGlwICsgJ1xcJyBpcyBkZXByZWNhdGVkLCBzZWUgJyArIGRlcHJlY2F0aW9uKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gb3B0cy5yZWdpc3RyeS5sb29rdXAob3B0cy5taW1lLnN1ZmZpeCkudGhlbihmdW5jdGlvbiAoY29udmVydGVyKSB7XG5cdFx0XHRyZXR1cm4gY29udmVydGVyLnJlYWQoc3RyLCBvcHRzKTtcblx0XHR9KS50aGVuKGZ1bmN0aW9uIChyb290KSB7XG5cdFx0XHRmaW5kLmZpbmRQcm9wZXJ0aWVzKHJvb3QsICdfZW1iZWRkZWQnLCBmdW5jdGlvbiAoZW1iZWRkZWQsIHJlc291cmNlLCBuYW1lKSB7XG5cdFx0XHRcdE9iamVjdC5rZXlzKGVtYmVkZGVkKS5mb3JFYWNoKGZ1bmN0aW9uIChyZWxhdGlvbnNoaXApIHtcblx0XHRcdFx0XHRpZiAocmVsYXRpb25zaGlwIGluIHJlc291cmNlKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdHZhciByZWxhdGVkID0gcmVzcG9uc2VQcm9taXNlKHtcblx0XHRcdFx0XHRcdGVudGl0eTogZW1iZWRkZWRbcmVsYXRpb25zaGlwXVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGRlZmluZVByb3BlcnR5KHJlc291cmNlLCByZWxhdGlvbnNoaXAsIHJlbGF0ZWQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsIG5hbWUsIGVtYmVkZGVkKTtcblx0XHRcdH0pO1xuXHRcdFx0ZmluZC5maW5kUHJvcGVydGllcyhyb290LCAnX2xpbmtzJywgZnVuY3Rpb24gKGxpbmtzLCByZXNvdXJjZSwgbmFtZSkge1xuXHRcdFx0XHRPYmplY3Qua2V5cyhsaW5rcykuZm9yRWFjaChmdW5jdGlvbiAocmVsYXRpb25zaGlwKSB7XG5cdFx0XHRcdFx0dmFyIGxpbmsgPSBsaW5rc1tyZWxhdGlvbnNoaXBdO1xuXHRcdFx0XHRcdGlmIChyZWxhdGlvbnNoaXAgaW4gcmVzb3VyY2UpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsIHJlbGF0aW9uc2hpcCwgcmVzcG9uc2VQcm9taXNlLm1ha2UobGF6eVByb21pc2UoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKGxpbmsuZGVwcmVjYXRpb24pIHsgZGVwcmVjYXRpb25XYXJuaW5nKHJlbGF0aW9uc2hpcCwgbGluay5kZXByZWNhdGlvbik7IH1cblx0XHRcdFx0XHRcdGlmIChsaW5rLnRlbXBsYXRlZCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGVtcGxhdGUoY2xpZW50KSh7IHBhdGg6IGxpbmsuaHJlZiB9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBjbGllbnQoeyBwYXRoOiBsaW5rLmhyZWYgfSk7XG5cdFx0XHRcdFx0fSkpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGRlZmluZVByb3BlcnR5KHJlc291cmNlLCBuYW1lLCBsaW5rcyk7XG5cdFx0XHRcdGRlZmluZVByb3BlcnR5KHJlc291cmNlLCAnY2xpZW50Rm9yJywgZnVuY3Rpb24gKHJlbGF0aW9uc2hpcCwgY2xpZW50T3ZlcnJpZGUpIHtcblx0XHRcdFx0XHR2YXIgbGluayA9IGxpbmtzW3JlbGF0aW9uc2hpcF07XG5cdFx0XHRcdFx0aWYgKCFsaW5rKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gcmVsYXRpb25zaGlwOiAnICsgcmVsYXRpb25zaGlwKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGxpbmsuZGVwcmVjYXRpb24pIHsgZGVwcmVjYXRpb25XYXJuaW5nKHJlbGF0aW9uc2hpcCwgbGluay5kZXByZWNhdGlvbik7IH1cblx0XHRcdFx0XHRpZiAobGluay50ZW1wbGF0ZWQgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0ZW1wbGF0ZShcblx0XHRcdFx0XHRcdFx0Y2xpZW50T3ZlcnJpZGUgfHwgY2xpZW50LFxuXHRcdFx0XHRcdFx0XHR7IHRlbXBsYXRlOiBsaW5rLmhyZWYgfVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHBhdGhQcmVmaXgoXG5cdFx0XHRcdFx0XHRjbGllbnRPdmVycmlkZSB8fCBjbGllbnQsXG5cdFx0XHRcdFx0XHR7IHByZWZpeDogbGluay5ocmVmIH1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsICdyZXF1ZXN0Rm9yJywgZnVuY3Rpb24gKHJlbGF0aW9uc2hpcCwgcmVxdWVzdCwgY2xpZW50T3ZlcnJpZGUpIHtcblx0XHRcdFx0XHR2YXIgY2xpZW50ID0gdGhpcy5jbGllbnRGb3IocmVsYXRpb25zaGlwLCBjbGllbnRPdmVycmlkZSk7XG5cdFx0XHRcdFx0cmV0dXJuIGNsaWVudChyZXF1ZXN0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHJvb3Q7XG5cdFx0fSk7XG5cblx0fSxcblxuXHR3cml0ZTogZnVuY3Rpb24gKG9iaiwgb3B0cykge1xuXHRcdHJldHVybiBvcHRzLnJlZ2lzdHJ5Lmxvb2t1cChvcHRzLm1pbWUuc3VmZml4KS50aGVuKGZ1bmN0aW9uIChjb252ZXJ0ZXIpIHtcblx0XHRcdHJldHVybiBjb252ZXJ0ZXIud3JpdGUob2JqLCBvcHRzKTtcblx0XHR9KTtcblx0fVxuXG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgSlNPTiBjb252ZXJ0ZXIgd2l0aCBjdXN0b20gcmV2aXZlci9yZXBsYWNlci5cbiAqXG4gKiBUaGUgZXh0ZW5kZWQgY29udmVydGVyIG11c3QgYmUgcHVibGlzaGVkIHRvIGEgTUlNRSByZWdpc3RyeSBpbiBvcmRlclxuICogdG8gYmUgdXNlZC4gVGhlIGV4aXN0aW5nIGNvbnZlcnRlciB3aWxsIG5vdCBiZSBtb2RpZmllZC5cbiAqXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0pTT05cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBbcmV2aXZlcj11bmRlZmluZWRdIGN1c3RvbSBKU09OLnBhcnNlIHJldml2ZXJcbiAqIEBwYXJhbSB7ZnVuY3Rpb258QXJyYXl9IFtyZXBsYWNlcj11bmRlZmluZWRdIGN1c3RvbSBKU09OLnN0cmluZ2lmeSByZXBsYWNlclxuICovXG5mdW5jdGlvbiBjcmVhdGVDb252ZXJ0ZXIocmV2aXZlciwgcmVwbGFjZXIpIHtcblx0cmV0dXJuIHtcblxuXHRcdHJlYWQ6IGZ1bmN0aW9uIChzdHIpIHtcblx0XHRcdHJldHVybiBKU09OLnBhcnNlKHN0ciwgcmV2aXZlcik7XG5cdFx0fSxcblxuXHRcdHdyaXRlOiBmdW5jdGlvbiAob2JqKSB7XG5cdFx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkob2JqLCByZXBsYWNlcik7XG5cdFx0fSxcblxuXHRcdGV4dGVuZDogY3JlYXRlQ29udmVydGVyXG5cblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVDb252ZXJ0ZXIoKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbmNvZGVkU3BhY2VSRSwgdXJsRW5jb2RlZFNwYWNlUkU7XG5cbmVuY29kZWRTcGFjZVJFID0gLyUyMC9nO1xudXJsRW5jb2RlZFNwYWNlUkUgPSAvXFwrL2c7XG5cbmZ1bmN0aW9uIHVybEVuY29kZShzdHIpIHtcblx0c3RyID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0cik7XG5cdC8vIHNwZWMgc2F5cyBzcGFjZSBzaG91bGQgYmUgZW5jb2RlZCBhcyAnKydcblx0cmV0dXJuIHN0ci5yZXBsYWNlKGVuY29kZWRTcGFjZVJFLCAnKycpO1xufVxuXG5mdW5jdGlvbiB1cmxEZWNvZGUoc3RyKSB7XG5cdC8vIHNwZWMgc2F5cyBzcGFjZSBzaG91bGQgYmUgZW5jb2RlZCBhcyAnKydcblx0c3RyID0gc3RyLnJlcGxhY2UodXJsRW5jb2RlZFNwYWNlUkUsICcgJyk7XG5cdHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kKHN0ciwgbmFtZSwgdmFsdWUpIHtcblx0aWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0dmFsdWUuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdHN0ciA9IGFwcGVuZChzdHIsIG5hbWUsIHZhbHVlKTtcblx0XHR9KTtcblx0fVxuXHRlbHNlIHtcblx0XHRpZiAoc3RyLmxlbmd0aCA+IDApIHtcblx0XHRcdHN0ciArPSAnJic7XG5cdFx0fVxuXHRcdHN0ciArPSB1cmxFbmNvZGUobmFtZSk7XG5cdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwpIHtcblx0XHRcdHN0ciArPSAnPScgKyB1cmxFbmNvZGUodmFsdWUpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gc3RyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuXHRyZWFkOiBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0dmFyIG9iaiA9IHt9O1xuXHRcdHN0ci5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24gKGVudHJ5KSB7XG5cdFx0XHR2YXIgcGFpciwgbmFtZSwgdmFsdWU7XG5cdFx0XHRwYWlyID0gZW50cnkuc3BsaXQoJz0nKTtcblx0XHRcdG5hbWUgPSB1cmxEZWNvZGUocGFpclswXSk7XG5cdFx0XHRpZiAocGFpci5sZW5ndGggPT09IDIpIHtcblx0XHRcdFx0dmFsdWUgPSB1cmxEZWNvZGUocGFpclsxXSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dmFsdWUgPSBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKG5hbWUgaW4gb2JqKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShvYmpbbmFtZV0pKSB7XG5cdFx0XHRcdFx0Ly8gY29udmVydCB0byBhbiBhcnJheSwgcGVyc2VydmluZyBjdXJybmVudCB2YWx1ZVxuXHRcdFx0XHRcdG9ialtuYW1lXSA9IFtvYmpbbmFtZV1dO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG9ialtuYW1lXS5wdXNoKHZhbHVlKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRvYmpbbmFtZV0gPSB2YWx1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gb2JqO1xuXHR9LFxuXG5cdHdyaXRlOiBmdW5jdGlvbiAob2JqKSB7XG5cdFx0dmFyIHN0ciA9ICcnO1xuXHRcdE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuXHRcdFx0c3RyID0gYXBwZW5kKHN0ciwgbmFtZSwgb2JqW25hbWVdKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gc3RyO1xuXHR9XG5cbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTQtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBNaWNoYWVsIEphY2tzb25cbiAqL1xuXG4vKiBnbG9iYWwgRm9ybURhdGEsIEZpbGUsIEJsb2IgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBpc0Zvcm1FbGVtZW50KG9iamVjdCkge1xuXHRyZXR1cm4gb2JqZWN0ICYmXG5cdFx0b2JqZWN0Lm5vZGVUeXBlID09PSAxICYmIC8vIE5vZGUuRUxFTUVOVF9OT0RFXG5cdFx0b2JqZWN0LnRhZ05hbWUgPT09ICdGT1JNJztcbn1cblxuZnVuY3Rpb24gY3JlYXRlRm9ybURhdGFGcm9tT2JqZWN0KG9iamVjdCkge1xuXHR2YXIgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcblxuXHR2YXIgdmFsdWU7XG5cdGZvciAodmFyIHByb3BlcnR5IGluIG9iamVjdCkge1xuXHRcdGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG5cdFx0XHR2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG5cblx0XHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIEZpbGUpIHtcblx0XHRcdFx0Zm9ybURhdGEuYXBwZW5kKHByb3BlcnR5LCB2YWx1ZSwgdmFsdWUubmFtZSk7XG5cdFx0XHR9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgQmxvYikge1xuXHRcdFx0XHRmb3JtRGF0YS5hcHBlbmQocHJvcGVydHksIHZhbHVlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvcm1EYXRhLmFwcGVuZChwcm9wZXJ0eSwgU3RyaW5nKHZhbHVlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGZvcm1EYXRhO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuXHR3cml0ZTogZnVuY3Rpb24gKG9iamVjdCkge1xuXHRcdGlmICh0eXBlb2YgRm9ybURhdGEgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1RoZSBtdWx0aXBhcnQvZm9ybS1kYXRhIG1pbWUgc2VyaWFsaXplciByZXF1aXJlcyBGb3JtRGF0YSBzdXBwb3J0Jyk7XG5cdFx0fVxuXG5cdFx0Ly8gU3VwcG9ydCBGb3JtRGF0YSBkaXJlY3RseS5cblx0XHRpZiAob2JqZWN0IGluc3RhbmNlb2YgRm9ybURhdGEpIHtcblx0XHRcdHJldHVybiBvYmplY3Q7XG5cdFx0fVxuXG5cdFx0Ly8gU3VwcG9ydCA8Zm9ybT4gZWxlbWVudHMuXG5cdFx0aWYgKGlzRm9ybUVsZW1lbnQob2JqZWN0KSkge1xuXHRcdFx0cmV0dXJuIG5ldyBGb3JtRGF0YShvYmplY3QpO1xuXHRcdH1cblxuXHRcdC8vIFN1cHBvcnQgcGxhaW4gb2JqZWN0cywgbWF5IGNvbnRhaW4gRmlsZS9CbG9iIGFzIHZhbHVlLlxuXHRcdGlmICh0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QgIT09IG51bGwpIHtcblx0XHRcdHJldHVybiBjcmVhdGVGb3JtRGF0YUZyb21PYmplY3Qob2JqZWN0KTtcblx0XHR9XG5cblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBjcmVhdGUgRm9ybURhdGEgZnJvbSBvYmplY3QgJyArIG9iamVjdCk7XG5cdH1cblxufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG5cdHJlYWQ6IGZ1bmN0aW9uIChzdHIpIHtcblx0XHRyZXR1cm4gc3RyO1xuXHR9LFxuXG5cdHdyaXRlOiBmdW5jdGlvbiAob2JqKSB7XG5cdFx0cmV0dXJuIG9iai50b1N0cmluZygpO1xuXHR9XG5cbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEF0dGVtcHQgdG8gaW52b2tlIGEgZnVuY3Rpb24gY2FwdHVyaW5nIHRoZSByZXN1bHRpbmcgdmFsdWUgYXMgYSBQcm9taXNlXG4gKlxuICogSWYgdGhlIG1ldGhvZCB0aHJvd3MsIHRoZSBjYXVnaHQgdmFsdWUgdXNlZCB0byByZWplY3QgdGhlIFByb21pc2UuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gd29yayBmdW5jdGlvbiB0byBpbnZva2VcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBQcm9taXNlIGZvciB0aGUgb3V0cHV0IG9mIHRoZSB3b3JrIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGF0dGVtcHQod29yaykge1xuXHR0cnkge1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUod29yaygpKTtcblx0fVxuXHRjYXRjaCAoZSkge1xuXHRcdHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGF0dGVtcHQ7XG4iLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDA5IE5pY2hvbGFzIEMuIFpha2FzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuLypcbiAqIEJhc2UgNjQgaW1wbGVtZW50YXRpb24gaW4gSmF2YVNjcmlwdFxuICogT3JpZ2luYWwgc291cmNlIGF2YWlsYWJsZSBhdCBodHRwczovL3Jhdy5naXRodWIuY29tL256YWthcy9jb21wdXRlci1zY2llbmNlLWluLWphdmFzY3JpcHQvMDJhMjc0NWI0YWE4MjE0ZjJjYWUxYmYwYjE1YjQ0N2NhMWE5MWIyMy9lbmNvZGluZ3MvYmFzZTY0L2Jhc2U2NC5qc1xuICpcbiAqIExpbnRlciByZWZpbmVtZW50IGJ5IFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qanNoaW50IGJpdHdpc2U6IGZhbHNlICovXG5cbnZhciBkaWdpdHMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbi8qKlxuICogQmFzZTY0LWVuY29kZXMgYSBzdHJpbmcgb2YgdGV4dC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBUaGUgdGV4dCB0byBlbmNvZGUuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBiYXNlNjQtZW5jb2RlZCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGJhc2U2NEVuY29kZSh0ZXh0KSB7XG5cblx0aWYgKC8oW15cXHUwMDAwLVxcdTAwZmZdKS8udGVzdCh0ZXh0KSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBiYXNlNjQgZW5jb2RlIG5vbi1BU0NJSSBjaGFyYWN0ZXJzLicpO1xuXHR9XG5cblx0dmFyIGkgPSAwLFxuXHRcdGN1ciwgcHJldiwgYnl0ZU51bSxcblx0XHRyZXN1bHQgPSBbXTtcblxuXHR3aGlsZSAoaSA8IHRleHQubGVuZ3RoKSB7XG5cblx0XHRjdXIgPSB0ZXh0LmNoYXJDb2RlQXQoaSk7XG5cdFx0Ynl0ZU51bSA9IGkgJSAzO1xuXG5cdFx0c3dpdGNoIChieXRlTnVtKSB7XG5cdFx0Y2FzZSAwOiAvL2ZpcnN0IGJ5dGVcblx0XHRcdHJlc3VsdC5wdXNoKGRpZ2l0cy5jaGFyQXQoY3VyID4+IDIpKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSAxOiAvL3NlY29uZCBieXRlXG5cdFx0XHRyZXN1bHQucHVzaChkaWdpdHMuY2hhckF0KChwcmV2ICYgMykgPDwgNCB8IChjdXIgPj4gNCkpKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSAyOiAvL3RoaXJkIGJ5dGVcblx0XHRcdHJlc3VsdC5wdXNoKGRpZ2l0cy5jaGFyQXQoKHByZXYgJiAweDBmKSA8PCAyIHwgKGN1ciA+PiA2KSkpO1xuXHRcdFx0cmVzdWx0LnB1c2goZGlnaXRzLmNoYXJBdChjdXIgJiAweDNmKSk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRwcmV2ID0gY3VyO1xuXHRcdGkgKz0gMTtcblx0fVxuXG5cdGlmIChieXRlTnVtID09PSAwKSB7XG5cdFx0cmVzdWx0LnB1c2goZGlnaXRzLmNoYXJBdCgocHJldiAmIDMpIDw8IDQpKTtcblx0XHRyZXN1bHQucHVzaCgnPT0nKTtcblx0fSBlbHNlIGlmIChieXRlTnVtID09PSAxKSB7XG5cdFx0cmVzdWx0LnB1c2goZGlnaXRzLmNoYXJBdCgocHJldiAmIDB4MGYpIDw8IDIpKTtcblx0XHRyZXN1bHQucHVzaCgnPScpO1xuXHR9XG5cblx0cmV0dXJuIHJlc3VsdC5qb2luKCcnKTtcbn1cblxuLyoqXG4gKiBCYXNlNjQtZGVjb2RlcyBhIHN0cmluZyBvZiB0ZXh0LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IFRoZSB0ZXh0IHRvIGRlY29kZS5cbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGJhc2U2NC1kZWNvZGVkIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYmFzZTY0RGVjb2RlKHRleHQpIHtcblxuXHQvL2lnbm9yZSB3aGl0ZSBzcGFjZVxuXHR0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXHMvZywgJycpO1xuXG5cdC8vZmlyc3QgY2hlY2sgZm9yIGFueSB1bmV4cGVjdGVkIGlucHV0XG5cdGlmICghKC9eW2EtejAtOVxcK1xcL1xcc10rXFw9ezAsMn0kL2kudGVzdCh0ZXh0KSkgfHwgdGV4dC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignTm90IGEgYmFzZTY0LWVuY29kZWQgc3RyaW5nLicpO1xuXHR9XG5cblx0Ly9sb2NhbCB2YXJpYWJsZXNcblx0dmFyIGN1ciwgcHJldiwgZGlnaXROdW0sXG5cdFx0aSA9IDAsXG5cdFx0cmVzdWx0ID0gW107XG5cblx0Ly9yZW1vdmUgYW55IGVxdWFscyBzaWduc1xuXHR0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXD0vZywgJycpO1xuXG5cdC8vbG9vcCBvdmVyIGVhY2ggY2hhcmFjdGVyXG5cdHdoaWxlIChpIDwgdGV4dC5sZW5ndGgpIHtcblxuXHRcdGN1ciA9IGRpZ2l0cy5pbmRleE9mKHRleHQuY2hhckF0KGkpKTtcblx0XHRkaWdpdE51bSA9IGkgJSA0O1xuXG5cdFx0c3dpdGNoIChkaWdpdE51bSkge1xuXG5cdFx0Ly9jYXNlIDA6IGZpcnN0IGRpZ2l0IC0gZG8gbm90aGluZywgbm90IGVub3VnaCBpbmZvIHRvIHdvcmsgd2l0aFxuXG5cdFx0Y2FzZSAxOiAvL3NlY29uZCBkaWdpdFxuXHRcdFx0cmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShwcmV2IDw8IDIgfCBjdXIgPj4gNCkpO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIDI6IC8vdGhpcmQgZGlnaXRcblx0XHRcdHJlc3VsdC5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoKHByZXYgJiAweDBmKSA8PCA0IHwgY3VyID4+IDIpKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSAzOiAvL2ZvdXJ0aCBkaWdpdFxuXHRcdFx0cmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZSgocHJldiAmIDMpIDw8IDYgfCBjdXIpKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHByZXYgPSBjdXI7XG5cdFx0aSArPSAxO1xuXHR9XG5cblx0Ly9yZXR1cm4gYSBzdHJpbmdcblx0cmV0dXJuIHJlc3VsdC5qb2luKCcnKTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0ZW5jb2RlOiBiYXNlNjRFbmNvZGUsXG5cdGRlY29kZTogYmFzZTY0RGVjb2RlXG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEzLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cblx0LyoqXG5cdCAqIEZpbmQgb2JqZWN0cyB3aXRoaW4gYSBncmFwaCB0aGUgY29udGFpbiBhIHByb3BlcnR5IG9mIGEgY2VydGFpbiBuYW1lLlxuXHQgKlxuXHQgKiBOT1RFOiB0aGlzIG1ldGhvZCB3aWxsIG5vdCBkaXNjb3ZlciBvYmplY3QgZ3JhcGggY3ljbGVzLlxuXHQgKlxuXHQgKiBAcGFyYW0geyp9IG9iaiBvYmplY3QgdG8gc2VhcmNoIG9uXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wIG5hbWUgb2YgdGhlIHByb3BlcnR5IHRvIHNlYXJjaCBmb3Jcblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgZm91bmQgcHJvcGVydGllcyBhbmQgdGhlaXIgcGFyZW50XG5cdCAqL1xuXHRmaW5kUHJvcGVydGllczogZnVuY3Rpb24gZmluZFByb3BlcnRpZXMob2JqLCBwcm9wLCBjYWxsYmFjaykge1xuXHRcdGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCBvYmogPT09IG51bGwpIHsgcmV0dXJuOyB9XG5cdFx0aWYgKHByb3AgaW4gb2JqKSB7XG5cdFx0XHRjYWxsYmFjayhvYmpbcHJvcF0sIG9iaiwgcHJvcCk7XG5cdFx0fVxuXHRcdE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRmaW5kUHJvcGVydGllcyhvYmpba2V5XSwgcHJvcCwgY2FsbGJhY2spO1xuXHRcdH0pO1xuXHR9XG5cbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXR0ZW1wdCA9IHJlcXVpcmUoJy4vYXR0ZW1wdCcpO1xuXG4vKipcbiAqIENyZWF0ZSBhIHByb21pc2Ugd2hvc2Ugd29yayBpcyBzdGFydGVkIG9ubHkgd2hlbiBhIGhhbmRsZXIgaXMgcmVnaXN0ZXJlZC5cbiAqXG4gKiBUaGUgd29yayBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgYXQgbW9zdCBvbmNlLiBUaHJvd24gdmFsdWVzIHdpbGwgcmVzdWx0XG4gKiBpbiBwcm9taXNlIHJlamVjdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB3b3JrIGZ1bmN0aW9uIHdob3NlIG91cHV0IGlzIHVzZWQgdG8gcmVzb2x2ZSB0aGVcbiAqICAgcmV0dXJuZWQgcHJvbWlzZS5cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBhIGxhenkgcHJvbWlzZVxuICovXG5mdW5jdGlvbiBsYXp5UHJvbWlzZSh3b3JrKSB7XG5cdHZhciBzdGFydGVkLCByZXNvbHZlciwgcHJvbWlzZSwgdGhlbjtcblxuXHRzdGFydGVkID0gZmFsc2U7XG5cblx0cHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRyZXNvbHZlciA9IHtcblx0XHRcdHJlc29sdmU6IHJlc29sdmUsXG5cdFx0XHRyZWplY3Q6IHJlamVjdFxuXHRcdH07XG5cdH0pO1xuXHR0aGVuID0gcHJvbWlzZS50aGVuO1xuXG5cdHByb21pc2UudGhlbiA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIXN0YXJ0ZWQpIHtcblx0XHRcdHN0YXJ0ZWQgPSB0cnVlO1xuXHRcdFx0YXR0ZW1wdCh3b3JrKS50aGVuKHJlc29sdmVyLnJlc29sdmUsIHJlc29sdmVyLnJlamVjdCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGVuLmFwcGx5KHByb21pc2UsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0cmV0dXJuIHByb21pc2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbGF6eVByb21pc2U7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW1wdHkgPSB7fTtcblxuLyoqXG4gKiBNaXggdGhlIHByb3BlcnRpZXMgZnJvbSB0aGUgc291cmNlIG9iamVjdCBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gKiBXaGVuIHRoZSBzYW1lIHByb3BlcnR5IG9jY3VycyBpbiBtb3JlIHRoZW4gb25lIG9iamVjdCwgdGhlIHJpZ2h0IG1vc3RcbiAqIHZhbHVlIHdpbnMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRlc3QgdGhlIG9iamVjdCB0byBjb3B5IHByb3BlcnRpZXMgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBzb3VyY2VzIHRoZSBvYmplY3RzIHRvIGNvcHkgcHJvcGVydGllcyBmcm9tLiAgTWF5IGJlIDEgdG8gTiBhcmd1bWVudHMsIGJ1dCBub3QgYW4gQXJyYXkuXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBkZXN0aW5hdGlvbiBvYmplY3RcbiAqL1xuZnVuY3Rpb24gbWl4aW4oZGVzdCAvKiwgc291cmNlcy4uLiAqLykge1xuXHR2YXIgaSwgbCwgc291cmNlLCBuYW1lO1xuXG5cdGlmICghZGVzdCkgeyBkZXN0ID0ge307IH1cblx0Zm9yIChpID0gMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyBpICs9IDEpIHtcblx0XHRzb3VyY2UgPSBhcmd1bWVudHNbaV07XG5cdFx0Zm9yIChuYW1lIGluIHNvdXJjZSkge1xuXHRcdFx0aWYgKCEobmFtZSBpbiBkZXN0KSB8fCAoZGVzdFtuYW1lXSAhPT0gc291cmNlW25hbWVdICYmICghKG5hbWUgaW4gZW1wdHkpIHx8IGVtcHR5W25hbWVdICE9PSBzb3VyY2VbbmFtZV0pKSkge1xuXHRcdFx0XHRkZXN0W25hbWVdID0gc291cmNlW25hbWVdO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBkZXN0OyAvLyBPYmplY3Rcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtaXhpbjtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogTm9ybWFsaXplIEhUVFAgaGVhZGVyIG5hbWVzIHVzaW5nIHRoZSBwc2V1ZG8gY2FtZWwgY2FzZS5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqICAgY29udGVudC10eXBlICAgICAgICAgLT4gQ29udGVudC1UeXBlXG4gKiAgIGFjY2VwdHMgICAgICAgICAgICAgIC0+IEFjY2VwdHNcbiAqICAgeC1jdXN0b20taGVhZGVyLW5hbWUgLT4gWC1DdXN0b20tSGVhZGVyLU5hbWVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgcmF3IGhlYWRlciBuYW1lXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHRoZSBub3JtYWxpemVkIGhlYWRlciBuYW1lXG4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZUhlYWRlck5hbWUobmFtZSkge1xuXHRyZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG5cdFx0LnNwbGl0KCctJylcblx0XHQubWFwKGZ1bmN0aW9uIChjaHVuaykgeyByZXR1cm4gY2h1bmsuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjaHVuay5zbGljZSgxKTsgfSlcblx0XHQuam9pbignLScpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5vcm1hbGl6ZUhlYWRlck5hbWU7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTQtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKmpzaGludCBsYXRlZGVmOiBub2Z1bmMgKi9cblxudmFyIG5vcm1hbGl6ZUhlYWRlck5hbWUgPSByZXF1aXJlKCcuL25vcm1hbGl6ZUhlYWRlck5hbWUnKTtcblxuZnVuY3Rpb24gcHJvcGVydHkocHJvbWlzZSwgbmFtZSkge1xuXHRyZXR1cm4gcHJvbWlzZS50aGVuKFxuXHRcdGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHZhbHVlICYmIHZhbHVlW25hbWVdO1xuXHRcdH0sXG5cdFx0ZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QodmFsdWUgJiYgdmFsdWVbbmFtZV0pO1xuXHRcdH1cblx0KTtcbn1cblxuLyoqXG4gKiBPYnRhaW4gdGhlIHJlc3BvbnNlIGVudGl0eVxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBmb3IgdGhlIHJlc3BvbnNlIGVudGl0eVxuICovXG5mdW5jdGlvbiBlbnRpdHkoKSB7XG5cdC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG5cdHJldHVybiBwcm9wZXJ0eSh0aGlzLCAnZW50aXR5Jyk7XG59XG5cbi8qKlxuICogT2J0YWluIHRoZSByZXNwb25zZSBzdGF0dXNcbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gZm9yIHRoZSByZXNwb25zZSBzdGF0dXNcbiAqL1xuZnVuY3Rpb24gc3RhdHVzKCkge1xuXHQvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuXHRyZXR1cm4gcHJvcGVydHkocHJvcGVydHkodGhpcywgJ3N0YXR1cycpLCAnY29kZScpO1xufVxuXG4vKipcbiAqIE9idGFpbiB0aGUgcmVzcG9uc2UgaGVhZGVycyBtYXBcbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gZm9yIHRoZSByZXNwb25zZSBoZWFkZXJzIG1hcFxuICovXG5mdW5jdGlvbiBoZWFkZXJzKCkge1xuXHQvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuXHRyZXR1cm4gcHJvcGVydHkodGhpcywgJ2hlYWRlcnMnKTtcbn1cblxuLyoqXG4gKiBPYnRhaW4gYSBzcGVjaWZpYyByZXNwb25zZSBoZWFkZXJcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaGVhZGVyTmFtZSB0aGUgaGVhZGVyIHRvIHJldHJpZXZlXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gZm9yIHRoZSByZXNwb25zZSBoZWFkZXIncyB2YWx1ZVxuICovXG5mdW5jdGlvbiBoZWFkZXIoaGVhZGVyTmFtZSkge1xuXHQvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuXHRoZWFkZXJOYW1lID0gbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXJOYW1lKTtcblx0cmV0dXJuIHByb3BlcnR5KHRoaXMuaGVhZGVycygpLCBoZWFkZXJOYW1lKTtcbn1cblxuLyoqXG4gKiBGb2xsb3cgYSByZWxhdGVkIHJlc291cmNlXG4gKlxuICogVGhlIHJlbGF0aW9uc2hpcCB0byBmb2xsb3cgbWF5IGJlIGRlZmluZSBhcyBhIHBsYWluIHN0cmluZywgYW4gb2JqZWN0XG4gKiB3aXRoIHRoZSByZWwgYW5kIHBhcmFtcywgb3IgYW4gYXJyYXkgY29udGFpbmluZyBvbmUgb3IgbW9yZSBlbnRyaWVzXG4gKiB3aXRoIHRoZSBwcmV2aW91cyBmb3Jtcy5cbiAqXG4gKiBFeGFtcGxlczpcbiAqICAgcmVzcG9uc2UuZm9sbG93KCduZXh0JylcbiAqXG4gKiAgIHJlc3BvbnNlLmZvbGxvdyh7IHJlbDogJ25leHQnLCBwYXJhbXM6IHsgcGFnZVNpemU6IDEwMCB9IH0pXG4gKlxuICogICByZXNwb25zZS5mb2xsb3coW1xuICogICAgICAgeyByZWw6ICdpdGVtcycsIHBhcmFtczogeyBwcm9qZWN0aW9uOiAnbm9JbWFnZXMnIH0gfSxcbiAqICAgICAgICdzZWFyY2gnLFxuICogICAgICAgeyByZWw6ICdmaW5kQnlHYWxsZXJ5SXNOdWxsJywgcGFyYW1zOiB7IHByb2plY3Rpb246ICdub0ltYWdlcycgfSB9LFxuICogICAgICAgJ2l0ZW1zJ1xuICogICBdKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdHxBcnJheX0gcmVscyBvbmUsIG9yIG1vcmUsIHJlbGF0aW9uc2hpcHMgdG8gZm9sbG93XG4gKiBAcmV0dXJucyBSZXNwb25zZVByb21pc2U8UmVzcG9uc2U+IHJlbGF0ZWQgcmVzb3VyY2VcbiAqL1xuZnVuY3Rpb24gZm9sbG93KHJlbHMpIHtcblx0Lypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cblx0cmVscyA9IFtdLmNvbmNhdChyZWxzKTtcblxuXHRyZXR1cm4gbWFrZShyZWxzLnJlZHVjZShmdW5jdGlvbiAocmVzcG9uc2UsIHJlbCkge1xuXHRcdHJldHVybiByZXNwb25zZS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuXHRcdFx0aWYgKHR5cGVvZiByZWwgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdHJlbCA9IHsgcmVsOiByZWwgfTtcblx0XHRcdH1cblx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZW50aXR5LmNsaWVudEZvciAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0h5cGVybWVkaWEgcmVzcG9uc2UgZXhwZWN0ZWQnKTtcblx0XHRcdH1cblx0XHRcdHZhciBjbGllbnQgPSByZXNwb25zZS5lbnRpdHkuY2xpZW50Rm9yKHJlbC5yZWwpO1xuXHRcdFx0cmV0dXJuIGNsaWVudCh7IHBhcmFtczogcmVsLnBhcmFtcyB9KTtcblx0XHR9KTtcblx0fSwgdGhpcykpO1xufVxuXG4vKipcbiAqIFdyYXAgYSBQcm9taXNlIGFzIGFuIFJlc3BvbnNlUHJvbWlzZVxuICpcbiAqIEBwYXJhbSB7UHJvbWlzZTxSZXNwb25zZT59IHByb21pc2UgdGhlIHByb21pc2UgZm9yIGFuIEhUVFAgUmVzcG9uc2VcbiAqIEByZXR1cm5zIHtSZXNwb25zZVByb21pc2U8UmVzcG9uc2U+fSB3cmFwcGVkIHByb21pc2UgZm9yIFJlc3BvbnNlIHdpdGggYWRkaXRpb25hbCBoZWxwZXIgbWV0aG9kc1xuICovXG5mdW5jdGlvbiBtYWtlKHByb21pc2UpIHtcblx0cHJvbWlzZS5zdGF0dXMgPSBzdGF0dXM7XG5cdHByb21pc2UuaGVhZGVycyA9IGhlYWRlcnM7XG5cdHByb21pc2UuaGVhZGVyID0gaGVhZGVyO1xuXHRwcm9taXNlLmVudGl0eSA9IGVudGl0eTtcblx0cHJvbWlzZS5mb2xsb3cgPSBmb2xsb3c7XG5cdHJldHVybiBwcm9taXNlO1xufVxuXG5mdW5jdGlvbiByZXNwb25zZVByb21pc2Uob2JqLCBjYWxsYmFjaywgZXJyYmFjaykge1xuXHRyZXR1cm4gbWFrZShQcm9taXNlLnJlc29sdmUob2JqKS50aGVuKGNhbGxiYWNrLCBlcnJiYWNrKSk7XG59XG5cbnJlc3BvbnNlUHJvbWlzZS5tYWtlID0gbWFrZTtcbnJlc3BvbnNlUHJvbWlzZS5yZWplY3QgPSBmdW5jdGlvbiAodmFsKSB7XG5cdHJldHVybiBtYWtlKFByb21pc2UucmVqZWN0KHZhbCkpO1xufTtcbnJlc3BvbnNlUHJvbWlzZS5wcm9taXNlID0gZnVuY3Rpb24gKGZ1bmMpIHtcblx0cmV0dXJuIG1ha2UobmV3IFByb21pc2UoZnVuYykpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXNwb25zZVByb21pc2U7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2hhck1hcDtcblxuY2hhck1hcCA9IChmdW5jdGlvbiAoKSB7XG5cdHZhciBzdHJpbmdzID0ge1xuXHRcdGFscGhhOiAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicsXG5cdFx0ZGlnaXQ6ICcwMTIzNDU2Nzg5J1xuXHR9O1xuXG5cdHN0cmluZ3MuZ2VuRGVsaW1zID0gJzovPyNbXUAnO1xuXHRzdHJpbmdzLnN1YkRlbGltcyA9ICchJCZcXCcoKSorLDs9Jztcblx0c3RyaW5ncy5yZXNlcnZlZCA9IHN0cmluZ3MuZ2VuRGVsaW1zICsgc3RyaW5ncy5zdWJEZWxpbXM7XG5cdHN0cmluZ3MudW5yZXNlcnZlZCA9IHN0cmluZ3MuYWxwaGEgKyBzdHJpbmdzLmRpZ2l0ICsgJy0uX34nO1xuXHRzdHJpbmdzLnVybCA9IHN0cmluZ3MucmVzZXJ2ZWQgKyBzdHJpbmdzLnVucmVzZXJ2ZWQ7XG5cdHN0cmluZ3Muc2NoZW1lID0gc3RyaW5ncy5hbHBoYSArIHN0cmluZ3MuZGlnaXQgKyAnKy0uJztcblx0c3RyaW5ncy51c2VyaW5mbyA9IHN0cmluZ3MudW5yZXNlcnZlZCArIHN0cmluZ3Muc3ViRGVsaW1zICsgJzonO1xuXHRzdHJpbmdzLmhvc3QgPSBzdHJpbmdzLnVucmVzZXJ2ZWQgKyBzdHJpbmdzLnN1YkRlbGltcztcblx0c3RyaW5ncy5wb3J0ID0gc3RyaW5ncy5kaWdpdDtcblx0c3RyaW5ncy5wY2hhciA9IHN0cmluZ3MudW5yZXNlcnZlZCArIHN0cmluZ3Muc3ViRGVsaW1zICsgJzpAJztcblx0c3RyaW5ncy5zZWdtZW50ID0gc3RyaW5ncy5wY2hhcjtcblx0c3RyaW5ncy5wYXRoID0gc3RyaW5ncy5zZWdtZW50ICsgJy8nO1xuXHRzdHJpbmdzLnF1ZXJ5ID0gc3RyaW5ncy5wY2hhciArICcvPyc7XG5cdHN0cmluZ3MuZnJhZ21lbnQgPSBzdHJpbmdzLnBjaGFyICsgJy8/JztcblxuXHRyZXR1cm4gT2JqZWN0LmtleXMoc3RyaW5ncykucmVkdWNlKGZ1bmN0aW9uIChjaGFyTWFwLCBzZXQpIHtcblx0XHRjaGFyTWFwW3NldF0gPSBzdHJpbmdzW3NldF0uc3BsaXQoJycpLnJlZHVjZShmdW5jdGlvbiAoY2hhcnMsIG15Q2hhcikge1xuXHRcdFx0Y2hhcnNbbXlDaGFyXSA9IHRydWU7XG5cdFx0XHRyZXR1cm4gY2hhcnM7XG5cdFx0fSwge30pO1xuXHRcdHJldHVybiBjaGFyTWFwO1xuXHR9LCB7fSk7XG59KCkpO1xuXG5mdW5jdGlvbiBlbmNvZGUoc3RyLCBhbGxvd2VkKSB7XG5cdGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuXHRcdHRocm93IG5ldyBFcnJvcignU3RyaW5nIHJlcXVpcmVkIGZvciBVUkwgZW5jb2RpbmcnKTtcblx0fVxuXHRyZXR1cm4gc3RyLnNwbGl0KCcnKS5tYXAoZnVuY3Rpb24gKG15Q2hhcikge1xuXHRcdGlmIChhbGxvd2VkLmhhc093blByb3BlcnR5KG15Q2hhcikpIHtcblx0XHRcdHJldHVybiBteUNoYXI7XG5cdFx0fVxuXHRcdHZhciBjb2RlID0gbXlDaGFyLmNoYXJDb2RlQXQoMCk7XG5cdFx0aWYgKGNvZGUgPD0gMTI3KSB7XG5cdFx0XHR2YXIgZW5jb2RlZCA9IGNvZGUudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XG4gXHRcdFx0cmV0dXJuICclJyArIChlbmNvZGVkLmxlbmd0aCAlIDIgPT09IDEgPyAnMCcgOiAnJykgKyBlbmNvZGVkO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJldHVybiBlbmNvZGVVUklDb21wb25lbnQobXlDaGFyKS50b1VwcGVyQ2FzZSgpO1xuXHRcdH1cblx0fSkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIG1ha2VFbmNvZGVyKGFsbG93ZWQpIHtcblx0YWxsb3dlZCA9IGFsbG93ZWQgfHwgY2hhck1hcC51bnJlc2VydmVkO1xuXHRyZXR1cm4gZnVuY3Rpb24gKHN0cikge1xuXHRcdHJldHVybiBlbmNvZGUoc3RyLCBhbGxvd2VkKTtcblx0fTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlKHN0cikge1xuXHRyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG5cdC8qXG5cdCAqIERlY29kZSBVUkwgZW5jb2RlZCBzdHJpbmdzXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0ICogQHJldHVybnMge3N0cmluZ30gVVJMIGRlY29kZWQgc3RyaW5nXG5cdCAqL1xuXHRkZWNvZGU6IGRlY29kZSxcblxuXHQvKlxuXHQgKiBVUkwgZW5jb2RlIGEgc3RyaW5nXG5cdCAqXG5cdCAqIEFsbCBidXQgYWxwaGEtbnVtZXJpY3MgYW5kIGEgdmVyeSBsaW1pdGVkIHNldCBvZiBwdW5jdHVhdGlvbiAtIC4gXyB+IGFyZVxuXHQgKiBlbmNvZGVkLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0ICovXG5cdGVuY29kZTogbWFrZUVuY29kZXIoKSxcblxuXHQvKlxuXHQqIFVSTCBlbmNvZGUgYSBVUkxcblx0KlxuXHQqIEFsbCBjaGFyYWN0ZXIgcGVybWl0dGVkIGFueXdoZXJlIGluIGEgVVJMIGFyZSBsZWZ0IHVuZW5jb2RlZCBldmVuXG5cdCogaWYgdGhhdCBjaGFyYWN0ZXIgaXMgbm90IHBlcm1pdHRlZCBpbiB0aGF0IHBvcnRpb24gb2YgYSBVUkwuXG5cdCpcblx0KiBOb3RlOiBUaGlzIG1ldGhvZCBpcyB0eXBpY2FsbHkgbm90IHdoYXQgeW91IHdhbnQuXG5cdCpcblx0KiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHQqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHQqL1xuXHRlbmNvZGVVUkw6IG1ha2VFbmNvZGVyKGNoYXJNYXAudXJsKSxcblxuXHQvKlxuXHQgKiBVUkwgZW5jb2RlIHRoZSBzY2hlbWUgcG9ydGlvbiBvZiBhIFVSTFxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0ICovXG5cdGVuY29kZVNjaGVtZTogbWFrZUVuY29kZXIoY2hhck1hcC5zY2hlbWUpLFxuXG5cdC8qXG5cdCAqIFVSTCBlbmNvZGUgdGhlIHVzZXIgaW5mbyBwb3J0aW9uIG9mIGEgVVJMXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHQgKi9cblx0ZW5jb2RlVXNlckluZm86IG1ha2VFbmNvZGVyKGNoYXJNYXAudXNlcmluZm8pLFxuXG5cdC8qXG5cdCAqIFVSTCBlbmNvZGUgdGhlIGhvc3QgcG9ydGlvbiBvZiBhIFVSTFxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0ICovXG5cdGVuY29kZUhvc3Q6IG1ha2VFbmNvZGVyKGNoYXJNYXAuaG9zdCksXG5cblx0Lypcblx0ICogVVJMIGVuY29kZSB0aGUgcG9ydCBwb3J0aW9uIG9mIGEgVVJMXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHQgKi9cblx0ZW5jb2RlUG9ydDogbWFrZUVuY29kZXIoY2hhck1hcC5wb3J0KSxcblxuXHQvKlxuXHQgKiBVUkwgZW5jb2RlIGEgcGF0aCBzZWdtZW50IHBvcnRpb24gb2YgYSBVUkxcblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0ICogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdCAqL1xuXHRlbmNvZGVQYXRoU2VnbWVudDogbWFrZUVuY29kZXIoY2hhck1hcC5zZWdtZW50KSxcblxuXHQvKlxuXHQgKiBVUkwgZW5jb2RlIHRoZSBwYXRoIHBvcnRpb24gb2YgYSBVUkxcblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0ICogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdCAqL1xuXHRlbmNvZGVQYXRoOiBtYWtlRW5jb2RlcihjaGFyTWFwLnBhdGgpLFxuXG5cdC8qXG5cdCAqIFVSTCBlbmNvZGUgdGhlIHF1ZXJ5IHBvcnRpb24gb2YgYSBVUkxcblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0ICogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdCAqL1xuXHRlbmNvZGVRdWVyeTogbWFrZUVuY29kZXIoY2hhck1hcC5xdWVyeSksXG5cblx0Lypcblx0ICogVVJMIGVuY29kZSB0aGUgZnJhZ21lbnQgcG9ydGlvbiBvZiBhIFVSTFxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0ICovXG5cdGVuY29kZUZyYWdtZW50OiBtYWtlRW5jb2RlcihjaGFyTWFwLmZyYWdtZW50KVxuXG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1LTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHVyaUVuY29kZXIsIG9wZXJhdGlvbnMsIHByZWZpeFJFO1xuXG51cmlFbmNvZGVyID0gcmVxdWlyZSgnLi91cmlFbmNvZGVyJyk7XG5cbnByZWZpeFJFID0gL14oW146XSopOihbMC05XSspJC87XG5vcGVyYXRpb25zID0ge1xuXHQnJzogIHsgZmlyc3Q6ICcnLCAgc2VwYXJhdG9yOiAnLCcsIG5hbWVkOiBmYWxzZSwgZW1wdHk6ICcnLCAgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGUgfSxcblx0JysnOiB7IGZpcnN0OiAnJywgIHNlcGFyYXRvcjogJywnLCBuYW1lZDogZmFsc2UsIGVtcHR5OiAnJywgIGVuY29kZXI6IHVyaUVuY29kZXIuZW5jb2RlVVJMIH0sXG5cdCcjJzogeyBmaXJzdDogJyMnLCBzZXBhcmF0b3I6ICcsJywgbmFtZWQ6IGZhbHNlLCBlbXB0eTogJycsICBlbmNvZGVyOiB1cmlFbmNvZGVyLmVuY29kZVVSTCB9LFxuXHQnLic6IHsgZmlyc3Q6ICcuJywgc2VwYXJhdG9yOiAnLicsIG5hbWVkOiBmYWxzZSwgZW1wdHk6ICcnLCAgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGUgfSxcblx0Jy8nOiB7IGZpcnN0OiAnLycsIHNlcGFyYXRvcjogJy8nLCBuYW1lZDogZmFsc2UsIGVtcHR5OiAnJywgIGVuY29kZXI6IHVyaUVuY29kZXIuZW5jb2RlIH0sXG5cdCc7JzogeyBmaXJzdDogJzsnLCBzZXBhcmF0b3I6ICc7JywgbmFtZWQ6IHRydWUsICBlbXB0eTogJycsICBlbmNvZGVyOiB1cmlFbmNvZGVyLmVuY29kZSB9LFxuXHQnPyc6IHsgZmlyc3Q6ICc/Jywgc2VwYXJhdG9yOiAnJicsIG5hbWVkOiB0cnVlLCAgZW1wdHk6ICc9JywgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGUgfSxcblx0JyYnOiB7IGZpcnN0OiAnJicsIHNlcGFyYXRvcjogJyYnLCBuYW1lZDogdHJ1ZSwgIGVtcHR5OiAnPScsIGVuY29kZXI6IHVyaUVuY29kZXIuZW5jb2RlIH0sXG5cdCc9JzogeyByZXNlcnZlZDogdHJ1ZSB9LFxuXHQnLCc6IHsgcmVzZXJ2ZWQ6IHRydWUgfSxcblx0JyEnOiB7IHJlc2VydmVkOiB0cnVlIH0sXG5cdCdAJzogeyByZXNlcnZlZDogdHJ1ZSB9LFxuXHQnfCc6IHsgcmVzZXJ2ZWQ6IHRydWUgfVxufTtcblxuZnVuY3Rpb24gYXBwbHkob3BlcmF0aW9uLCBleHByZXNzaW9uLCBwYXJhbXMpIHtcblx0Lypqc2hpbnQgbWF4Y29tcGxleGl0eToxMSAqL1xuXHRyZXR1cm4gZXhwcmVzc2lvbi5zcGxpdCgnLCcpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2YXJpYWJsZSkge1xuXHRcdHZhciBvcHRzLCB2YWx1ZTtcblxuXHRcdG9wdHMgPSB7fTtcblx0XHRpZiAodmFyaWFibGUuc2xpY2UoLTEpID09PSAnKicpIHtcblx0XHRcdHZhcmlhYmxlID0gdmFyaWFibGUuc2xpY2UoMCwgLTEpO1xuXHRcdFx0b3B0cy5leHBsb2RlID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKHByZWZpeFJFLnRlc3QodmFyaWFibGUpKSB7XG5cdFx0XHR2YXIgcHJlZml4ID0gcHJlZml4UkUuZXhlYyh2YXJpYWJsZSk7XG5cdFx0XHR2YXJpYWJsZSA9IHByZWZpeFsxXTtcblx0XHRcdG9wdHMubWF4TGVuZ3RoID0gcGFyc2VJbnQocHJlZml4WzJdKTtcblx0XHR9XG5cblx0XHR2YXJpYWJsZSA9IHVyaUVuY29kZXIuZGVjb2RlKHZhcmlhYmxlKTtcblx0XHR2YWx1ZSA9IHBhcmFtc1t2YXJpYWJsZV07XG5cblx0XHRpZiAodmFsdWUgPT09IHZvaWQgMCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0XHRyZXN1bHQgPSB2YWx1ZS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgdmFsdWUpIHtcblx0XHRcdFx0aWYgKHJlc3VsdC5sZW5ndGgpIHtcblx0XHRcdFx0XHRyZXN1bHQgKz0gb3B0cy5leHBsb2RlID8gb3BlcmF0aW9uLnNlcGFyYXRvciA6ICcsJztcblx0XHRcdFx0XHRpZiAob3BlcmF0aW9uLm5hbWVkICYmIG9wdHMuZXhwbG9kZSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhcmlhYmxlKTtcblx0XHRcdFx0XHRcdHJlc3VsdCArPSB2YWx1ZS5sZW5ndGggPyAnPScgOiBvcGVyYXRpb24uZW1wdHk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdCArPSBvcGVyYXRpb24uZmlyc3Q7XG5cdFx0XHRcdFx0aWYgKG9wZXJhdGlvbi5uYW1lZCkge1xuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhcmlhYmxlKTtcblx0XHRcdFx0XHRcdHJlc3VsdCArPSB2YWx1ZS5sZW5ndGggPyAnPScgOiBvcGVyYXRpb24uZW1wdHk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJlc3VsdCArPSBvcGVyYXRpb24uZW5jb2Rlcih2YWx1ZSk7XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LCByZXN1bHQpO1xuXHRcdH1cblx0XHRlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRyZXN1bHQgPSBPYmplY3Qua2V5cyh2YWx1ZSkucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIG5hbWUpIHtcblx0XHRcdFx0aWYgKHJlc3VsdC5sZW5ndGgpIHtcblx0XHRcdFx0XHRyZXN1bHQgKz0gb3B0cy5leHBsb2RlID8gb3BlcmF0aW9uLnNlcGFyYXRvciA6ICcsJztcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmZpcnN0O1xuXHRcdFx0XHRcdGlmIChvcGVyYXRpb24ubmFtZWQgJiYgIW9wdHMuZXhwbG9kZSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhcmlhYmxlKTtcblx0XHRcdFx0XHRcdHJlc3VsdCArPSB2YWx1ZVtuYW1lXS5sZW5ndGggPyAnPScgOiBvcGVyYXRpb24uZW1wdHk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJlc3VsdCArPSBvcGVyYXRpb24uZW5jb2RlcihuYW1lKTtcblx0XHRcdFx0cmVzdWx0ICs9IG9wdHMuZXhwbG9kZSA/ICc9JyA6ICcsJztcblx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhbHVlW25hbWVdKTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sIHJlc3VsdCk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dmFsdWUgPSBTdHJpbmcodmFsdWUpO1xuXHRcdFx0aWYgKG9wdHMubWF4TGVuZ3RoKSB7XG5cdFx0XHRcdHZhbHVlID0gdmFsdWUuc2xpY2UoMCwgb3B0cy5tYXhMZW5ndGgpO1xuXHRcdFx0fVxuXHRcdFx0cmVzdWx0ICs9IHJlc3VsdC5sZW5ndGggPyBvcGVyYXRpb24uc2VwYXJhdG9yIDogb3BlcmF0aW9uLmZpcnN0O1xuXHRcdFx0aWYgKG9wZXJhdGlvbi5uYW1lZCkge1xuXHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFyaWFibGUpO1xuXHRcdFx0XHRyZXN1bHQgKz0gdmFsdWUubGVuZ3RoID8gJz0nIDogb3BlcmF0aW9uLmVtcHR5O1xuXHRcdFx0fVxuXHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhbHVlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LCAnJyk7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZEV4cHJlc3Npb24oZXhwcmVzc2lvbiwgcGFyYW1zKSB7XG5cdHZhciBvcGVyYXRpb247XG5cblx0b3BlcmF0aW9uID0gb3BlcmF0aW9uc1tleHByZXNzaW9uLnNsaWNlKDAsMSldO1xuXHRpZiAob3BlcmF0aW9uKSB7XG5cdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc2xpY2UoMSk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0b3BlcmF0aW9uID0gb3BlcmF0aW9uc1snJ107XG5cdH1cblxuXHRpZiAob3BlcmF0aW9uLnJlc2VydmVkKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdSZXNlcnZlZCBleHByZXNzaW9uIG9wZXJhdGlvbnMgYXJlIG5vdCBzdXBwb3J0ZWQnKTtcblx0fVxuXG5cdHJldHVybiBhcHBseShvcGVyYXRpb24sIGV4cHJlc3Npb24sIHBhcmFtcyk7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZFRlbXBsYXRlKHRlbXBsYXRlLCBwYXJhbXMpIHtcblx0dmFyIHN0YXJ0LCBlbmQsIHVyaTtcblxuXHR1cmkgPSAnJztcblx0ZW5kID0gMDtcblx0d2hpbGUgKHRydWUpIHtcblx0XHRzdGFydCA9IHRlbXBsYXRlLmluZGV4T2YoJ3snLCBlbmQpO1xuXHRcdGlmIChzdGFydCA9PT0gLTEpIHtcblx0XHRcdC8vIG5vIG1vcmUgZXhwcmVzc2lvbnNcblx0XHRcdHVyaSArPSB0ZW1wbGF0ZS5zbGljZShlbmQpO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHRcdHVyaSArPSB0ZW1wbGF0ZS5zbGljZShlbmQsIHN0YXJ0KTtcblx0XHRlbmQgPSB0ZW1wbGF0ZS5pbmRleE9mKCd9Jywgc3RhcnQpICsgMTtcblx0XHR1cmkgKz0gZXhwYW5kRXhwcmVzc2lvbih0ZW1wbGF0ZS5zbGljZShzdGFydCArIDEsIGVuZCAtIDEpLCBwYXJhbXMpO1xuXHR9XG5cblx0cmV0dXJuIHVyaTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cblx0LyoqXG5cdCAqIEV4cGFuZCBhIFVSSSBUZW1wbGF0ZSB3aXRoIHBhcmFtZXRlcnMgdG8gZm9ybSBhIFVSSS5cblx0ICpcblx0ICogRnVsbCBpbXBsZW1lbnRhdGlvbiAobGV2ZWwgNCkgb2YgcmZjNjU3MC5cblx0ICogQHNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjU3MFxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGVtcGxhdGUgVVJJIHRlbXBsYXRlXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSBwYXJhbXMgdG8gYXBwbHkgdG8gdGhlIHRlbXBsYXRlIGR1cnJpbmcgZXhwYW50aW9uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IGV4cGFuZGVkIFVSSVxuXHQgKi9cblx0ZXhwYW5kOiBleHBhbmRUZW1wbGF0ZVxuXG59O1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiJdfQ==
