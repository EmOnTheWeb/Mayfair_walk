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
	
	//read existing gpx files into select menu 
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFileSystemSuccess, null);
	//end

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

function onFileSystemSuccess(fileSystem) {
	fileSystem.root.getDirectory("gpx", {create: false, exclusive: false}, getDirSuccess, null);  
	// fileSystem.getDirectory("gpx", {create: false, exclusive: false}, getDirSuccess, null);  
}

function getDirSuccess(dirEntry) {
	console.log(dirEntry); 
	console.log('hi'); 
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXJlY3Rpb25zLmpzIiwibWFpbi5qcyIsInByb2Nlc3NfZ3B4LmpzIiwic2F2ZV9kaXJlY3Rpb25zLmpzIiwidHJhY2tfY29vcmRpbmF0ZXMuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvbWFwYm94L2xpYi9jYWxsYmFja2lmeS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL2NsaWVudC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL2NvbnN0YW50cy5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL2Zvcm1hdF9wb2ludHMuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvbWFwYm94L2xpYi9nZXRfdXNlci5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL2ludmFyaWFudF9sb2NhdGlvbi5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL21ha2Vfc2VydmljZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvbGliL3NlcnZpY2VzL2RpcmVjdGlvbnMuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvbWFwYm94L2xpYi9zdGFuZGFyZF9yZXNwb25zZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvdmVuZG9yL2ludmFyaWFudC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYXBib3gvdmVuZG9yL3Byb21pc2UuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9VcmxCdWlsZGVyLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L2NsaWVudC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L2NsaWVudC9kZWZhdWx0LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvY2xpZW50L3hoci5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L2ludGVyY2VwdG9yLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvaW50ZXJjZXB0b3IvZGVmYXVsdFJlcXVlc3QuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9pbnRlcmNlcHRvci9lcnJvckNvZGUuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9pbnRlcmNlcHRvci9taW1lLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvaW50ZXJjZXB0b3IvcGFyYW1zLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvaW50ZXJjZXB0b3IvcGF0aFByZWZpeC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L2ludGVyY2VwdG9yL3RlbXBsYXRlLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvbWltZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L21pbWUvcmVnaXN0cnkuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9taW1lL3R5cGUvYXBwbGljYXRpb24vaGFsLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvbWltZS90eXBlL2FwcGxpY2F0aW9uL2pzb24uanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9taW1lL3R5cGUvYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvbWltZS90eXBlL211bHRpcGFydC9mb3JtLWRhdGEuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC9taW1lL3R5cGUvdGV4dC9wbGFpbi5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvYXR0ZW1wdC5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvYmFzZTY0LmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvdXRpbC9maW5kLmpzIiwiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3Jlc3QvdXRpbC9sYXp5UHJvbWlzZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvbWl4aW4uanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC91dGlsL25vcm1hbGl6ZUhlYWRlck5hbWUuanMiLCIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVzdC91dGlsL3Jlc3BvbnNlUHJvbWlzZS5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvdXJpRW5jb2Rlci5qcyIsIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9yZXN0L3V0aWwvdXJpVGVtcGxhdGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JEQTtBQUNBO0FBQ0E7Ozs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29vcmRpbmF0ZXMsY2FsbGJhY2spIHtcblxuXHR2YXIgTWFwYm94Q2xpZW50ID0gcmVxdWlyZSgnbWFwYm94L2xpYi9zZXJ2aWNlcy9kaXJlY3Rpb25zJyk7IFxuXHR2YXIgY2xpZW50ID0gbmV3IE1hcGJveENsaWVudCgncGsuZXlKMUlqb2laVzFwYkdsbFpHRnVibVZ1WW1WeVp5SXNJbUVpT2lKamFYaG1PVEI2Wm5vd01EQXdNblZ6YURWa2NucHNZMk0xSW4wLjMzeUR3VXE2NzBqSEQ4ZmxLanpxeGcnKTtcblxuXHR2YXIgYXJyYXlfbGF0X2xvbmcgPSBbXTsgXG5cdGZvcih2YXIgaT0wOyBpPGNvb3JkaW5hdGVzLmxlbmd0aDsgaSsrKSB7XG5cblx0XHR2YXIgbGF0PSBOdW1iZXIoY29vcmRpbmF0ZXNbaV1bMF0pOyBcblx0XHR2YXIgbG9uZz0gTnVtYmVyKGNvb3JkaW5hdGVzW2ldWzFdKTsgXG5cblx0XHRhcnJheV9sYXRfbG9uZy5wdXNoKHsgbGF0aXR1ZGU6IGxhdCwgbG9uZ2l0dWRlOiBsb25nfSk7IFxuXG5cdH1cblx0XG5cdGNsaWVudC5nZXREaXJlY3Rpb25zKGFycmF5X2xhdF9sb25nLCB7XG5cdFx0ICBwcm9maWxlOiAnbWFwYm94LndhbGtpbmcnLFxuXHRcdCAgYWx0ZXJuYXRpdmVzOiBmYWxzZSxcblx0XHR9LCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcblx0XHQgICBcdFx0aWYoZXJyPT09bnVsbCkge1xuXHRcdFx0ICAgXHRcdGlmKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHQgICBcdFx0XHRjYWxsYmFjayhyZXN1bHRzKTsgXG5cdFx0XHQgICBcdFx0fVxuXHRcdFx0ICAgXHR9XG5cdFx0fSk7XG59IiwiLy8gV2FpdCBmb3IgZGV2aWNlIEFQSSBsaWJyYXJpZXMgdG8gbG9hZFxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImRldmljZXJlYWR5XCIsIG9uRGV2aWNlUmVhZHksIGZhbHNlKTtcblxuZnVuY3Rpb24gb25EZXZpY2VSZWFkeSgpIHsgXG5cdFxuXHQvL3JlYWQgZXhpc3RpbmcgZ3B4IGZpbGVzIGludG8gc2VsZWN0IG1lbnUgXG5cdHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbShMb2NhbEZpbGVTeXN0ZW0uUEVSU0lTVEVOVCwgMCwgb25GaWxlU3lzdGVtU3VjY2VzcywgbnVsbCk7XG5cdC8vZW5kXG5cblx0dmFyIHByb2Nlc3NHUFggPSByZXF1aXJlKCcuL3Byb2Nlc3NfZ3B4LmpzJyk7IFxuXG5cdHZhciBncHhGaWxlID0gJ3JvdXRlLmdweCc7IFxuXG5cdHByb2Nlc3NHUFgoZ3B4RmlsZSwgZnVuY3Rpb24gKGNvb3JkaW5hdGVzKSB7XG5cdFx0XG5cdFx0dmFyIGdldERpcmVjdGlvbnMgPSByZXF1aXJlKCcuL2RpcmVjdGlvbnMuanMnKTsgXG5cdFx0XG5cdFx0Z2V0RGlyZWN0aW9ucyhjb29yZGluYXRlcyxmdW5jdGlvbihkaXJlY3Rpb25zKSB7XG5cblx0XHRcdC8vIGRldGVjdCB3aGVuIHBlcnNvbiBpcyBhdCBzdGFydCBcblx0XHRcdHZhciBzYXZlRGlyZWN0aW9uSW5mbyA9IHJlcXVpcmUoJy4vc2F2ZV9kaXJlY3Rpb25zLmpzJylcblx0XHRcdHN0ZXBzRGF0YSA9IHNhdmVEaXJlY3Rpb25JbmZvKGRpcmVjdGlvbnMsZ3B4RmlsZSk7IFxuXHRcdFx0XG5cdFx0XHR2YXIgbGlzdGVuRm9yQ29vcmRpbmF0ZXMgPSByZXF1aXJlKCcuL3RyYWNrX2Nvb3JkaW5hdGVzLmpzJyk7IC8vY29vcmRpbmF0ZXMgYXJlIGluIFtsb25naXR1ZGUsIGxhdGl0dWRlXSBmb3IgZ29vZ2xlIG1hcHMgbGF0IGxvbmcgZ29lcyB0aGUgb3RoZXIgd2F5IVxuXHRcdFx0bGlzdGVuRm9yQ29vcmRpbmF0ZXMoc3RlcHNEYXRhKTsgXG5cblx0XHR9KTsgXG5cdFx0Ly8gdmFyIHR1cm5fYnlfdHVybiA9IGdldERpcmVjdGlvbnMoY29vcmRpbmF0ZXMpO1xuXHR9KTsgXG59XG5cbmZ1bmN0aW9uIG9uRmlsZVN5c3RlbVN1Y2Nlc3MoZmlsZVN5c3RlbSkge1xuXHRmaWxlU3lzdGVtLnJvb3QuZ2V0RGlyZWN0b3J5KFwiZ3B4XCIsIHtjcmVhdGU6IGZhbHNlLCBleGNsdXNpdmU6IGZhbHNlfSwgZ2V0RGlyU3VjY2VzcywgbnVsbCk7ICBcblx0Ly8gZmlsZVN5c3RlbS5nZXREaXJlY3RvcnkoXCJncHhcIiwge2NyZWF0ZTogZmFsc2UsIGV4Y2x1c2l2ZTogZmFsc2V9LCBnZXREaXJTdWNjZXNzLCBudWxsKTsgIFxufVxuXG5mdW5jdGlvbiBnZXREaXJTdWNjZXNzKGRpckVudHJ5KSB7XG5cdGNvbnNvbGUubG9nKGRpckVudHJ5KTsgXG5cdGNvbnNvbGUubG9nKCdoaScpOyBcbn1cblxuXG5cbiIsIi8vZ2V0IGdweCBmaWxlIGNvbnRlbnRzIFxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZ3B4X2ZpbGUsIGNhbGxiYWNrKSB7XG5cbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgXG4gICAgeGhyLm9wZW4oJ0dFVCcsICcuL2dweC8nK2dweF9maWxlLCB0cnVlKTtcbiAgICB4aHIuc2VuZChudWxsKTsgIFxuXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT0gWE1MSHR0cFJlcXVlc3QuRE9ORSkgeyBcblxuICAgICAgICAgICAgdmFyIGNvb3JkaW5hdGVzID0gZ2V0Q29vcmRpbmF0ZXMoeGhyLnJlc3BvbnNlVGV4dCk7XG5cbiAgICAgICAgICAgIGlmKHR5cGVvZiBjYWxsYmFjaz09J2Z1bmN0aW9uJykgeyAgIFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGNvb3JkaW5hdGVzKTsgXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59OyBcblxuLy9yZWFkIHJldHVybmVkIGNvbnRlbnRzIG9mIGZpbGUgaW50byBhbiBhcnJheSBvZiBjb29yZGluYXRlc1xuZnVuY3Rpb24gZ2V0Q29vcmRpbmF0ZXMoeG1sX2ZpbGUpIHtcblxuICAgIHZhciBjb29yZGluYXRlc19hcnJheSA9IFtdOyAgXG4gICAgLy9wYXJzZSBncHggc3RyaW5nIGludG8geG1sIHNvIGNhbiBpdGVyYXRlIG92ZXJcbiAgICBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7IFxuICAgIHhtbCA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcoeG1sX2ZpbGUsJ3RleHQveG1sJyk7IFxuICAgIC8vZ2V0IGFsbCByZXB0IHRhZ3MgdG8gZ2V0IGxhdC8gbG9uZyBvdXQgb2YgdGhlbSBcbiAgICB2YXIgcnRlcHQgPSB4bWwucXVlcnlTZWxlY3RvckFsbCgncnRlcHQnKTsgXG5cbiAgICBmb3IodmFyIGk9MDsgaTxydGVwdC5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgIHZhciBsYXQgPSBydGVwdFtpXS5nZXRBdHRyaWJ1dGUoJ2xhdCcpOyBcbiAgICAgICAgdmFyIGxvbmcgPSBydGVwdFtpXS5nZXRBdHRyaWJ1dGUoJ2xvbicpOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgY29vcmRpbmF0ZXNfYXJyYXkucHVzaChbbGF0LCBsb25nXSk7XG4gICAgfSBcbiAgICBcbiAgICByZXR1cm4gY29vcmRpbmF0ZXNfYXJyYXk7IFxufSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGlyZWN0aW9uT2JqZWN0LCBmaWxlTmFtZSkge1xuXG5cdHZhciByb3V0ZSA9IGRpcmVjdGlvbk9iamVjdFsncm91dGVzJ11bMF07IFxuXHR2YXIgc3RlcHMgPSByb3V0ZVsnc3RlcHMnXTtcblxuXHR2YXIgc3RlcHNSZWxldmFudERhdGEgPSBbXTsgXG5cdGZvciAodmFyIGk9IDA7IGk8IHN0ZXBzLmxlbmd0aDsgaSsrKSB7XG5cblx0XHR2YXIgY3VycmVudFN0ZXA9c3RlcHNbaV07IFxuXG5cdFx0dmFyIGRpcmVjdGlvbj1jdXJyZW50U3RlcFsnZGlyZWN0aW9uJ107IFxuXHRcdHZhciBkaXN0YW5jZT1jdXJyZW50U3RlcFsnZGlzdGFuY2UnXTsgXG5cdFx0dmFyIGluc3RydWN0aW9uPWN1cnJlbnRTdGVwWydtYW5ldXZlciddWydpbnN0cnVjdGlvbiddOyBcblx0XHR2YXIgdHlwZT1jdXJyZW50U3RlcFsnbWFuZXV2ZXInXVsndHlwZSddOyBcblx0XHR2YXIgY29vcmRpbmF0ZXM9Y3VycmVudFN0ZXBbJ21hbmV1dmVyJ11bJ2xvY2F0aW9uJ11bJ2Nvb3JkaW5hdGVzJ107IC8vY29vcmRpbmF0ZXMgYXJlIGluIFtsb25naXR1ZGUsIGxhdGl0dWRlXSBmb3IgZ29vZ2xlIG1hcHMgbGF0IGxvbmcgZ29lcyB0aGUgb3RoZXIgd2F5IVxuXG5cdFx0c3RlcHNSZWxldmFudERhdGEucHVzaCh7Y29vcmRpbmF0ZXM6Y29vcmRpbmF0ZXMsIGRpc3RhbmNlOmRpc3RhbmNlLCBkaXJlY3Rpb246ZGlyZWN0aW9uLCB0eXBlOnR5cGUsIGluc3RydWN0aW9uOiBpbnN0cnVjdGlvbn0pXG5cdFx0Y29uc29sZS5sb2coY29vcmRpbmF0ZXMpOyBcblx0XHQvL3Rlc3RpbmcgcHVycG9zZXNcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgna2V5LWNvb3JkaW5hdGVzJykuaW5uZXJIVE1MKz1cIkxhdGl0dWRlOiBcIitjb29yZGluYXRlc1sxXStcIiwgTG9uZ2l0dWRlIFwiK2Nvb3JkaW5hdGVzWzBdKyBcIjwvYnI+XCI7ICBcblx0fVxuXHRyZXR1cm4gc3RlcHNSZWxldmFudERhdGE7IFxufSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29vcmRpbmF0ZXNEYXRhKSB7XG4gIHZhciB0aW1lID0gMDsgXG5cdC8vc3RhcnQgdHJhY2tpbmdcblx0dmFyIHdhdGNoX2lkPSBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24ud2F0Y2hQb3NpdGlvbihcblxuICAgICAgICAvL3N1Y2Nlc3NcbiAgICAgICAgZnVuY3Rpb24ocG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vY2hlY2sgYWdhaW5zdCByb3V0ZSBkaXJlY3Rpb25zXG4gICAgICAgICAgICB2YXIgbGF0ID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlOyBcbiAgICAgICAgICAgIHZhciBsb25nID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZTsgXG4gICAgICAgICAgIFx0Ly9sb2cgY29vcmRpbmF0ZXMuIG5vdCBtb3JlIGZyZXF1ZW50bHkgdGhhbiAzMCBzZWNvbmRzXG4gICAgICAgICAgICB2YXIgY3VycmVudFRpbWU9IERhdGUubm93KCk7IFxuICAgICAgICAgICAgaWYodGltZT09PTApIHtcbiAgICAgICAgICAgICAgICB0aW1lID0gY3VycmVudFRpbWU7IFxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2ctY29vcmRpbmF0ZXMnKS5pbm5lckhUTUwgKz0gXCI8cCBjbGFzcz0nbG9nJz5DdXJyZW50IGxhdGl0dWRlIGlzIFwiK2xhdCtcIiBhbmQgY3VycmVudCBsb25naXR1ZGUgaXMgXCIrbG9uZytcIjwvcD5cIjsgXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmKGN1cnJlbnRUaW1lLXRpbWUgPiAzMDAwMCkgeyAvLzMwIHNlY29uZHNcbiAgICAgICAgICAgICAgICAgICAgdGltZT1jdXJyZW50VGltZTsgXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2ctY29vcmRpbmF0ZXMnKS5pbm5lckhUTUwgKz0gXCI8cCBjbGFzcz0nbG9nJz5DdXJyZW50IGxhdGl0dWRlIGlzIFwiK2xhdCtcIiBhbmQgY3VycmVudCBsb25naXR1ZGUgaXMgXCIrbG9uZytcIjwvcD5cIjsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICBcdC8vIGNvbnNvbGUubG9nKGNvb3JkaW5hdGVzRGF0YSk7IFxuICAgICAgICAgICAgLy9yb3VuZCBudW1iZXJzIHRvIDUgZGVjaW1hbHMgXG4gICAgICAgICAgICBsYXQgPSBsYXQudG9GaXhlZCg0KTsgXG4gICAgICAgICAgICBsb25nID0gbG9uZy50b0ZpeGVkKDQpOyBcbiAgICAgICAgICAgIC8vbG9nIGluc3RydWN0aW9uc1xuICAgICAgICAgICAgdmFyIGluc3RydWN0aW9uRGF0YSA9IG5lYXJJbnN0cnVjdGlvbkNvb3JkaW5hdGUobGF0LGxvbmcsIGNvb3JkaW5hdGVzRGF0YSk7IFxuICAgICAgICAgICAgaWYoaW5zdHJ1Y3Rpb25EYXRhICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2ctaW5zdHJ1Y3Rpb25zJykuaW5uZXJIVE1MICs9IFwiPGRpdiBjbGFzcz0naW5zdHJ1Y3Rpb24nPlwiK2luc3RydWN0aW9uRGF0YS5pbnN0cnVjdGlvbitcIjwvZGl2PlwiOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgLy8gdmFyIHdheXBvaW50ID0gaXNDbG9zZShsYXQsbG9uZyk7IC8vcmV0dXJucyBmYWxzZSBpZiBub3QgY2xvc2UgdG8gYW55d2hlcmUsIG9yIHdheXBvaW50IG51bWJlciBpdHMgY2xvc2VzdCB0byBpZiBjbG9zZSB0byBhIHdheXBvaW50LlxuICAgICAgICAgICAvLyBpZih3YXlwb2ludCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgLy8gIC8vcGxheSBjb3JyZXNwb25kaW5nIGF1ZGlvIFxuICAgICAgICAgICAvLyAgICAgIGF1ZGlvX2VsZW0gPSAnd2F5cG9pbnRfJyt3YXlwb2ludDsgXG4gICAgICAgICAgIC8vICAgICAgcGxheUF1ZGlvKGF1ZGlvX2VsZW0pOyAgXG4gICAgICAgICAgIC8vIH0gXG4gICAgICAgICAgIC8vICAvLyBpZih3YXlwb2ludCkge1xuICAgICAgICAgICAvLyAgcm91dGVfZGF0YS5wdXNoKHBvc2l0aW9uKTsgXG4gICAgICAgIH0sXG4gICAgICAgIC8vZXJyb3JcbiAgICAgICAgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY291bGRudCBnZXQgY29vcmRpbmF0ZXMhISEnKTsgXG4gICAgICAgIH0sXG4gICAgICAgIC8vc2V0dGluZ3NcbiAgICAgICAgeyBmcmVxdWVuY3k6IDEwMDAwLCBlbmFibGVIaWdoQWNjdXJhY3k6IHRydWV9XG5cbiAgICApOyBcbn1cbmZ1bmN0aW9uIG5lYXJJbnN0cnVjdGlvbkNvb3JkaW5hdGUobGF0LGxvbmcsIGluc3RydWN0aW9uUG9pbnRzKSB7IC8vY29tcGFyZSBsYXQgbG9uZyBvZiBkZXZpY2UgdG8gY29vcmRpbmF0ZXMgd2hlcmUgeW91ciBnb25uYSByZWFkIG91dCBkYXRhLCBzZWUgaWYgdGhlcmVzIGEgbWF0Y2guIElmIHNvIHJldHVybiBkYXRhIGZvciB0aGF0IGNvb3JkaW5hdGVcblxuXHRcblx0Zm9yKHZhciBpPTA7IGk8aW5zdHJ1Y3Rpb25Qb2ludHMubGVuZ3RoOyBpKyspIHtcblxuXHRcdHZhciBpbnN0cnVjdGlvbkNvb3JkaW5hdGVzPSBpbnN0cnVjdGlvblBvaW50c1tpXVsnY29vcmRpbmF0ZXMnXTsgXG5cdFx0dmFyIGluc3RydWN0aW9uQ29vcmRpbmF0ZUxhdCA9IGluc3RydWN0aW9uQ29vcmRpbmF0ZXNbMV07IFxuXHRcdHZhciBpbnN0cnVjdGlvbkNvb3JkaW5hdGVMb25nID0gaW5zdHJ1Y3Rpb25Db29yZGluYXRlc1swXTsgXG5cblx0XHQvL3JvdW5kIHRvIDQgZGlnaXRzIHNvIGlmIHlvdXIgbW9yZSByb3VnaGx5IG5lYXJieSAuLi4gKHRoaXMgcG9zc2libHkgbmVlZHMgbW9yZSB0aGlua2luZyBhYm91dClcblx0XHRpbnN0cnVjdGlvbkNvb3JkaW5hdGVMYXQgPSBpbnN0cnVjdGlvbkNvb3JkaW5hdGVMYXQudG9GaXhlZCg0KTsgXG5cdFx0aW5zdHJ1Y3Rpb25Db29yZGluYXRlTG9uZyA9IGluc3RydWN0aW9uQ29vcmRpbmF0ZUxvbmcudG9GaXhlZCg0KTsgXG5cdFx0Ly8gY29uc29sZS5sb2coJ2RldmljZSBsYXRpdHVkZSBpcycgKyBsYXQpOyBcblx0XHQvLyBjb25zb2xlLmxvZygnZGV2aWNlIGxvbmdpdHVkZSBpcycgKyBsb25nKTsgXG5cdFx0Y29uc29sZS5sb2coJ3BvaW50IGxhdCBpcycgKyBpbnN0cnVjdGlvbkNvb3JkaW5hdGVMYXQpOyBcblx0XHRjb25zb2xlLmxvZygncG9pbnQgbG9uZyBpcycgKyBpbnN0cnVjdGlvbkNvb3JkaW5hdGVMb25nKTsgXG5cdFx0XG5cdFx0aWYobGF0ID09PSBpbnN0cnVjdGlvbkNvb3JkaW5hdGVMYXQgJiYgbG9uZyA9PT0gaW5zdHJ1Y3Rpb25Db29yZGluYXRlTG9uZykgeyAvL2FsbCB0aGUgY29vcmRpbmF0ZXMgYXJlIHN0cmluZ3MgYXQgdGhpcyBwb2ludCAuLi4gXG5cdFx0XHRyZXR1cm4gaW5zdHJ1Y3Rpb25Qb2ludHNbaV07IFxuXHRcdH1cblx0fVxuXHRyZXR1cm4gZmFsc2U7IFxufVxuXG4vLyBmdW5jdGlvbiBpc0Nsb3NlKGxhdCwgbG9uZykge1xuXG4vLyAgICAgZm9yKHZhciBpPTA7IGk8Y29vcmRpbmF0ZXNfYXJyYXkubGVuZ3RoOyBpKyspIHtcblxuLy8gICAgICAgICAvL2lmIG1hdGNoZXMgdG8gNCBkZWNpbWFsIHBsYWNlcyBcbi8vICAgICAgICAgdmFyIHdheXBvaW50X2xhdCA9IGNvb3JkaW5hdGVzX2FycmF5W2ldWzBdOyBcbi8vICAgICAgICAgdmFyIHdheXBvaW50X2xvbmcgPSBjb29yZGluYXRlc19hcnJheVtpXVsxXTsgXG5cbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coJ3Bvc2l0aW9uIGxhdCBsb25nIGlzJyArIGxhdCArICcgJyArIGxvbmcpOyBcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coJ2xhdCBsb25nIHdheXBvaW50IGlzJyArd2F5cG9pbnRfbGF0ICsgJyAnICsgd2F5cG9pbnRfbG9uZyk7IFxuXG4vLyAgICAgICAgIGlmKChsYXQuc3Vic3RyKDAsbGF0Lmxlbmd0aCAtMSkgPT09IHdheXBvaW50X2xhdC5zdWJzdHIoMCx3YXlwb2ludF9sYXQubGVuZ3RoLTEpKSAmJiBcbi8vICAgICAgICAgICAgIChsb25nLnN1YnN0cigwLCBsb25nLmxlbmd0aCAtMSkgPT09IHdheXBvaW50X2xvbmcuc3Vic3RyKDAsd2F5cG9pbnRfbG9uZy5sZW5ndGgtMSkpKSB7XG4gICAgICBcbi8vICAgICAgICAgICAgIHJldHVybiBpKzE7IFxuLy8gICAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIHJldHVybiBmYWxzZTsgXG4vLyB9IiwiJ3VzZSBzdHJpY3QnO1xuXG5pZiAodHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnKSB7XG4gIC8vIGluc3RhbGwgRVM2IFByb21pc2UgcG9seWZpbGxcbiAgcmVxdWlyZSgnLi4vdmVuZG9yL3Byb21pc2UnKTtcbn1cblxudmFyIGludGVyY2VwdG9yID0gcmVxdWlyZSgncmVzdC9pbnRlcmNlcHRvcicpO1xuXG52YXIgY2FsbGJhY2tpZnkgPSBpbnRlcmNlcHRvcih7XG4gIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHZhciBjYWxsYmFjayA9IHJlc3BvbnNlICYmIHJlc3BvbnNlLmNhbGxiYWNrO1xuXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UuZW50aXR5LCByZXNwb25zZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9LFxuICBlcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gcmVzcG9uc2UgJiYgcmVzcG9uc2UuY2FsbGJhY2s7XG5cbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YXIgZXJyID0gcmVzcG9uc2UuZXJyb3IgfHwgcmVzcG9uc2UuZW50aXR5O1xuICAgICAgaWYgKHR5cGVvZiBlcnIgIT09ICdvYmplY3QnKSBlcnIgPSBuZXcgRXJyb3IoZXJyKTtcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjYWxsYmFja2lmeTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaWYgKHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuICAvLyBpbnN0YWxsIEVTNiBQcm9taXNlIHBvbHlmaWxsXG4gIHJlcXVpcmUoJy4uL3ZlbmRvci9wcm9taXNlJyk7XG59XG5cbnZhciByZXN0ID0gcmVxdWlyZSgncmVzdCcpO1xudmFyIHN0YW5kYXJkUmVzcG9uc2UgPSByZXF1aXJlKCcuL3N0YW5kYXJkX3Jlc3BvbnNlJyk7XG52YXIgY2FsbGJhY2tpZnkgPSByZXF1aXJlKCcuL2NhbGxiYWNraWZ5Jyk7XG5cbi8vIHJlc3QuanMgY2xpZW50IHdpdGggTUlNRSBzdXBwb3J0XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICByZXR1cm4gcmVzdFxuICAgIC53cmFwKHJlcXVpcmUoJ3Jlc3QvaW50ZXJjZXB0b3IvZXJyb3JDb2RlJykpXG4gICAgLndyYXAocmVxdWlyZSgncmVzdC9pbnRlcmNlcHRvci9wYXRoUHJlZml4JyksIHsgcHJlZml4OiBjb25maWcuZW5kcG9pbnQgfSlcbiAgICAud3JhcChyZXF1aXJlKCdyZXN0L2ludGVyY2VwdG9yL21pbWUnKSwgeyBtaW1lOiAnYXBwbGljYXRpb24vanNvbicgfSlcbiAgICAud3JhcChyZXF1aXJlKCdyZXN0L2ludGVyY2VwdG9yL3BhcmFtcycpKVxuICAgIC53cmFwKHJlcXVpcmUoJ3Jlc3QvaW50ZXJjZXB0b3IvZGVmYXVsdFJlcXVlc3QnKSwge1xuICAgICAgcGFyYW1zOiB7IGFjY2Vzc190b2tlbjogY29uZmlnLmFjY2Vzc1Rva2VuIH1cbiAgICB9KVxuICAgIC53cmFwKHJlcXVpcmUoJ3Jlc3QvaW50ZXJjZXB0b3IvdGVtcGxhdGUnKSlcbiAgICAud3JhcChzdGFuZGFyZFJlc3BvbnNlKVxuICAgIC53cmFwKGNhbGxiYWNraWZ5KTtcbn07XG4iLCIvLyBXZSBrZWVwIGFsbCBvZiB0aGUgY29uc3RhbnRzIHRoYXQgZGVjbGFyZSBlbmRwb2ludHMgaW4gb25lXG4vLyBwbGFjZSwgc28gdGhhdCB3ZSBjb3VsZCBjb25jZWl2YWJseSB1cGRhdGUgdGhpcyBmb3IgQVBJIGxheW91dFxuLy8gcmV2aXNpb25zLlxubW9kdWxlLmV4cG9ydHMuREVGQVVMVF9FTkRQT0lOVCA9ICdodHRwczovL2FwaS5tYXBib3guY29tJztcblxubW9kdWxlLmV4cG9ydHMuQVBJX0dFT0NPRElOR19GT1JXQVJEID0gJy9nZW9jb2RpbmcvdjUve2RhdGFzZXR9L3txdWVyeX0uanNvbns/cHJveGltaXR5LGNvdW50cnksdHlwZXMsYmJveCxsaW1pdH0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX0dFT0NPRElOR19SRVZFUlNFID0gJy9nZW9jb2RpbmcvdjUve2RhdGFzZXR9L3tsb25naXR1ZGV9LHtsYXRpdHVkZX0uanNvbns/dHlwZXMsbGltaXR9JztcblxubW9kdWxlLmV4cG9ydHMuQVBJX0RJUkVDVElPTlMgPSAnL3Y0L2RpcmVjdGlvbnMve3Byb2ZpbGV9L3tlbmNvZGVkV2F5cG9pbnRzfS5qc29uez9hbHRlcm5hdGl2ZXMsaW5zdHJ1Y3Rpb25zLGdlb21ldHJ5LHN0ZXBzfSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfRElTVEFOQ0UgPSAnL2Rpc3RhbmNlcy92MS9tYXBib3gve3Byb2ZpbGV9JztcblxubW9kdWxlLmV4cG9ydHMuQVBJX1NVUkZBQ0UgPSAnL3Y0L3N1cmZhY2Uve21hcGlkfS5qc29uez9sYXllcixmaWVsZHMscG9pbnRzLGdlb2pzb24saW50ZXJwb2xhdGUsZW5jb2RlZF9wb2x5bGluZX0nO1xuXG5tb2R1bGUuZXhwb3J0cy5BUElfVVBMT0FEUyA9ICcvdXBsb2Fkcy92MS97b3duZXJ9Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9VUExPQUQgPSAnL3VwbG9hZHMvdjEve293bmVyfS97dXBsb2FkfSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfVVBMT0FEX0NSRURFTlRJQUxTID0gJy91cGxvYWRzL3YxL3tvd25lcn0vY3JlZGVudGlhbHMnO1xuXG5tb2R1bGUuZXhwb3J0cy5BUElfTUFUQ0hJTkcgPSAnL21hdGNoaW5nL3Y0L3twcm9maWxlfS5qc29uJztcblxubW9kdWxlLmV4cG9ydHMuQVBJX0RBVEFTRVRfREFUQVNFVFMgPSAnL2RhdGFzZXRzL3YxL3tvd25lcn17P2xpbWl0LHN0YXJ0LGZyZXNofSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfREFUQVNFVF9EQVRBU0VUID0gJy9kYXRhc2V0cy92MS97b3duZXJ9L3tkYXRhc2V0fSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfREFUQVNFVF9GRUFUVVJFUyA9ICcvZGF0YXNldHMvdjEve293bmVyfS97ZGF0YXNldH0vZmVhdHVyZXN7P3JldmVyc2UsbGltaXQsc3RhcnR9Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9EQVRBU0VUX0ZFQVRVUkUgPSAnL2RhdGFzZXRzL3YxL3tvd25lcn0ve2RhdGFzZXR9L2ZlYXR1cmVzL3tpZH0nO1xuXG5tb2R1bGUuZXhwb3J0cy5BUElfVElMRVNUQVRTX1NUQVRJU1RJQ1MgPSAnL3RpbGVzdGF0cy92MS97b3duZXJ9L3t0aWxlc2V0fSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfVElMRVNUQVRTX0xBWUVSID0gJy90aWxlc3RhdHMvdjEve293bmVyfS97dGlsZXNldH0ve2xheWVyfSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfVElMRVNUQVRTX0FUVFJJQlVURSA9ICcvdGlsZXN0YXRzL3YxL3tvd25lcn0ve3RpbGVzZXR9L3tsYXllcn0ve2F0dHJpYnV0ZX0nO1xuXG5tb2R1bGUuZXhwb3J0cy5BUElfU1RBVElDID0gJy92NC97bWFwaWR9eytvdmVybGF5fS97K3h5en0ve3dpZHRofXh7aGVpZ2h0fXsrcmV0aW5hfXsuZm9ybWF0fXs/YWNjZXNzX3Rva2VufSc7XG5cbm1vZHVsZS5leHBvcnRzLkFQSV9TVFlMRVNfTElTVCA9ICcvc3R5bGVzL3YxL3tvd25lcn0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1NUWUxFU19DUkVBVEUgPSAnL3N0eWxlcy92MS97b3duZXJ9Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9TVFlMRVNfUkVBRCA9ICcvc3R5bGVzL3YxL3tvd25lcn0ve3N0eWxlaWR9Jztcbm1vZHVsZS5leHBvcnRzLkFQSV9TVFlMRVNfVVBEQVRFID0gJy9zdHlsZXMvdjEve293bmVyfS97c3R5bGVpZH0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1NUWUxFU19ERUxFVEUgPSAnL3N0eWxlcy92MS97b3duZXJ9L3tzdHlsZWlkfSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfU1RZTEVTX0VNQkVEID0gJy9zdHlsZXMvdjEve293bmVyfS97c3R5bGVpZH0uaHRtbHs/em9vbXdoZWVsLHRpdGxlLGFjY2Vzc190b2tlbn0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1NUWUxFU19TUFJJVEUgPSAnL3N0eWxlcy92MS97b3duZXJ9L3tzdHlsZWlkfS9zcHJpdGV7K3JldGluYX17LmZvcm1hdH0nO1xubW9kdWxlLmV4cG9ydHMuQVBJX1NUWUxFU19TUFJJVEVfQUREX0lDT04gPSAnL3N0eWxlcy92MS97b3duZXJ9L3tzdHlsZWlkfS9zcHJpdGUve2ljb25OYW1lfSc7XG5tb2R1bGUuZXhwb3J0cy5BUElfU1RZTEVTX1NQUklURV9ERUxFVEVfSUNPTiA9ICcvc3R5bGVzL3YxL3tvd25lcn0ve3N0eWxlaWR9L3Nwcml0ZS97aWNvbk5hbWV9JztcblxubW9kdWxlLmV4cG9ydHMuQVBJX1NUWUxFU19GT05UX0dMWVBIX1JBTkdFUyA9ICcvZm9udHMvdjEve293bmVyfS97Zm9udH0ve3N0YXJ0fS17ZW5kfS5wYmYnXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbnZhcmlhbnRMb2NhdGlvbiA9IHJlcXVpcmUoJy4vaW52YXJpYW50X2xvY2F0aW9uJyk7XG5cbi8qKlxuICogRm9ybWF0IHdheXBpb250cyBpbiBhIHdheSB0aGF0J3MgZnJpZW5kbHkgdG8gdGhlIGRpcmVjdGlvbnMgYW5kIHN1cmZhY2VcbiAqIEFQSTogY29tbWEtc2VwYXJhdGVkIGxhdGl0dWRlLCBsb25naXR1ZGUgcGFpcnMgd2l0aCBzZW1pY29sb25zIGJldHdlZW5cbiAqIHRoZW0uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheTxPYmplY3Q+fSB3YXlwb2ludHMgYXJyYXkgb2Ygb2JqZWN0cyB3aXRoIGxhdGl0dWRlIGFuZCBsb25naXR1ZGVcbiAqIHByb3BlcnRpZXNcbiAqIEByZXR1cm5zIHtzdHJpbmd9IGZvcm1hdHRlZCBwb2ludHNcbiAqIEB0aHJvd3Mge0Vycm9yfSBpZiB0aGUgaW5wdXQgaXMgaW52YWxpZFxuICovXG5mdW5jdGlvbiBmb3JtYXRQb2ludHMod2F5cG9pbnRzKSB7XG4gIHJldHVybiB3YXlwb2ludHMubWFwKGZ1bmN0aW9uKGxvY2F0aW9uKSB7XG4gICAgaW52YXJpYW50TG9jYXRpb24obG9jYXRpb24pO1xuICAgIHJldHVybiBsb2NhdGlvbi5sb25naXR1ZGUgKyAnLCcgKyBsb2NhdGlvbi5sYXRpdHVkZTtcbiAgfSkuam9pbignOycpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZvcm1hdFBvaW50cztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGI2NCA9IHJlcXVpcmUoJ3Jlc3QvdXRpbC9iYXNlNjQnKTtcblxuLyoqXG4gKiBBY2Nlc3MgdG9rZW5zIGFjdHVhbGx5IGFyZSBkYXRhLCBhbmQgdXNpbmcgdGhlbSB3ZSBjYW4gZGVyaXZlXG4gKiBhIHVzZXIncyB1c2VybmFtZS4gVGhpcyBtZXRob2QgYXR0ZW1wdHMgdG8gZG8ganVzdCB0aGF0LFxuICogZGVjb2RpbmcgdGhlIHBhcnQgb2YgdGhlIHRva2VuIGFmdGVyIHRoZSBmaXJzdCBgLmAgaW50b1xuICogYSB1c2VybmFtZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IHRva2VuIGFuIGFjY2VzcyB0b2tlblxuICogQHJldHVybiB7c3RyaW5nfSB1c2VybmFtZVxuICovXG5mdW5jdGlvbiBnZXRVc2VyKHRva2VuKSB7XG4gIHZhciBkYXRhID0gdG9rZW4uc3BsaXQoJy4nKVsxXTtcbiAgaWYgKCFkYXRhKSByZXR1cm4gbnVsbDtcbiAgZGF0YSA9IGRhdGEucmVwbGFjZSgvLS9nLCAnKycpLnJlcGxhY2UoL18vZywgJy8nKTtcblxuICB2YXIgbW9kID0gZGF0YS5sZW5ndGggJSA0O1xuICBpZiAobW9kID09PSAyKSBkYXRhICs9ICc9PSc7XG4gIGlmIChtb2QgPT09IDMpIGRhdGEgKz0gJz0nO1xuICBpZiAobW9kID09PSAxIHx8IG1vZCA+IDMpIHJldHVybiBudWxsO1xuXG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoYjY0LmRlY29kZShkYXRhKSkudTtcbiAgfSBjYXRjaChlcnIpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFVzZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCcuLi92ZW5kb3IvaW52YXJpYW50Jyk7XG5cbi8qKlxuICogR2l2ZW4gYW4gb2JqZWN0IHRoYXQgc2hvdWxkIGJlIGEgbG9jYXRpb24sIGVuc3VyZSB0aGF0IGl0IGhhc1xuICogdmFsaWQgbnVtZXJpYyBsb25naXR1ZGUgJiBsYXRpdHVkZSBwcm9wZXJ0aWVzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGxvY2F0aW9uIG9iamVjdCB3aXRoIGxvbmdpdHVkZSBhbmQgbGF0aXR1ZGUgdmFsdWVzXG4gKiBAdGhyb3dzIHtBc3NlcnRFcnJvcn0gaWYgdGhlIG9iamVjdCBpcyBub3QgYSB2YWxpZCBsb2NhdGlvblxuICogQHJldHVybnMge3VuZGVmaW5lZH0gbm90aGluZ1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gaW52YXJpYW50TG9jYXRpb24obG9jYXRpb24pIHtcbiAgaW52YXJpYW50KHR5cGVvZiBsb2NhdGlvbi5sYXRpdHVkZSA9PT0gJ251bWJlcicgJiZcbiAgICB0eXBlb2YgbG9jYXRpb24ubG9uZ2l0dWRlID09PSAnbnVtYmVyJyxcbiAgICAnbG9jYXRpb24gbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCBudW1lcmljIGxhdGl0dWRlICYgbG9uZ2l0dWRlIHByb3BlcnRpZXMnKTtcbiAgaWYgKGxvY2F0aW9uLnpvb20gIT09IHVuZGVmaW5lZCkge1xuICAgIGludmFyaWFudCh0eXBlb2YgbG9jYXRpb24uem9vbSA9PT0gJ251bWJlcicsICd6b29tIG11c3QgYmUgbnVtZXJpYycpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50TG9jYXRpb247XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCcuLi92ZW5kb3IvaW52YXJpYW50Jyk7XG52YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbnZhciBjbGllbnQgPSByZXF1aXJlKCcuL2NsaWVudCcpO1xudmFyIGdldFVzZXIgPSByZXF1aXJlKCcuL2dldF91c2VyJyk7XG5cbi8qKlxuICogU2VydmljZXMgYWxsIGhhdmUgdGhlIHNhbWUgY29uc3RydWN0b3IgcGF0dGVybjogeW91IGluaXRpYWxpemUgdGhlbVxuICogd2l0aCBhbiBhY2Nlc3MgdG9rZW4gYW5kIG9wdGlvbnMsIGFuZCB0aGV5IHZhbGlkYXRlIHRob3NlIGFyZ3VtZW50c1xuICogaW4gYSBwcmVkaWN0YWJsZSB3YXkuIFRoaXMgaXMgYSBjb25zdHJ1Y3Rvci1nZW5lcmF0b3IgdGhhdCBtYWtlc1xuICogaXQgcG9zc2libGUgdG8gcmVxdWlyZSBlYWNoIHNlcnZpY2UncyBBUEkgaW5kaXZpZHVhbGx5LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgbmFtZSBvZiB0aGUgTWFwYm94IEFQSSB0aGlzIGNsYXNzIHdpbGwgYWNjZXNzOlxuICogdGhpcyBpcyBzZXQgdG8gdGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHNvIGl0IHdpbGwgc2hvdyB1cCBpbiB0cmFjZWJhY2tzXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IGNvbnN0cnVjdG9yIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIG1ha2VTZXJ2aWNlKG5hbWUpIHtcblxuICBmdW5jdGlvbiBzZXJ2aWNlKGFjY2Vzc1Rva2VuLCBvcHRpb25zKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcblxuICAgIGludmFyaWFudCh0eXBlb2YgYWNjZXNzVG9rZW4gPT09ICdzdHJpbmcnLFxuICAgICAgJ2FjY2Vzc1Rva2VuIHJlcXVpcmVkIHRvIGluc3RhbnRpYXRlIE1hcGJveCBjbGllbnQnKTtcblxuICAgIHZhciBlbmRwb2ludCA9IGNvbnN0YW50cy5ERUZBVUxUX0VORFBPSU5UO1xuXG4gICAgaWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaW52YXJpYW50KHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0JywgJ29wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgIGlmIChvcHRpb25zLmVuZHBvaW50KSB7XG4gICAgICAgIGludmFyaWFudCh0eXBlb2Ygb3B0aW9ucy5lbmRwb2ludCA9PT0gJ3N0cmluZycsICdlbmRwb2ludCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIGVuZHBvaW50ID0gb3B0aW9ucy5lbmRwb2ludDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmFjY291bnQpIHtcbiAgICAgICAgaW52YXJpYW50KHR5cGVvZiBvcHRpb25zLmFjY291bnQgPT09ICdzdHJpbmcnLCAnYWNjb3VudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIHRoaXMub3duZXIgPSBvcHRpb25zLmFjY291bnQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQoe1xuICAgICAgZW5kcG9pbnQ6IGVuZHBvaW50LFxuICAgICAgYWNjZXNzVG9rZW46IGFjY2Vzc1Rva2VuXG4gICAgfSk7XG5cbiAgICB0aGlzLmFjY2Vzc1Rva2VuID0gYWNjZXNzVG9rZW47XG4gICAgdGhpcy5lbmRwb2ludCA9IGVuZHBvaW50O1xuICAgIHRoaXMub3duZXIgPSB0aGlzLm93bmVyIHx8IGdldFVzZXIoYWNjZXNzVG9rZW4pO1xuICAgIGludmFyaWFudCghIXRoaXMub3duZXIsICdjb3VsZCBub3QgZGV0ZXJtaW5lIGFjY291bnQgZnJvbSBwcm92aWRlZCBhY2Nlc3NUb2tlbicpO1xuXG4gIH1cblxuICByZXR1cm4gc2VydmljZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtYWtlU2VydmljZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGludmFyaWFudCA9IHJlcXVpcmUoJy4uLy4uL3ZlbmRvci9pbnZhcmlhbnQnKSxcbiAgZm9ybWF0UG9pbnRzID0gcmVxdWlyZSgnLi4vZm9ybWF0X3BvaW50cycpLFxuICBtYWtlU2VydmljZSA9IHJlcXVpcmUoJy4uL21ha2Vfc2VydmljZScpLFxuICBjb25zdGFudHMgPSByZXF1aXJlKCcuLi9jb25zdGFudHMnKTtcblxudmFyIE1hcGJveERpcmVjdGlvbnMgPSBtYWtlU2VydmljZSgnTWFwYm94RGlyZWN0aW9ucycpO1xuXG4vKipcbiAqIEZpbmQgZGlyZWN0aW9ucyBmcm9tIEEgdG8gQiwgb3IgYmV0d2VlbiBhbnkgbnVtYmVyIG9mIGxvY2F0aW9ucy5cbiAqIENvbnN1bHQgdGhlIFtNYXBib3ggRGlyZWN0aW9ucyBBUEldKGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vZGV2ZWxvcGVycy9hcGkvZGlyZWN0aW9ucy8pXG4gKiBmb3IgbW9yZSBkb2N1bWVudGF0aW9uLlxuICpcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gd2F5cG9pbnRzIGFuIGFycmF5IG9mIG9iamVjdHMgd2l0aCBgbGF0aXR1ZGVgXG4gKiBhbmQgYGxvbmdpdHVkZWAgcHJvcGVydGllcyB0aGF0IHJlcHJlc2VudCB3YXlwb2ludHMgaW4gb3JkZXIuIFVwIHRvXG4gKiAyNSB3YXlwb2ludHMgY2FuIGJlIHNwZWNpZmllZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gYWRkaXRpb25hbCBvcHRpb25zIG1lYW50IHRvIHR1bmVcbiAqIHRoZSByZXF1ZXN0XG4gKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMucHJvZmlsZT1tYXBib3guZHJpdmluZ10gdGhlIGRpcmVjdGlvbnNcbiAqIHByb2ZpbGUsIHdoaWNoIGRldGVybWluZXMgaG93IHRvIHByaW9yaXRpemUgZGlmZmVyZW50IHJvdXRlcy5cbiAqIE9wdGlvbnMgYXJlIGAnbWFwYm94LmRyaXZpbmcnYCwgd2hpY2ggYXNzdW1lcyB0cmFuc3BvcnRhdGlvbiB2aWEgYW5cbiAqIGF1dG9tb2JpbGUgYW5kIHdpbGwgdXNlIGhpZ2h3YXlzLCBgJ21hcGJveC53YWxraW5nJ2AsIHdoaWNoIGF2b2lkc1xuICogc3RyZWV0cyB3aXRob3V0IHNpZGV3YWxrcywgYW5kIGAnbWFwYm94LmN5Y2xpbmcnYCwgd2hpY2ggcHJlZmVycyBzdHJlZXRzXG4gKiB3aXRoIGJpY3ljbGUgbGFuZXMgYW5kIGxvd2VyIHNwZWVkIGxpbWl0cyBmb3IgdHJhbnNwb3J0YXRpb24gdmlhXG4gKiBiaWN5Y2xlLlxuICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmFsdGVybmF0aXZlcz10cnVlXSB3aGV0aGVyIHRvIGdlbmVyYXRlXG4gKiBhbHRlcm5hdGl2ZSByb3V0ZXMgYWxvbmcgd2l0aCB0aGUgcHJlZmVycmVkIHJvdXRlLlxuICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmluc3RydWN0aW9ucz10ZXh0XSBmb3JtYXQgZm9yIHR1cm4tYnktdHVyblxuICogaW5zdHJ1Y3Rpb25zIGFsb25nIHRoZSByb3V0ZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5nZW9tZXRyeT1nZW9qc29uXSBmb3JtYXQgZm9yIHRoZSByZXR1cm5lZFxuICogcm91dGUuIE9wdGlvbnMgYXJlIGAnZ2VvanNvbidgLCBgJ3BvbHlsaW5lJ2AsIG9yIGBmYWxzZWA6IGBwb2x5bGluZWBcbiAqIHlpZWxkcyBtb3JlIGNvbXBhY3QgcmVzcG9uc2VzIHdoaWNoIGNhbiBiZSBkZWNvZGVkIG9uIHRoZSBjbGllbnQgc2lkZS5cbiAqIFtHZW9KU09OXShodHRwOi8vZ2VvanNvbi5vcmcvKSwgdGhlIGRlZmF1bHQsIGlzIGNvbXBhdGlibGUgd2l0aCBsaWJyYXJpZXNcbiAqIGxpa2UgW01hcGJveCBHTF0oaHR0cHM6Ly93d3cubWFwYm94LmNvbS9tYXBib3gtZ2wvKSxcbiAqIExlYWZsZXQgYW5kIFtNYXBib3guanNdKGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vbWFwYm94LmpzLykuIGBmYWxzZWBcbiAqIG9taXRzIHRoZSBnZW9tZXRyeSBlbnRpcmVseSBhbmQgb25seSByZXR1cm5zIGluc3RydWN0aW9ucy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGNhbGxlZCB3aXRoIChlcnIsIHJlc3VsdHMpXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfSBub3RoaW5nLCBjYWxscyBjYWxsYmFja1xuICogQG1lbWJlcm9mIE1hcGJveENsaWVudFxuICogQGV4YW1wbGVcbiAqIHZhciBtYXBib3hDbGllbnQgPSBuZXcgTWFwYm94Q2xpZW50KCdBQ0NFU1NUT0tFTicpO1xuICogbWFwYm94Q2xpZW50LmdldERpcmVjdGlvbnMoXG4gKiAgIFtcbiAqICAgICB7IGxhdGl0dWRlOiAzMy42LCBsb25naXR1ZGU6IC05NS40NDMxIH0sXG4gKiAgICAgeyBsYXRpdHVkZTogMzMuMiwgbG9uZ2l0dWRlOiAtOTUuNDQzMSB9IF0sXG4gKiAgIGZ1bmN0aW9uKGVyciwgcmVzKSB7XG4gKiAgIC8vIHJlcyBpcyBhIGRvY3VtZW50IHdpdGggZGlyZWN0aW9uc1xuICogfSk7XG4gKlxuICogLy8gV2l0aCBvcHRpb25zXG4gKiBtYXBib3hDbGllbnQuZ2V0RGlyZWN0aW9ucyhbXG4gKiAgIHsgbGF0aXR1ZGU6IDMzLjY4NzU0MzEsIGxvbmdpdHVkZTogLTk1LjQ0MzExNDIgfSxcbiAqICAgeyBsYXRpdHVkZTogMzMuNjg3NTQzMSwgbG9uZ2l0dWRlOiAtOTUuNDgzMTE0MiB9XG4gKiBdLCB7XG4gKiAgIHByb2ZpbGU6ICdtYXBib3gud2Fsa2luZycsXG4gKiAgIGluc3RydWN0aW9uczogJ2h0bWwnLFxuICogICBhbHRlcm5hdGl2ZXM6IGZhbHNlLFxuICogICBnZW9tZXRyeTogJ3BvbHlsaW5lJ1xuICogfSwgZnVuY3Rpb24oZXJyLCByZXN1bHRzKSB7XG4gKiAgIGNvbnNvbGUubG9nKHJlc3VsdHMub3JpZ2luKTtcbiAqIH0pO1xuICovXG5NYXBib3hEaXJlY3Rpb25zLnByb3RvdHlwZS5nZXREaXJlY3Rpb25zID0gZnVuY3Rpb24od2F5cG9pbnRzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXG4gIC8vIHBlcm1pdCB0aGUgb3B0aW9ucyBhcmd1bWVudCB0byBiZSBvbWl0dGVkXG4gIGlmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfSBlbHNlIGlmIChvcHRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cblxuICAvLyB0eXBlY2hlY2sgYXJndW1lbnRzXG4gIGludmFyaWFudChBcnJheS5pc0FycmF5KHdheXBvaW50cyksICd3YXlwb2ludHMgbXVzdCBiZSBhbiBhcnJheScpO1xuICBpbnZhcmlhbnQodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnLCAnb3B0aW9ucyBtdXN0IGJlIGFuIG9iamVjdCcpO1xuXG4gIHZhciBlbmNvZGVkV2F5cG9pbnRzID0gZm9ybWF0UG9pbnRzKHdheXBvaW50cyk7XG5cbiAgdmFyIHByb2ZpbGUgPSAnbWFwYm94LmRyaXZpbmcnLFxuICAgIGFsdGVybmF0aXZlcyA9IHRydWUsXG4gICAgc3RlcHMgPSB0cnVlLFxuICAgIGdlb21ldHJ5ID0gJ2dlb2pzb24nLFxuICAgIGluc3RydWN0aW9ucyA9ICd0ZXh0JztcblxuICBpZiAob3B0aW9ucy5wcm9maWxlKSB7XG4gICAgaW52YXJpYW50KHR5cGVvZiBvcHRpb25zLnByb2ZpbGUgPT09ICdzdHJpbmcnLCAncHJvZmlsZSBvcHRpb24gbXVzdCBiZSBzdHJpbmcnKTtcbiAgICBwcm9maWxlID0gb3B0aW9ucy5wcm9maWxlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvcHRpb25zLmFsdGVybmF0aXZlcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpbnZhcmlhbnQodHlwZW9mIG9wdGlvbnMuYWx0ZXJuYXRpdmVzID09PSAnYm9vbGVhbicsICdhbHRlcm5hdGl2ZXMgb3B0aW9uIG11c3QgYmUgYm9vbGVhbicpO1xuICAgIGFsdGVybmF0aXZlcyA9IG9wdGlvbnMuYWx0ZXJuYXRpdmVzO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvcHRpb25zLnN0ZXBzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGludmFyaWFudCh0eXBlb2Ygb3B0aW9ucy5zdGVwcyA9PT0gJ2Jvb2xlYW4nLCAnc3RlcHMgb3B0aW9uIG11c3QgYmUgYm9vbGVhbicpO1xuICAgIHN0ZXBzID0gb3B0aW9ucy5zdGVwcztcbiAgfVxuXG4gIGlmIChvcHRpb25zLmdlb21ldHJ5KSB7XG4gICAgaW52YXJpYW50KHR5cGVvZiBvcHRpb25zLmdlb21ldHJ5ID09PSAnc3RyaW5nJywgJ2dlb21ldHJ5IG9wdGlvbiBtdXN0IGJlIHN0cmluZycpO1xuICAgIGdlb21ldHJ5ID0gb3B0aW9ucy5nZW9tZXRyeTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmluc3RydWN0aW9ucykge1xuICAgIGludmFyaWFudCh0eXBlb2Ygb3B0aW9ucy5pbnN0cnVjdGlvbnMgPT09ICdzdHJpbmcnLCAnaW5zdHJ1Y3Rpb25zIG9wdGlvbiBtdXN0IGJlIHN0cmluZycpO1xuICAgIGluc3RydWN0aW9ucyA9IG9wdGlvbnMuaW5zdHJ1Y3Rpb25zO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuY2xpZW50KHtcbiAgICBwYXRoOiBjb25zdGFudHMuQVBJX0RJUkVDVElPTlMsXG4gICAgcGFyYW1zOiB7XG4gICAgICBlbmNvZGVkV2F5cG9pbnRzOiBlbmNvZGVkV2F5cG9pbnRzLFxuICAgICAgcHJvZmlsZTogcHJvZmlsZSxcbiAgICAgIGluc3RydWN0aW9uczogaW5zdHJ1Y3Rpb25zLFxuICAgICAgZ2VvbWV0cnk6IGdlb21ldHJ5LFxuICAgICAgYWx0ZXJuYXRpdmVzOiBhbHRlcm5hdGl2ZXMsXG4gICAgICBzdGVwczogc3RlcHNcbiAgICB9LFxuICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwYm94RGlyZWN0aW9ucztcbiIsInZhciBpbnRlcmNlcHRvciA9IHJlcXVpcmUoJ3Jlc3QvaW50ZXJjZXB0b3InKTtcblxudmFyIHN0YW5kYXJkUmVzcG9uc2UgPSBpbnRlcmNlcHRvcih7XG4gIHJlc3BvbnNlOiB0cmFuc2Zvcm0sXG59KTtcblxuZnVuY3Rpb24gdHJhbnNmb3JtKHJlc3BvbnNlKSB7XG4gIHJldHVybiB7XG4gICAgdXJsOiByZXNwb25zZS51cmwsXG4gICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMgPyByZXNwb25zZS5zdGF0dXMuY29kZSA6IHVuZGVmaW5lZCxcbiAgICBoZWFkZXJzOiByZXNwb25zZS5oZWFkZXJzLFxuICAgIGVudGl0eTogcmVzcG9uc2UuZW50aXR5LFxuICAgIGVycm9yOiByZXNwb25zZS5lcnJvcixcbiAgICBjYWxsYmFjazogcmVzcG9uc2UucmVxdWVzdC5jYWxsYmFja1xuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGFuZGFyZFJlc3BvbnNlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEzLTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIE5PREVfRU5WID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlY7XG5cbnZhciBpbnZhcmlhbnQgPSBmdW5jdGlvbihjb25kaXRpb24sIGZvcm1hdCwgYSwgYiwgYywgZCwgZSwgZikge1xuICBpZiAoTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICtcbiAgICAgICAgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJ1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107IH0pXG4gICAgICApO1xuICAgICAgZXJyb3IubmFtZSA9ICdJbnZhcmlhbnQgVmlvbGF0aW9uJztcbiAgICB9XG5cbiAgICBlcnJvci5mcmFtZXNUb1BvcCA9IDE7IC8vIHdlIGRvbid0IGNhcmUgYWJvdXQgaW52YXJpYW50J3Mgb3duIGZyYW1lXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuIiwiIWZ1bmN0aW9uKHQpe1wib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzP21vZHVsZS5leHBvcnRzPXQoKTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKHQpOlwidW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3c/d2luZG93LlByb21pc2U9dCgpOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBnbG9iYWw/Z2xvYmFsLlByb21pc2U9dCgpOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBzZWxmJiYoc2VsZi5Qcm9taXNlPXQoKSl9KGZ1bmN0aW9uKCl7dmFyIHQ7cmV0dXJuIGZ1bmN0aW9uIGUodCxuLG8pe2Z1bmN0aW9uIHIodSxjKXtpZighblt1XSl7aWYoIXRbdV0pe3ZhciBmPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWMmJmYpcmV0dXJuIGYodSwhMCk7aWYoaSlyZXR1cm4gaSh1LCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK3UrXCInXCIpfXZhciBzPW5bdV09e2V4cG9ydHM6e319O3RbdV1bMF0uY2FsbChzLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFt1XVsxXVtlXTtyZXR1cm4gcihuP246ZSl9LHMscy5leHBvcnRzLGUsdCxuLG8pfXJldHVybiBuW3VdLmV4cG9ydHN9Zm9yKHZhciBpPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsdT0wO3U8by5sZW5ndGg7dSsrKXIob1t1XSk7cmV0dXJuIHJ9KHsxOltmdW5jdGlvbih0LGUsbil7dmFyIG89dChcIi4uL2xpYi9kZWNvcmF0b3JzL3VuaGFuZGxlZFJlamVjdGlvblwiKSxyPW8odChcIi4uL2xpYi9Qcm9taXNlXCIpKTtlLmV4cG9ydHM9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9nbG9iYWwuUHJvbWlzZT1yOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBzZWxmP3NlbGYuUHJvbWlzZT1yOnJ9LHtcIi4uL2xpYi9Qcm9taXNlXCI6MixcIi4uL2xpYi9kZWNvcmF0b3JzL3VuaGFuZGxlZFJlamVjdGlvblwiOjR9XSwyOltmdW5jdGlvbihlLG4sbyl7IWZ1bmN0aW9uKHQpe1widXNlIHN0cmljdFwiO3QoZnVuY3Rpb24odCl7dmFyIGU9dChcIi4vbWFrZVByb21pc2VcIiksbj10KFwiLi9TY2hlZHVsZXJcIiksbz10KFwiLi9lbnZcIikuYXNhcDtyZXR1cm4gZSh7c2NoZWR1bGVyOm5ldyBuKG8pfSl9KX0oXCJmdW5jdGlvblwiPT10eXBlb2YgdCYmdC5hbWQ/dDpmdW5jdGlvbih0KXtuLmV4cG9ydHM9dChlKX0pfSx7XCIuL1NjaGVkdWxlclwiOjMsXCIuL2VudlwiOjUsXCIuL21ha2VQcm9taXNlXCI6N31dLDM6W2Z1bmN0aW9uKGUsbixvKXshZnVuY3Rpb24odCl7XCJ1c2Ugc3RyaWN0XCI7dChmdW5jdGlvbigpe2Z1bmN0aW9uIHQodCl7dGhpcy5fYXN5bmM9dCx0aGlzLl9ydW5uaW5nPSExLHRoaXMuX3F1ZXVlPXRoaXMsdGhpcy5fcXVldWVMZW49MCx0aGlzLl9hZnRlclF1ZXVlPXt9LHRoaXMuX2FmdGVyUXVldWVMZW49MDt2YXIgZT10aGlzO3RoaXMuZHJhaW49ZnVuY3Rpb24oKXtlLl9kcmFpbigpfX1yZXR1cm4gdC5wcm90b3R5cGUuZW5xdWV1ZT1mdW5jdGlvbih0KXt0aGlzLl9xdWV1ZVt0aGlzLl9xdWV1ZUxlbisrXT10LHRoaXMucnVuKCl9LHQucHJvdG90eXBlLmFmdGVyUXVldWU9ZnVuY3Rpb24odCl7dGhpcy5fYWZ0ZXJRdWV1ZVt0aGlzLl9hZnRlclF1ZXVlTGVuKytdPXQsdGhpcy5ydW4oKX0sdC5wcm90b3R5cGUucnVuPWZ1bmN0aW9uKCl7dGhpcy5fcnVubmluZ3x8KHRoaXMuX3J1bm5pbmc9ITAsdGhpcy5fYXN5bmModGhpcy5kcmFpbikpfSx0LnByb3RvdHlwZS5fZHJhaW49ZnVuY3Rpb24oKXtmb3IodmFyIHQ9MDt0PHRoaXMuX3F1ZXVlTGVuOysrdCl0aGlzLl9xdWV1ZVt0XS5ydW4oKSx0aGlzLl9xdWV1ZVt0XT12b2lkIDA7Zm9yKHRoaXMuX3F1ZXVlTGVuPTAsdGhpcy5fcnVubmluZz0hMSx0PTA7dDx0aGlzLl9hZnRlclF1ZXVlTGVuOysrdCl0aGlzLl9hZnRlclF1ZXVlW3RdLnJ1bigpLHRoaXMuX2FmdGVyUXVldWVbdF09dm9pZCAwO3RoaXMuX2FmdGVyUXVldWVMZW49MH0sdH0pfShcImZ1bmN0aW9uXCI9PXR5cGVvZiB0JiZ0LmFtZD90OmZ1bmN0aW9uKHQpe24uZXhwb3J0cz10KCl9KX0se31dLDQ6W2Z1bmN0aW9uKGUsbixvKXshZnVuY3Rpb24odCl7XCJ1c2Ugc3RyaWN0XCI7dChmdW5jdGlvbih0KXtmdW5jdGlvbiBlKHQpe3Rocm93IHR9ZnVuY3Rpb24gbigpe312YXIgbz10KFwiLi4vZW52XCIpLnNldFRpbWVyLHI9dChcIi4uL2Zvcm1hdFwiKTtyZXR1cm4gZnVuY3Rpb24odCl7ZnVuY3Rpb24gaSh0KXt0LmhhbmRsZWR8fChsLnB1c2godCksYShcIlBvdGVudGlhbGx5IHVuaGFuZGxlZCByZWplY3Rpb24gW1wiK3QuaWQrXCJdIFwiK3IuZm9ybWF0RXJyb3IodC52YWx1ZSkpKX1mdW5jdGlvbiB1KHQpe3ZhciBlPWwuaW5kZXhPZih0KTtlPj0wJiYobC5zcGxpY2UoZSwxKSxoKFwiSGFuZGxlZCBwcmV2aW91cyByZWplY3Rpb24gW1wiK3QuaWQrXCJdIFwiK3IuZm9ybWF0T2JqZWN0KHQudmFsdWUpKSl9ZnVuY3Rpb24gYyh0LGUpe3AucHVzaCh0LGUpLG51bGw9PT1kJiYoZD1vKGYsMCkpfWZ1bmN0aW9uIGYoKXtmb3IoZD1udWxsO3AubGVuZ3RoPjA7KXAuc2hpZnQoKShwLnNoaWZ0KCkpfXZhciBzLGE9bixoPW47XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGNvbnNvbGUmJihzPWNvbnNvbGUsYT1cInVuZGVmaW5lZFwiIT10eXBlb2Ygcy5lcnJvcj9mdW5jdGlvbih0KXtzLmVycm9yKHQpfTpmdW5jdGlvbih0KXtzLmxvZyh0KX0saD1cInVuZGVmaW5lZFwiIT10eXBlb2Ygcy5pbmZvP2Z1bmN0aW9uKHQpe3MuaW5mbyh0KX06ZnVuY3Rpb24odCl7cy5sb2codCl9KSx0Lm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb249ZnVuY3Rpb24odCl7YyhpLHQpfSx0Lm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkPWZ1bmN0aW9uKHQpe2ModSx0KX0sdC5vbkZhdGFsUmVqZWN0aW9uPWZ1bmN0aW9uKHQpe2MoZSx0LnZhbHVlKX07dmFyIHA9W10sbD1bXSxkPW51bGw7cmV0dXJuIHR9fSl9KFwiZnVuY3Rpb25cIj09dHlwZW9mIHQmJnQuYW1kP3Q6ZnVuY3Rpb24odCl7bi5leHBvcnRzPXQoZSl9KX0se1wiLi4vZW52XCI6NSxcIi4uL2Zvcm1hdFwiOjZ9XSw1OltmdW5jdGlvbihlLG4sbyl7IWZ1bmN0aW9uKHQpe1widXNlIHN0cmljdFwiO3QoZnVuY3Rpb24odCl7ZnVuY3Rpb24gZSgpe3JldHVyblwidW5kZWZpbmVkXCIhPXR5cGVvZiBwcm9jZXNzJiZcIltvYmplY3QgcHJvY2Vzc11cIj09PU9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChwcm9jZXNzKX1mdW5jdGlvbiBuKCl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgTXV0YXRpb25PYnNlcnZlciYmTXV0YXRpb25PYnNlcnZlcnx8XCJmdW5jdGlvblwiPT10eXBlb2YgV2ViS2l0TXV0YXRpb25PYnNlcnZlciYmV2ViS2l0TXV0YXRpb25PYnNlcnZlcn1mdW5jdGlvbiBvKHQpe2Z1bmN0aW9uIGUoKXt2YXIgdD1uO249dm9pZCAwLHQoKX12YXIgbixvPWRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiXCIpLHI9bmV3IHQoZSk7ci5vYnNlcnZlKG8se2NoYXJhY3RlckRhdGE6ITB9KTt2YXIgaT0wO3JldHVybiBmdW5jdGlvbih0KXtuPXQsby5kYXRhPWlePTF9fXZhciByLGk9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNldFRpbWVvdXQmJnNldFRpbWVvdXQsdT1mdW5jdGlvbih0LGUpe3JldHVybiBzZXRUaW1lb3V0KHQsZSl9LGM9ZnVuY3Rpb24odCl7cmV0dXJuIGNsZWFyVGltZW91dCh0KX0sZj1mdW5jdGlvbih0KXtyZXR1cm4gaSh0LDApfTtpZihlKCkpZj1mdW5jdGlvbih0KXtyZXR1cm4gcHJvY2Vzcy5uZXh0VGljayh0KX07ZWxzZSBpZihyPW4oKSlmPW8ocik7ZWxzZSBpZighaSl7dmFyIHM9dCxhPXMoXCJ2ZXJ0eFwiKTt1PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIGEuc2V0VGltZXIoZSx0KX0sYz1hLmNhbmNlbFRpbWVyLGY9YS5ydW5Pbkxvb3B8fGEucnVuT25Db250ZXh0fXJldHVybntzZXRUaW1lcjp1LGNsZWFyVGltZXI6Yyxhc2FwOmZ9fSl9KFwiZnVuY3Rpb25cIj09dHlwZW9mIHQmJnQuYW1kP3Q6ZnVuY3Rpb24odCl7bi5leHBvcnRzPXQoZSl9KX0se31dLDY6W2Z1bmN0aW9uKGUsbixvKXshZnVuY3Rpb24odCl7XCJ1c2Ugc3RyaWN0XCI7dChmdW5jdGlvbigpe2Z1bmN0aW9uIHQodCl7dmFyIG49XCJvYmplY3RcIj09dHlwZW9mIHQmJm51bGwhPT10JiYodC5zdGFja3x8dC5tZXNzYWdlKT90LnN0YWNrfHx0Lm1lc3NhZ2U6ZSh0KTtyZXR1cm4gdCBpbnN0YW5jZW9mIEVycm9yP246bitcIiAoV0FSTklORzogbm9uLUVycm9yIHVzZWQpXCJ9ZnVuY3Rpb24gZSh0KXt2YXIgZT1TdHJpbmcodCk7cmV0dXJuXCJbb2JqZWN0IE9iamVjdF1cIj09PWUmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBKU09OJiYoZT1uKHQsZSkpLGV9ZnVuY3Rpb24gbih0LGUpe3RyeXtyZXR1cm4gSlNPTi5zdHJpbmdpZnkodCl9Y2F0Y2gobil7cmV0dXJuIGV9fXJldHVybntmb3JtYXRFcnJvcjp0LGZvcm1hdE9iamVjdDplLHRyeVN0cmluZ2lmeTpufX0pfShcImZ1bmN0aW9uXCI9PXR5cGVvZiB0JiZ0LmFtZD90OmZ1bmN0aW9uKHQpe24uZXhwb3J0cz10KCl9KX0se31dLDc6W2Z1bmN0aW9uKGUsbixvKXshZnVuY3Rpb24odCl7XCJ1c2Ugc3RyaWN0XCI7dChmdW5jdGlvbigpe3JldHVybiBmdW5jdGlvbih0KXtmdW5jdGlvbiBlKHQsZSl7dGhpcy5faGFuZGxlcj10PT09Xz9lOm4odCl9ZnVuY3Rpb24gbih0KXtmdW5jdGlvbiBlKHQpe3IucmVzb2x2ZSh0KX1mdW5jdGlvbiBuKHQpe3IucmVqZWN0KHQpfWZ1bmN0aW9uIG8odCl7ci5ub3RpZnkodCl9dmFyIHI9bmV3IGI7dHJ5e3QoZSxuLG8pfWNhdGNoKGkpe24oaSl9cmV0dXJuIHJ9ZnVuY3Rpb24gbyh0KXtyZXR1cm4gUyh0KT90Om5ldyBlKF8sbmV3IHgoeSh0KSkpfWZ1bmN0aW9uIHIodCl7cmV0dXJuIG5ldyBlKF8sbmV3IHgobmV3IFAodCkpKX1mdW5jdGlvbiBpKCl7cmV0dXJuICR9ZnVuY3Rpb24gdSgpe3JldHVybiBuZXcgZShfLG5ldyBiKX1mdW5jdGlvbiBjKHQsZSl7dmFyIG49bmV3IGIodC5yZWNlaXZlcix0LmpvaW4oKS5jb250ZXh0KTtyZXR1cm4gbmV3IGUoXyxuKX1mdW5jdGlvbiBmKHQpe3JldHVybiBhKEssbnVsbCx0KX1mdW5jdGlvbiBzKHQsZSl7cmV0dXJuIGEoRix0LGUpfWZ1bmN0aW9uIGEodCxuLG8pe2Z1bmN0aW9uIHIoZSxyLHUpe3UucmVzb2x2ZWR8fGgobyxpLGUsdChuLHIsZSksdSl9ZnVuY3Rpb24gaSh0LGUsbil7YVt0XT1lLDA9PT0tLXMmJm4uYmVjb21lKG5ldyBxKGEpKX1mb3IodmFyIHUsYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiBuP3I6aSxmPW5ldyBiLHM9by5sZW5ndGg+Pj4wLGE9bmV3IEFycmF5KHMpLHA9MDtwPG8ubGVuZ3RoJiYhZi5yZXNvbHZlZDsrK3ApdT1vW3BdLHZvaWQgMCE9PXV8fHAgaW4gbz9oKG8sYyxwLHUsZik6LS1zO3JldHVybiAwPT09cyYmZi5iZWNvbWUobmV3IHEoYSkpLG5ldyBlKF8sZil9ZnVuY3Rpb24gaCh0LGUsbixvLHIpe2lmKFUobykpe3ZhciBpPW0obyksdT1pLnN0YXRlKCk7MD09PXU/aS5mb2xkKGUsbix2b2lkIDAscik6dT4wP2UobixpLnZhbHVlLHIpOihyLmJlY29tZShpKSxwKHQsbisxLGkpKX1lbHNlIGUobixvLHIpfWZ1bmN0aW9uIHAodCxlLG4pe2Zvcih2YXIgbz1lO288dC5sZW5ndGg7KytvKWwoeSh0W29dKSxuKX1mdW5jdGlvbiBsKHQsZSl7aWYodCE9PWUpe3ZhciBuPXQuc3RhdGUoKTswPT09bj90LnZpc2l0KHQsdm9pZCAwLHQuX3VucmVwb3J0KTowPm4mJnQuX3VucmVwb3J0KCl9fWZ1bmN0aW9uIGQodCl7cmV0dXJuXCJvYmplY3RcIiE9dHlwZW9mIHR8fG51bGw9PT10P3IobmV3IFR5cGVFcnJvcihcIm5vbi1pdGVyYWJsZSBwYXNzZWQgdG8gcmFjZSgpXCIpKTowPT09dC5sZW5ndGg/aSgpOjE9PT10Lmxlbmd0aD9vKHRbMF0pOnYodCl9ZnVuY3Rpb24gdih0KXt2YXIgbixvLHIsaT1uZXcgYjtmb3Iobj0wO248dC5sZW5ndGg7KytuKWlmKG89dFtuXSx2b2lkIDAhPT1vfHxuIGluIHQpe2lmKHI9eShvKSwwIT09ci5zdGF0ZSgpKXtpLmJlY29tZShyKSxwKHQsbisxLHIpO2JyZWFrfXIudmlzaXQoaSxpLnJlc29sdmUsaS5yZWplY3QpfXJldHVybiBuZXcgZShfLGkpfWZ1bmN0aW9uIHkodCl7cmV0dXJuIFModCk/dC5faGFuZGxlci5qb2luKCk6VSh0KT9qKHQpOm5ldyBxKHQpfWZ1bmN0aW9uIG0odCl7cmV0dXJuIFModCk/dC5faGFuZGxlci5qb2luKCk6aih0KX1mdW5jdGlvbiBqKHQpe3RyeXt2YXIgZT10LnRoZW47cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgZT9uZXcgZyhlLHQpOm5ldyBxKHQpfWNhdGNoKG4pe3JldHVybiBuZXcgUChuKX19ZnVuY3Rpb24gXygpe31mdW5jdGlvbiB3KCl7fWZ1bmN0aW9uIGIodCxuKXtlLmNyZWF0ZUNvbnRleHQodGhpcyxuKSx0aGlzLmNvbnN1bWVycz12b2lkIDAsdGhpcy5yZWNlaXZlcj10LHRoaXMuaGFuZGxlcj12b2lkIDAsdGhpcy5yZXNvbHZlZD0hMX1mdW5jdGlvbiB4KHQpe3RoaXMuaGFuZGxlcj10fWZ1bmN0aW9uIGcodCxlKXtiLmNhbGwodGhpcyksSS5lbnF1ZXVlKG5ldyBFKHQsZSx0aGlzKSl9ZnVuY3Rpb24gcSh0KXtlLmNyZWF0ZUNvbnRleHQodGhpcyksdGhpcy52YWx1ZT10fWZ1bmN0aW9uIFAodCl7ZS5jcmVhdGVDb250ZXh0KHRoaXMpLHRoaXMuaWQ9KytZLHRoaXMudmFsdWU9dCx0aGlzLmhhbmRsZWQ9ITEsdGhpcy5yZXBvcnRlZD0hMSx0aGlzLl9yZXBvcnQoKX1mdW5jdGlvbiBSKHQsZSl7dGhpcy5yZWplY3Rpb249dCx0aGlzLmNvbnRleHQ9ZX1mdW5jdGlvbiBDKHQpe3RoaXMucmVqZWN0aW9uPXR9ZnVuY3Rpb24gTygpe3JldHVybiBuZXcgUChuZXcgVHlwZUVycm9yKFwiUHJvbWlzZSBjeWNsZVwiKSl9ZnVuY3Rpb24gVCh0LGUpe3RoaXMuY29udGludWF0aW9uPXQsdGhpcy5oYW5kbGVyPWV9ZnVuY3Rpb24gUSh0LGUpe3RoaXMuaGFuZGxlcj1lLHRoaXMudmFsdWU9dH1mdW5jdGlvbiBFKHQsZSxuKXt0aGlzLl90aGVuPXQsdGhpcy50aGVuYWJsZT1lLHRoaXMucmVzb2x2ZXI9bn1mdW5jdGlvbiBMKHQsZSxuLG8scil7dHJ5e3QuY2FsbChlLG4sbyxyKX1jYXRjaChpKXtvKGkpfX1mdW5jdGlvbiBrKHQsZSxuLG8pe3RoaXMuZj10LHRoaXMuej1lLHRoaXMuYz1uLHRoaXMudG89byx0aGlzLnJlc29sdmVyPVgsdGhpcy5yZWNlaXZlcj10aGlzfWZ1bmN0aW9uIFModCl7cmV0dXJuIHQgaW5zdGFuY2VvZiBlfWZ1bmN0aW9uIFUodCl7cmV0dXJuKFwib2JqZWN0XCI9PXR5cGVvZiB0fHxcImZ1bmN0aW9uXCI9PXR5cGVvZiB0KSYmbnVsbCE9PXR9ZnVuY3Rpb24gSCh0LG4sbyxyKXtyZXR1cm5cImZ1bmN0aW9uXCIhPXR5cGVvZiB0P3IuYmVjb21lKG4pOihlLmVudGVyQ29udGV4dChuKSxXKHQsbi52YWx1ZSxvLHIpLHZvaWQgZS5leGl0Q29udGV4dCgpKX1mdW5jdGlvbiBOKHQsbixvLHIsaSl7cmV0dXJuXCJmdW5jdGlvblwiIT10eXBlb2YgdD9pLmJlY29tZShvKTooZS5lbnRlckNvbnRleHQobykseih0LG4sby52YWx1ZSxyLGkpLHZvaWQgZS5leGl0Q29udGV4dCgpKX1mdW5jdGlvbiBNKHQsbixvLHIsaSl7cmV0dXJuXCJmdW5jdGlvblwiIT10eXBlb2YgdD9pLm5vdGlmeShuKTooZS5lbnRlckNvbnRleHQobyksQSh0LG4scixpKSx2b2lkIGUuZXhpdENvbnRleHQoKSl9ZnVuY3Rpb24gRih0LGUsbil7dHJ5e3JldHVybiB0KGUsbil9Y2F0Y2gobyl7cmV0dXJuIHIobyl9fWZ1bmN0aW9uIFcodCxlLG4sbyl7dHJ5e28uYmVjb21lKHkodC5jYWxsKG4sZSkpKX1jYXRjaChyKXtvLmJlY29tZShuZXcgUChyKSl9fWZ1bmN0aW9uIHoodCxlLG4sbyxyKXt0cnl7dC5jYWxsKG8sZSxuLHIpfWNhdGNoKGkpe3IuYmVjb21lKG5ldyBQKGkpKX19ZnVuY3Rpb24gQSh0LGUsbixvKXt0cnl7by5ub3RpZnkodC5jYWxsKG4sZSkpfWNhdGNoKHIpe28ubm90aWZ5KHIpfX1mdW5jdGlvbiBKKHQsZSl7ZS5wcm90b3R5cGU9Vih0LnByb3RvdHlwZSksZS5wcm90b3R5cGUuY29uc3RydWN0b3I9ZX1mdW5jdGlvbiBLKHQsZSl7cmV0dXJuIGV9ZnVuY3Rpb24gRCgpe31mdW5jdGlvbiBHKCl7cmV0dXJuXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHByb2Nlc3MmJm51bGwhPT1wcm9jZXNzJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBwcm9jZXNzLmVtaXQ/ZnVuY3Rpb24odCxlKXtyZXR1cm5cInVuaGFuZGxlZFJlamVjdGlvblwiPT09dD9wcm9jZXNzLmVtaXQodCxlLnZhbHVlLGUpOnByb2Nlc3MuZW1pdCh0LGUpfTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2VsZiYmXCJmdW5jdGlvblwiPT10eXBlb2YgQ3VzdG9tRXZlbnQ/ZnVuY3Rpb24odCxlLG4pe3ZhciBvPSExO3RyeXt2YXIgcj1uZXcgbihcInVuaGFuZGxlZFJlamVjdGlvblwiKTtvPXIgaW5zdGFuY2VvZiBufWNhdGNoKGkpe31yZXR1cm4gbz9mdW5jdGlvbih0LG8pe3ZhciByPW5ldyBuKHQse2RldGFpbDp7cmVhc29uOm8udmFsdWUsa2V5Om99LGJ1YmJsZXM6ITEsY2FuY2VsYWJsZTohMH0pO3JldHVybiFlLmRpc3BhdGNoRXZlbnQocil9OnR9KEQsc2VsZixDdXN0b21FdmVudCk6RH12YXIgST10LnNjaGVkdWxlcixCPUcoKSxWPU9iamVjdC5jcmVhdGV8fGZ1bmN0aW9uKHQpe2Z1bmN0aW9uIGUoKXt9cmV0dXJuIGUucHJvdG90eXBlPXQsbmV3IGV9O2UucmVzb2x2ZT1vLGUucmVqZWN0PXIsZS5uZXZlcj1pLGUuX2RlZmVyPXUsZS5faGFuZGxlcj15LGUucHJvdG90eXBlLnRoZW49ZnVuY3Rpb24odCxlLG4pe3ZhciBvPXRoaXMuX2hhbmRsZXIscj1vLmpvaW4oKS5zdGF0ZSgpO2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHQmJnI+MHx8XCJmdW5jdGlvblwiIT10eXBlb2YgZSYmMD5yKXJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvcihfLG8pO3ZhciBpPXRoaXMuX2JlZ2V0KCksdT1pLl9oYW5kbGVyO3JldHVybiBvLmNoYWluKHUsby5yZWNlaXZlcix0LGUsbiksaX0sZS5wcm90b3R5cGVbXCJjYXRjaFwiXT1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy50aGVuKHZvaWQgMCx0KX0sZS5wcm90b3R5cGUuX2JlZ2V0PWZ1bmN0aW9uKCl7cmV0dXJuIGModGhpcy5faGFuZGxlcix0aGlzLmNvbnN0cnVjdG9yKX0sZS5hbGw9ZixlLnJhY2U9ZCxlLl90cmF2ZXJzZT1zLGUuX3Zpc2l0UmVtYWluaW5nPXAsXy5wcm90b3R5cGUud2hlbj1fLnByb3RvdHlwZS5iZWNvbWU9Xy5wcm90b3R5cGUubm90aWZ5PV8ucHJvdG90eXBlLmZhaWw9Xy5wcm90b3R5cGUuX3VucmVwb3J0PV8ucHJvdG90eXBlLl9yZXBvcnQ9RCxfLnByb3RvdHlwZS5fc3RhdGU9MCxfLnByb3RvdHlwZS5zdGF0ZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9zdGF0ZX0sXy5wcm90b3R5cGUuam9pbj1mdW5jdGlvbigpe2Zvcih2YXIgdD10aGlzO3ZvaWQgMCE9PXQuaGFuZGxlcjspdD10LmhhbmRsZXI7cmV0dXJuIHR9LF8ucHJvdG90eXBlLmNoYWluPWZ1bmN0aW9uKHQsZSxuLG8scil7dGhpcy53aGVuKHtyZXNvbHZlcjp0LHJlY2VpdmVyOmUsZnVsZmlsbGVkOm4scmVqZWN0ZWQ6byxwcm9ncmVzczpyfSl9LF8ucHJvdG90eXBlLnZpc2l0PWZ1bmN0aW9uKHQsZSxuLG8pe3RoaXMuY2hhaW4oWCx0LGUsbixvKX0sXy5wcm90b3R5cGUuZm9sZD1mdW5jdGlvbih0LGUsbixvKXt0aGlzLndoZW4obmV3IGsodCxlLG4sbykpfSxKKF8sdyksdy5wcm90b3R5cGUuYmVjb21lPWZ1bmN0aW9uKHQpe3QuZmFpbCgpfTt2YXIgWD1uZXcgdztKKF8sYiksYi5wcm90b3R5cGUuX3N0YXRlPTAsYi5wcm90b3R5cGUucmVzb2x2ZT1mdW5jdGlvbih0KXt0aGlzLmJlY29tZSh5KHQpKX0sYi5wcm90b3R5cGUucmVqZWN0PWZ1bmN0aW9uKHQpe3RoaXMucmVzb2x2ZWR8fHRoaXMuYmVjb21lKG5ldyBQKHQpKX0sYi5wcm90b3R5cGUuam9pbj1mdW5jdGlvbigpe2lmKCF0aGlzLnJlc29sdmVkKXJldHVybiB0aGlzO2Zvcih2YXIgdD10aGlzO3ZvaWQgMCE9PXQuaGFuZGxlcjspaWYodD10LmhhbmRsZXIsdD09PXRoaXMpcmV0dXJuIHRoaXMuaGFuZGxlcj1PKCk7cmV0dXJuIHR9LGIucHJvdG90eXBlLnJ1bj1mdW5jdGlvbigpe3ZhciB0PXRoaXMuY29uc3VtZXJzLGU9dGhpcy5oYW5kbGVyO3RoaXMuaGFuZGxlcj10aGlzLmhhbmRsZXIuam9pbigpLHRoaXMuY29uc3VtZXJzPXZvaWQgMDtmb3IodmFyIG49MDtuPHQubGVuZ3RoOysrbillLndoZW4odFtuXSl9LGIucHJvdG90eXBlLmJlY29tZT1mdW5jdGlvbih0KXt0aGlzLnJlc29sdmVkfHwodGhpcy5yZXNvbHZlZD0hMCx0aGlzLmhhbmRsZXI9dCx2b2lkIDAhPT10aGlzLmNvbnN1bWVycyYmSS5lbnF1ZXVlKHRoaXMpLHZvaWQgMCE9PXRoaXMuY29udGV4dCYmdC5fcmVwb3J0KHRoaXMuY29udGV4dCkpfSxiLnByb3RvdHlwZS53aGVuPWZ1bmN0aW9uKHQpe3RoaXMucmVzb2x2ZWQ/SS5lbnF1ZXVlKG5ldyBUKHQsdGhpcy5oYW5kbGVyKSk6dm9pZCAwPT09dGhpcy5jb25zdW1lcnM/dGhpcy5jb25zdW1lcnM9W3RdOnRoaXMuY29uc3VtZXJzLnB1c2godCl9LGIucHJvdG90eXBlLm5vdGlmeT1mdW5jdGlvbih0KXt0aGlzLnJlc29sdmVkfHxJLmVucXVldWUobmV3IFEodCx0aGlzKSl9LGIucHJvdG90eXBlLmZhaWw9ZnVuY3Rpb24odCl7dmFyIGU9XCJ1bmRlZmluZWRcIj09dHlwZW9mIHQ/dGhpcy5jb250ZXh0OnQ7dGhpcy5yZXNvbHZlZCYmdGhpcy5oYW5kbGVyLmpvaW4oKS5mYWlsKGUpfSxiLnByb3RvdHlwZS5fcmVwb3J0PWZ1bmN0aW9uKHQpe3RoaXMucmVzb2x2ZWQmJnRoaXMuaGFuZGxlci5qb2luKCkuX3JlcG9ydCh0KX0sYi5wcm90b3R5cGUuX3VucmVwb3J0PWZ1bmN0aW9uKCl7dGhpcy5yZXNvbHZlZCYmdGhpcy5oYW5kbGVyLmpvaW4oKS5fdW5yZXBvcnQoKX0sSihfLHgpLHgucHJvdG90eXBlLndoZW49ZnVuY3Rpb24odCl7SS5lbnF1ZXVlKG5ldyBUKHQsdGhpcykpfSx4LnByb3RvdHlwZS5fcmVwb3J0PWZ1bmN0aW9uKHQpe3RoaXMuam9pbigpLl9yZXBvcnQodCl9LHgucHJvdG90eXBlLl91bnJlcG9ydD1mdW5jdGlvbigpe3RoaXMuam9pbigpLl91bnJlcG9ydCgpfSxKKGIsZyksSihfLHEpLHEucHJvdG90eXBlLl9zdGF0ZT0xLHEucHJvdG90eXBlLmZvbGQ9ZnVuY3Rpb24odCxlLG4sbyl7Tih0LGUsdGhpcyxuLG8pfSxxLnByb3RvdHlwZS53aGVuPWZ1bmN0aW9uKHQpe0godC5mdWxmaWxsZWQsdGhpcyx0LnJlY2VpdmVyLHQucmVzb2x2ZXIpfTt2YXIgWT0wO0ooXyxQKSxQLnByb3RvdHlwZS5fc3RhdGU9LTEsUC5wcm90b3R5cGUuZm9sZD1mdW5jdGlvbih0LGUsbixvKXtvLmJlY29tZSh0aGlzKX0sUC5wcm90b3R5cGUud2hlbj1mdW5jdGlvbih0KXtcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnJlamVjdGVkJiZ0aGlzLl91bnJlcG9ydCgpLEgodC5yZWplY3RlZCx0aGlzLHQucmVjZWl2ZXIsdC5yZXNvbHZlcil9LFAucHJvdG90eXBlLl9yZXBvcnQ9ZnVuY3Rpb24odCl7SS5hZnRlclF1ZXVlKG5ldyBSKHRoaXMsdCkpfSxQLnByb3RvdHlwZS5fdW5yZXBvcnQ9ZnVuY3Rpb24oKXt0aGlzLmhhbmRsZWR8fCh0aGlzLmhhbmRsZWQ9ITAsSS5hZnRlclF1ZXVlKG5ldyBDKHRoaXMpKSl9LFAucHJvdG90eXBlLmZhaWw9ZnVuY3Rpb24odCl7dGhpcy5yZXBvcnRlZD0hMCxCKFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsdGhpcyksZS5vbkZhdGFsUmVqZWN0aW9uKHRoaXMsdm9pZCAwPT09dD90aGlzLmNvbnRleHQ6dCl9LFIucHJvdG90eXBlLnJ1bj1mdW5jdGlvbigpe3RoaXMucmVqZWN0aW9uLmhhbmRsZWR8fHRoaXMucmVqZWN0aW9uLnJlcG9ydGVkfHwodGhpcy5yZWplY3Rpb24ucmVwb3J0ZWQ9ITAsQihcInVuaGFuZGxlZFJlamVjdGlvblwiLHRoaXMucmVqZWN0aW9uKXx8ZS5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uKHRoaXMucmVqZWN0aW9uLHRoaXMuY29udGV4dCkpfSxDLnByb3RvdHlwZS5ydW49ZnVuY3Rpb24oKXt0aGlzLnJlamVjdGlvbi5yZXBvcnRlZCYmKEIoXCJyZWplY3Rpb25IYW5kbGVkXCIsdGhpcy5yZWplY3Rpb24pfHxlLm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkKHRoaXMucmVqZWN0aW9uKSl9LGUuY3JlYXRlQ29udGV4dD1lLmVudGVyQ29udGV4dD1lLmV4aXRDb250ZXh0PWUub25Qb3RlbnRpYWxseVVuaGFuZGxlZFJlamVjdGlvbj1lLm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkPWUub25GYXRhbFJlamVjdGlvbj1EO3ZhciBaPW5ldyBfLCQ9bmV3IGUoXyxaKTtyZXR1cm4gVC5wcm90b3R5cGUucnVuPWZ1bmN0aW9uKCl7dGhpcy5oYW5kbGVyLmpvaW4oKS53aGVuKHRoaXMuY29udGludWF0aW9uKX0sUS5wcm90b3R5cGUucnVuPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5oYW5kbGVyLmNvbnN1bWVycztpZih2b2lkIDAhPT10KWZvcih2YXIgZSxuPTA7bjx0Lmxlbmd0aDsrK24pZT10W25dLE0oZS5wcm9ncmVzcyx0aGlzLnZhbHVlLHRoaXMuaGFuZGxlcixlLnJlY2VpdmVyLGUucmVzb2x2ZXIpfSxFLnByb3RvdHlwZS5ydW49ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQpe28ucmVzb2x2ZSh0KX1mdW5jdGlvbiBlKHQpe28ucmVqZWN0KHQpfWZ1bmN0aW9uIG4odCl7by5ub3RpZnkodCl9dmFyIG89dGhpcy5yZXNvbHZlcjtMKHRoaXMuX3RoZW4sdGhpcy50aGVuYWJsZSx0LGUsbil9LGsucHJvdG90eXBlLmZ1bGZpbGxlZD1mdW5jdGlvbih0KXt0aGlzLmYuY2FsbCh0aGlzLmMsdGhpcy56LHQsdGhpcy50byl9LGsucHJvdG90eXBlLnJlamVjdGVkPWZ1bmN0aW9uKHQpe3RoaXMudG8ucmVqZWN0KHQpfSxrLnByb3RvdHlwZS5wcm9ncmVzcz1mdW5jdGlvbih0KXt0aGlzLnRvLm5vdGlmeSh0KX0sZX19KX0oXCJmdW5jdGlvblwiPT10eXBlb2YgdCYmdC5hbWQ/dDpmdW5jdGlvbih0KXtuLmV4cG9ydHM9dCgpfSl9LHt9XX0se30sWzFdKSgxKX0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9UHJvbWlzZS5taW4uanMubWFwXG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWl4aW4sIHhXV1dGb3JtVVJMRW5jb2Rlciwgb3JpZ2luLCB1cmxSRSwgYWJzb2x1dGVVcmxSRSwgZnVsbHlRdWFsaWZpZWRVcmxSRTtcblxubWl4aW4gPSByZXF1aXJlKCcuL3V0aWwvbWl4aW4nKTtcbnhXV1dGb3JtVVJMRW5jb2RlciA9IHJlcXVpcmUoJy4vbWltZS90eXBlL2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuXG51cmxSRSA9IC8oW2Etel1bYS16MC05XFwrXFwtXFwuXSo6KVxcL1xcLyhbXkBdK0ApPygoW146XFwvXSspKDooWzAtOV0rKSk/KT8oXFwvW14/I10qKT8oXFw/W14jXSopPygjXFxTKik/L2k7XG5hYnNvbHV0ZVVybFJFID0gL14oW2Etel1bYS16MC05XFwtXFwrXFwuXSo6XFwvXFwvfFxcLykvaTtcbmZ1bGx5UXVhbGlmaWVkVXJsUkUgPSAvKFthLXpdW2EtejAtOVxcK1xcLVxcLl0qOilcXC9cXC8oW15AXStAKT8oKFteOlxcL10rKSg6KFswLTldKykpPyk/XFwvL2k7XG5cbi8qKlxuICogQXBwbHkgcGFyYW1zIHRvIHRoZSB0ZW1wbGF0ZSB0byBjcmVhdGUgYSBVUkwuXG4gKlxuICogUGFyYW1ldGVycyB0aGF0IGFyZSBub3QgYXBwbGllZCBkaXJlY3RseSB0byB0aGUgdGVtcGxhdGUsIGFyZSBhcHBlbmRlZFxuICogdG8gdGhlIFVSTCBhcyBxdWVyeSBzdHJpbmcgcGFyYW1ldGVycy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGVtcGxhdGUgdGhlIFVSSSB0ZW1wbGF0ZVxuICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyBwYXJhbWV0ZXJzIHRvIGFwcGx5IHRvIHRoZSB0ZW1wbGF0ZVxuICogQHJldHVybiB7c3RyaW5nfSB0aGUgcmVzdWx0aW5nIFVSTFxuICovXG5mdW5jdGlvbiBidWlsZFVybCh0ZW1wbGF0ZSwgcGFyYW1zKSB7XG5cdC8vIGludGVybmFsIGJ1aWxkZXIgdG8gY29udmVydCB0ZW1wbGF0ZSB3aXRoIHBhcmFtcy5cblx0dmFyIHVybCwgbmFtZSwgcXVlcnlTdHJpbmdQYXJhbXMsIHF1ZXJ5U3RyaW5nLCByZTtcblxuXHR1cmwgPSB0ZW1wbGF0ZTtcblx0cXVlcnlTdHJpbmdQYXJhbXMgPSB7fTtcblxuXHRpZiAocGFyYW1zKSB7XG5cdFx0Zm9yIChuYW1lIGluIHBhcmFtcykge1xuXHRcdFx0Lypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cblx0XHRcdHJlID0gbmV3IFJlZ0V4cCgnXFxcXHsnICsgbmFtZSArICdcXFxcfScpO1xuXHRcdFx0aWYgKHJlLnRlc3QodXJsKSkge1xuXHRcdFx0XHR1cmwgPSB1cmwucmVwbGFjZShyZSwgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1tuYW1lXSksICdnJyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cXVlcnlTdHJpbmdQYXJhbXNbbmFtZV0gPSBwYXJhbXNbbmFtZV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cXVlcnlTdHJpbmcgPSB4V1dXRm9ybVVSTEVuY29kZXIud3JpdGUocXVlcnlTdHJpbmdQYXJhbXMpO1xuXHRcdGlmIChxdWVyeVN0cmluZykge1xuXHRcdFx0dXJsICs9IHVybC5pbmRleE9mKCc/JykgPT09IC0xID8gJz8nIDogJyYnO1xuXHRcdFx0dXJsICs9IHF1ZXJ5U3RyaW5nO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gdXJsO1xufVxuXG5mdW5jdGlvbiBzdGFydHNXaXRoKHN0ciwgdGVzdCkge1xuXHRyZXR1cm4gc3RyLmluZGV4T2YodGVzdCkgPT09IDA7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IFVSTCBCdWlsZGVyXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8VXJsQnVpbGRlcn0gdGVtcGxhdGUgdGhlIGJhc2UgdGVtcGxhdGUgdG8gYnVpbGQgZnJvbSwgbWF5IGJlIGFub3RoZXIgVXJsQnVpbGRlclxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIGJhc2UgcGFyYW1ldGVyc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFVybEJ1aWxkZXIodGVtcGxhdGUsIHBhcmFtcykge1xuXHRpZiAoISh0aGlzIGluc3RhbmNlb2YgVXJsQnVpbGRlcikpIHtcblx0XHQvLyBpbnZva2UgYXMgYSBjb25zdHJ1Y3RvclxuXHRcdHJldHVybiBuZXcgVXJsQnVpbGRlcih0ZW1wbGF0ZSwgcGFyYW1zKTtcblx0fVxuXG5cdGlmICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIFVybEJ1aWxkZXIpIHtcblx0XHR0aGlzLl90ZW1wbGF0ZSA9IHRlbXBsYXRlLnRlbXBsYXRlO1xuXHRcdHRoaXMuX3BhcmFtcyA9IG1peGluKHt9LCB0aGlzLl9wYXJhbXMsIHBhcmFtcyk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0dGhpcy5fdGVtcGxhdGUgPSAodGVtcGxhdGUgfHwgJycpLnRvU3RyaW5nKCk7XG5cdFx0dGhpcy5fcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuXHR9XG59XG5cblVybEJ1aWxkZXIucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBuZXcgVXJsQnVpbGRlciBpbnN0YW5jZSB0aGF0IGV4dGVuZHMgdGhlIGN1cnJlbnQgYnVpbGRlci5cblx0ICogVGhlIGN1cnJlbnQgYnVpbGRlciBpcyB1bm1vZGlmaWVkLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gW3RlbXBsYXRlXSBVUkwgdGVtcGxhdGUgdG8gYXBwZW5kIHRvIHRoZSBjdXJyZW50IHRlbXBsYXRlXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSBwYXJhbXMgdG8gY29tYmluZSB3aXRoIGN1cnJlbnQgcGFyYW1zLiAgTmV3IHBhcmFtcyBvdmVycmlkZSBleGlzdGluZyBwYXJhbXNcblx0ICogQHJldHVybiB7VXJsQnVpbGRlcn0gdGhlIG5ldyBidWlsZGVyXG5cdCAqL1xuXHRhcHBlbmQ6IGZ1bmN0aW9uICh0ZW1wbGF0ZSwgIHBhcmFtcykge1xuXHRcdC8vIFRPRE8gY29uc2lkZXIgcXVlcnkgc3RyaW5ncyBhbmQgZnJhZ21lbnRzXG5cdFx0cmV0dXJuIG5ldyBVcmxCdWlsZGVyKHRoaXMuX3RlbXBsYXRlICsgdGVtcGxhdGUsIG1peGluKHt9LCB0aGlzLl9wYXJhbXMsIHBhcmFtcykpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBuZXcgVXJsQnVpbGRlciB3aXRoIGEgZnVsbHkgcXVhbGlmaWVkIFVSTCBiYXNlZCBvbiB0aGVcblx0ICogd2luZG93J3MgbG9jYXRpb24gb3IgYmFzZSBocmVmIGFuZCB0aGUgY3VycmVudCB0ZW1wbGF0ZXMgcmVsYXRpdmUgVVJMLlxuXHQgKlxuXHQgKiBQYXRoIHZhcmlhYmxlcyBhcmUgcHJlc2VydmVkLlxuXHQgKlxuXHQgKiAqQnJvd3NlciBvbmx5KlxuXHQgKlxuXHQgKiBAcmV0dXJuIHtVcmxCdWlsZGVyfSB0aGUgZnVsbHkgcXVhbGlmaWVkIFVSTCB0ZW1wbGF0ZVxuXHQgKi9cblx0ZnVsbHlRdWFsaWZ5OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHR5cGVvZiBsb2NhdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHsgcmV0dXJuIHRoaXM7IH1cblx0XHRpZiAodGhpcy5pc0Z1bGx5UXVhbGlmaWVkKCkpIHsgcmV0dXJuIHRoaXM7IH1cblxuXHRcdHZhciB0ZW1wbGF0ZSA9IHRoaXMuX3RlbXBsYXRlO1xuXG5cdFx0aWYgKHN0YXJ0c1dpdGgodGVtcGxhdGUsICcvLycpKSB7XG5cdFx0XHR0ZW1wbGF0ZSA9IG9yaWdpbi5wcm90b2NvbCArIHRlbXBsYXRlO1xuXHRcdH1cblx0XHRlbHNlIGlmIChzdGFydHNXaXRoKHRlbXBsYXRlLCAnLycpKSB7XG5cdFx0XHR0ZW1wbGF0ZSA9IG9yaWdpbi5vcmlnaW4gKyB0ZW1wbGF0ZTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoIXRoaXMuaXNBYnNvbHV0ZSgpKSB7XG5cdFx0XHR0ZW1wbGF0ZSA9IG9yaWdpbi5vcmlnaW4gKyBvcmlnaW4ucGF0aG5hbWUuc3Vic3RyaW5nKDAsIG9yaWdpbi5wYXRobmFtZS5sYXN0SW5kZXhPZignLycpICsgMSk7XG5cdFx0fVxuXG5cdFx0aWYgKHRlbXBsYXRlLmluZGV4T2YoJy8nLCA4KSA9PT0gLTEpIHtcblx0XHRcdC8vIGRlZmF1bHQgdGhlIHBhdGhuYW1lIHRvICcvJ1xuXHRcdFx0dGVtcGxhdGUgPSB0ZW1wbGF0ZSArICcvJztcblx0XHR9XG5cblx0XHRyZXR1cm4gbmV3IFVybEJ1aWxkZXIodGVtcGxhdGUsIHRoaXMuX3BhcmFtcyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFRydWUgaWYgdGhlIFVSTCBpcyBhYnNvbHV0ZVxuXHQgKlxuXHQgKiBAcmV0dXJuIHtib29sZWFufVxuXHQgKi9cblx0aXNBYnNvbHV0ZTogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiBhYnNvbHV0ZVVybFJFLnRlc3QodGhpcy5idWlsZCgpKTtcblx0fSxcblxuXHQvKipcblx0ICogVHJ1ZSBpZiB0aGUgVVJMIGlzIGZ1bGx5IHF1YWxpZmllZFxuXHQgKlxuXHQgKiBAcmV0dXJuIHtib29sZWFufVxuXHQgKi9cblx0aXNGdWxseVF1YWxpZmllZDogZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiBmdWxseVF1YWxpZmllZFVybFJFLnRlc3QodGhpcy5idWlsZCgpKTtcblx0fSxcblxuXHQvKipcblx0ICogVHJ1ZSBpZiB0aGUgVVJMIGlzIGNyb3NzIG9yaWdpbi4gVGhlIHByb3RvY29sLCBob3N0IGFuZCBwb3J0IG11c3Qgbm90IGJlXG5cdCAqIHRoZSBzYW1lIGluIG9yZGVyIHRvIGJlIGNyb3NzIG9yaWdpbixcblx0ICpcblx0ICogQHJldHVybiB7Ym9vbGVhbn1cblx0ICovXG5cdGlzQ3Jvc3NPcmlnaW46IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIW9yaWdpbikge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHZhciB1cmwgPSB0aGlzLnBhcnRzKCk7XG5cdFx0cmV0dXJuIHVybC5wcm90b2NvbCAhPT0gb3JpZ2luLnByb3RvY29sIHx8XG5cdFx0ICAgICAgIHVybC5ob3N0bmFtZSAhPT0gb3JpZ2luLmhvc3RuYW1lIHx8XG5cdFx0ICAgICAgIHVybC5wb3J0ICE9PSBvcmlnaW4ucG9ydDtcblx0fSxcblxuXHQvKipcblx0ICogU3BsaXQgYSBVUkwgaW50byBpdHMgY29uc2l0dWVudCBwYXJ0cyBmb2xsb3dpbmcgdGhlIG5hbWluZyBjb252ZW50aW9uIG9mXG5cdCAqICd3aW5kb3cubG9jYXRpb24nLiBPbmUgZGlmZmVyZW5jZSBpcyB0aGF0IHRoZSBwb3J0IHdpbGwgY29udGFpbiB0aGVcblx0ICogcHJvdG9jb2wgZGVmYXVsdCBpZiBub3Qgc3BlY2lmaWVkLlxuXHQgKlxuXHQgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvRE9NL3dpbmRvdy5sb2NhdGlvblxuXHQgKlxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBhICd3aW5kb3cubG9jYXRpb24nLWxpa2Ugb2JqZWN0XG5cdCAqL1xuXHRwYXJ0czogZnVuY3Rpb24gKCkge1xuXHRcdC8qanNoaW50IG1heGNvbXBsZXhpdHk6MjAgKi9cblx0XHR2YXIgdXJsLCBwYXJ0cztcblx0XHR1cmwgPSB0aGlzLmZ1bGx5UXVhbGlmeSgpLmJ1aWxkKCkubWF0Y2godXJsUkUpO1xuXHRcdHBhcnRzID0ge1xuXHRcdFx0aHJlZjogdXJsWzBdLFxuXHRcdFx0cHJvdG9jb2w6IHVybFsxXSxcblx0XHRcdGhvc3Q6IHVybFszXSB8fCAnJyxcblx0XHRcdGhvc3RuYW1lOiB1cmxbNF0gfHwgJycsXG5cdFx0XHRwb3J0OiB1cmxbNl0sXG5cdFx0XHRwYXRobmFtZTogdXJsWzddIHx8ICcnLFxuXHRcdFx0c2VhcmNoOiB1cmxbOF0gfHwgJycsXG5cdFx0XHRoYXNoOiB1cmxbOV0gfHwgJydcblx0XHR9O1xuXHRcdHBhcnRzLm9yaWdpbiA9IHBhcnRzLnByb3RvY29sICsgJy8vJyArIHBhcnRzLmhvc3Q7XG5cdFx0cGFydHMucG9ydCA9IHBhcnRzLnBvcnQgfHwgKHBhcnRzLnByb3RvY29sID09PSAnaHR0cHM6JyA/ICc0NDMnIDogcGFydHMucHJvdG9jb2wgPT09ICdodHRwOicgPyAnODAnIDogJycpO1xuXHRcdHJldHVybiBwYXJ0cztcblx0fSxcblxuXHQvKipcblx0ICogRXhwYW5kIHRoZSB0ZW1wbGF0ZSByZXBsYWNpbmcgcGF0aCB2YXJpYWJsZXMgd2l0aCBwYXJhbWV0ZXJzXG5cdCAqXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSBwYXJhbXMgdG8gY29tYmluZSB3aXRoIGN1cnJlbnQgcGFyYW1zLiAgTmV3IHBhcmFtcyBvdmVycmlkZSBleGlzdGluZyBwYXJhbXNcblx0ICogQHJldHVybiB7c3RyaW5nfSB0aGUgZXhwYW5kZWQgVVJMXG5cdCAqL1xuXHRidWlsZDogZnVuY3Rpb24gKHBhcmFtcykge1xuXHRcdHJldHVybiBidWlsZFVybCh0aGlzLl90ZW1wbGF0ZSwgbWl4aW4oe30sIHRoaXMuX3BhcmFtcywgcGFyYW1zKSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEBzZWUgYnVpbGRcblx0ICovXG5cdHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuYnVpbGQoKTtcblx0fVxuXG59O1xuXG5vcmlnaW4gPSB0eXBlb2YgbG9jYXRpb24gIT09ICd1bmRlZmluZWQnID8gbmV3IFVybEJ1aWxkZXIobG9jYXRpb24uaHJlZikucGFydHMoKSA6IHZvaWQgMDtcblxubW9kdWxlLmV4cG9ydHMgPSBVcmxCdWlsZGVyO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE0LTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlc3QgPSByZXF1aXJlKCcuL2NsaWVudC9kZWZhdWx0JyksXG4gICAgYnJvd3NlciA9IHJlcXVpcmUoJy4vY2xpZW50L3hocicpO1xuXG5yZXN0LnNldFBsYXRmb3JtRGVmYXVsdENsaWVudChicm93c2VyKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXN0O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE0LTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBBZGQgY29tbW9uIGhlbHBlciBtZXRob2RzIHRvIGEgY2xpZW50IGltcGxcbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBpbXBsIHRoZSBjbGllbnQgaW1wbGVtZW50YXRpb25cbiAqIEBwYXJhbSB7Q2xpZW50fSBbdGFyZ2V0XSB0YXJnZXQgb2YgdGhpcyBjbGllbnQsIHVzZWQgd2hlbiB3cmFwcGluZyBvdGhlciBjbGllbnRzXG4gKiBAcmV0dXJucyB7Q2xpZW50fSB0aGUgY2xpZW50IGltcGwgd2l0aCBhZGRpdGlvbmFsIG1ldGhvZHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjbGllbnQoaW1wbCwgdGFyZ2V0KSB7XG5cblx0aWYgKHRhcmdldCkge1xuXG5cdFx0LyoqXG5cdFx0ICogQHJldHVybnMge0NsaWVudH0gdGhlIHRhcmdldCBjbGllbnRcblx0XHQgKi9cblx0XHRpbXBsLnNraXAgPSBmdW5jdGlvbiBza2lwKCkge1xuXHRcdFx0cmV0dXJuIHRhcmdldDtcblx0XHR9O1xuXG5cdH1cblxuXHQvKipcblx0ICogQWxsb3cgYSBjbGllbnQgdG8gZWFzaWx5IGJlIHdyYXBwZWQgYnkgYW4gaW50ZXJjZXB0b3Jcblx0ICpcblx0ICogQHBhcmFtIHtJbnRlcmNlcHRvcn0gaW50ZXJjZXB0b3IgdGhlIGludGVyY2VwdG9yIHRvIHdyYXAgdGhpcyBjbGllbnQgd2l0aFxuXHQgKiBAcGFyYW0gW2NvbmZpZ10gY29uZmlndXJhdGlvbiBmb3IgdGhlIGludGVyY2VwdG9yXG5cdCAqIEByZXR1cm5zIHtDbGllbnR9IHRoZSBuZXdseSB3cmFwcGVkIGNsaWVudFxuXHQgKi9cblx0aW1wbC53cmFwID0gZnVuY3Rpb24gd3JhcChpbnRlcmNlcHRvciwgY29uZmlnKSB7XG5cdFx0cmV0dXJuIGludGVyY2VwdG9yKGltcGwsIGNvbmZpZyk7XG5cdH07XG5cblx0LyoqXG5cdCAqIEBkZXByZWNhdGVkXG5cdCAqL1xuXHRpbXBsLmNoYWluID0gZnVuY3Rpb24gY2hhaW4oKSB7XG5cdFx0aWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Y29uc29sZS5sb2coJ3Jlc3QuanM6IGNsaWVudC5jaGFpbigpIGlzIGRlcHJlY2F0ZWQsIHVzZSBjbGllbnQud3JhcCgpIGluc3RlYWQnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gaW1wbC53cmFwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0cmV0dXJuIGltcGw7XG5cbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTQtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFBsYWluIEpTIE9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCByZXByZXNlbnQgYW4gSFRUUCByZXF1ZXN0LlxuICpcbiAqIERlcGVuZGluZyBvbiB0aGUgY2FwYWJpbGl0aWVzIG9mIHRoZSB1bmRlcmx5aW5nIGNsaWVudCwgYSByZXF1ZXN0XG4gKiBtYXkgYmUgY2FuY2VsYWJsZS4gSWYgYSByZXF1ZXN0IG1heSBiZSBjYW5jZWxlZCwgdGhlIGNsaWVudCB3aWxsIGFkZFxuICogYSBjYW5jZWxlZCBmbGFnIGFuZCBjYW5jZWwgZnVuY3Rpb24gdG8gdGhlIHJlcXVlc3Qgb2JqZWN0LiBDYW5jZWxpbmdcbiAqIHRoZSByZXF1ZXN0IHdpbGwgcHV0IHRoZSByZXNwb25zZSBpbnRvIGFuIGVycm9yIHN0YXRlLlxuICpcbiAqIEBmaWVsZCB7c3RyaW5nfSBbbWV0aG9kPSdHRVQnXSBIVFRQIG1ldGhvZCwgY29tbW9ubHkgR0VULCBQT1NULCBQVVQsIERFTEVURSBvciBIRUFEXG4gKiBAZmllbGQge3N0cmluZ3xVcmxCdWlsZGVyfSBbcGF0aD0nJ10gcGF0aCB0ZW1wbGF0ZSB3aXRoIG9wdGlvbmFsIHBhdGggdmFyaWFibGVzXG4gKiBAZmllbGQge09iamVjdH0gW3BhcmFtc10gcGFyYW1ldGVycyBmb3IgdGhlIHBhdGggdGVtcGxhdGUgYW5kIHF1ZXJ5IHN0cmluZ1xuICogQGZpZWxkIHtPYmplY3R9IFtoZWFkZXJzXSBjdXN0b20gSFRUUCBoZWFkZXJzIHRvIHNlbmQsIGluIGFkZGl0aW9uIHRvIHRoZSBjbGllbnRzIGRlZmF1bHQgaGVhZGVyc1xuICogQGZpZWxkIFtlbnRpdHldIHRoZSBIVFRQIGVudGl0eSwgY29tbW9uIGZvciBQT1NUIG9yIFBVVCByZXF1ZXN0c1xuICogQGZpZWxkIHtib29sZWFufSBbY2FuY2VsZWRdIHRydWUgaWYgdGhlIHJlcXVlc3QgaGFzIGJlZW4gY2FuY2VsZWQsIHNldCBieSB0aGUgY2xpZW50XG4gKiBAZmllbGQge0Z1bmN0aW9ufSBbY2FuY2VsXSBjYW5jZWxzIHRoZSByZXF1ZXN0IGlmIGludm9rZWQsIHByb3ZpZGVkIGJ5IHRoZSBjbGllbnRcbiAqIEBmaWVsZCB7Q2xpZW50fSBbb3JpZ2luYXRvcl0gdGhlIGNsaWVudCB0aGF0IGZpcnN0IGhhbmRsZWQgdGhpcyByZXF1ZXN0LCBwcm92aWRlZCBieSB0aGUgaW50ZXJjZXB0b3JcbiAqXG4gKiBAY2xhc3MgUmVxdWVzdFxuICovXG5cbi8qKlxuICogUGxhaW4gSlMgT2JqZWN0IGNvbnRhaW5pbmcgcHJvcGVydGllcyB0aGF0IHJlcHJlc2VudCBhbiBIVFRQIHJlc3BvbnNlXG4gKlxuICogQGZpZWxkIHtPYmplY3R9IFtyZXF1ZXN0XSB0aGUgcmVxdWVzdCBvYmplY3QgYXMgcmVjZWl2ZWQgYnkgdGhlIHJvb3QgY2xpZW50XG4gKiBAZmllbGQge09iamVjdH0gW3Jhd10gdGhlIHVuZGVybHlpbmcgcmVxdWVzdCBvYmplY3QsIGxpa2UgWG1sSHR0cFJlcXVlc3QgaW4gYSBicm93c2VyXG4gKiBAZmllbGQge251bWJlcn0gW3N0YXR1cy5jb2RlXSBzdGF0dXMgY29kZSBvZiB0aGUgcmVzcG9uc2UgKGkuZS4gMjAwLCA0MDQpXG4gKiBAZmllbGQge3N0cmluZ30gW3N0YXR1cy50ZXh0XSBzdGF0dXMgcGhyYXNlIG9mIHRoZSByZXNwb25zZVxuICogQGZpZWxkIHtPYmplY3RdIFtoZWFkZXJzXSByZXNwb25zZSBoZWFkZXJzIGhhc2ggb2Ygbm9ybWFsaXplZCBuYW1lLCB2YWx1ZSBwYWlyc1xuICogQGZpZWxkIFtlbnRpdHldIHRoZSByZXNwb25zZSBib2R5XG4gKlxuICogQGNsYXNzIFJlc3BvbnNlXG4gKi9cblxuLyoqXG4gKiBIVFRQIGNsaWVudCBwYXJ0aWN1bGFybHkgc3VpdGVkIGZvciBSRVNUZnVsIG9wZXJhdGlvbnMuXG4gKlxuICogQGZpZWxkIHtmdW5jdGlvbn0gd3JhcCB3cmFwcyB0aGlzIGNsaWVudCB3aXRoIGEgbmV3IGludGVyY2VwdG9yIHJldHVybmluZyB0aGUgd3JhcHBlZCBjbGllbnRcbiAqXG4gKiBAcGFyYW0ge1JlcXVlc3R9IHRoZSBIVFRQIHJlcXVlc3RcbiAqIEByZXR1cm5zIHtSZXNwb25zZVByb21pc2U8UmVzcG9uc2U+fSBhIHByb21pc2UgdGhlIHJlc29sdmVzIHRvIHRoZSBIVFRQIHJlc3BvbnNlXG4gKlxuICogQGNsYXNzIENsaWVudFxuICovXG5cbiAvKipcbiAgKiBFeHRlbmRlZCB3aGVuLmpzIFByb21pc2VzL0ErIHByb21pc2Ugd2l0aCBIVFRQIHNwZWNpZmljIGhlbHBlcnNcbiAgKnFcbiAgKiBAbWV0aG9kIGVudGl0eSBwcm9taXNlIGZvciB0aGUgSFRUUCBlbnRpdHlcbiAgKiBAbWV0aG9kIHN0YXR1cyBwcm9taXNlIGZvciB0aGUgSFRUUCBzdGF0dXMgY29kZVxuICAqIEBtZXRob2QgaGVhZGVycyBwcm9taXNlIGZvciB0aGUgSFRUUCByZXNwb25zZSBoZWFkZXJzXG4gICogQG1ldGhvZCBoZWFkZXIgcHJvbWlzZSBmb3IgYSBzcGVjaWZpYyBIVFRQIHJlc3BvbnNlIGhlYWRlclxuICAqXG4gICogQGNsYXNzIFJlc3BvbnNlUHJvbWlzZVxuICAqIEBleHRlbmRzIFByb21pc2VcbiAgKi9cblxudmFyIGNsaWVudCwgdGFyZ2V0LCBwbGF0Zm9ybURlZmF1bHQ7XG5cbmNsaWVudCA9IHJlcXVpcmUoJy4uL2NsaWVudCcpO1xuXG5pZiAodHlwZW9mIFByb21pc2UgIT09ICdmdW5jdGlvbicgJiYgY29uc29sZSAmJiBjb25zb2xlLmxvZykge1xuXHRjb25zb2xlLmxvZygnQW4gRVM2IFByb21pc2UgaW1wbGVtZW50YXRpb24gaXMgcmVxdWlyZWQgdG8gdXNlIHJlc3QuanMuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vYmxvYi9tYXN0ZXIvZG9jcy9lczYtcHJvbWlzZS1zaGltLm1kIGZvciB1c2luZyB3aGVuLmpzIGFzIGEgUHJvbWlzZSBwb2x5ZmlsbC4nKTtcbn1cblxuLyoqXG4gKiBNYWtlIGEgcmVxdWVzdCB3aXRoIHRoZSBkZWZhdWx0IGNsaWVudFxuICogQHBhcmFtIHtSZXF1ZXN0fSB0aGUgSFRUUCByZXF1ZXN0XG4gKiBAcmV0dXJucyB7UHJvbWlzZTxSZXNwb25zZT59IGEgcHJvbWlzZSB0aGUgcmVzb2x2ZXMgdG8gdGhlIEhUVFAgcmVzcG9uc2VcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdENsaWVudCgpIHtcblx0cmV0dXJuIHRhcmdldC5hcHBseSh2b2lkIDAsIGFyZ3VtZW50cyk7XG59XG5cbi8qKlxuICogQ2hhbmdlIHRoZSBkZWZhdWx0IGNsaWVudFxuICogQHBhcmFtIHtDbGllbnR9IGNsaWVudCB0aGUgbmV3IGRlZmF1bHQgY2xpZW50XG4gKi9cbmRlZmF1bHRDbGllbnQuc2V0RGVmYXVsdENsaWVudCA9IGZ1bmN0aW9uIHNldERlZmF1bHRDbGllbnQoY2xpZW50KSB7XG5cdHRhcmdldCA9IGNsaWVudDtcbn07XG5cbi8qKlxuICogT2J0YWluIGEgZGlyZWN0IHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBkZWZhdWx0IGNsaWVudFxuICogQHJldHVybnMge0NsaWVudH0gdGhlIGRlZmF1bHQgY2xpZW50XG4gKi9cbmRlZmF1bHRDbGllbnQuZ2V0RGVmYXVsdENsaWVudCA9IGZ1bmN0aW9uIGdldERlZmF1bHRDbGllbnQoKSB7XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4vKipcbiAqIFJlc2V0IHRoZSBkZWZhdWx0IGNsaWVudCB0byB0aGUgcGxhdGZvcm0gZGVmYXVsdFxuICovXG5kZWZhdWx0Q2xpZW50LnJlc2V0RGVmYXVsdENsaWVudCA9IGZ1bmN0aW9uIHJlc2V0RGVmYXVsdENsaWVudCgpIHtcblx0dGFyZ2V0ID0gcGxhdGZvcm1EZWZhdWx0O1xufTtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5kZWZhdWx0Q2xpZW50LnNldFBsYXRmb3JtRGVmYXVsdENsaWVudCA9IGZ1bmN0aW9uIHNldFBsYXRmb3JtRGVmYXVsdENsaWVudChjbGllbnQpIHtcblx0aWYgKHBsYXRmb3JtRGVmYXVsdCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHJlZGVmaW5lIHBsYXRmb3JtRGVmYXVsdENsaWVudCcpO1xuXHR9XG5cdHRhcmdldCA9IHBsYXRmb3JtRGVmYXVsdCA9IGNsaWVudDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2xpZW50KGRlZmF1bHRDbGllbnQpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIG5vcm1hbGl6ZUhlYWRlck5hbWUsIHJlc3BvbnNlUHJvbWlzZSwgY2xpZW50LCBoZWFkZXJTcGxpdFJFO1xuXG5ub3JtYWxpemVIZWFkZXJOYW1lID0gcmVxdWlyZSgnLi4vdXRpbC9ub3JtYWxpemVIZWFkZXJOYW1lJyk7XG5yZXNwb25zZVByb21pc2UgPSByZXF1aXJlKCcuLi91dGlsL3Jlc3BvbnNlUHJvbWlzZScpO1xuY2xpZW50ID0gcmVxdWlyZSgnLi4vY2xpZW50Jyk7XG5cbi8vIGFjY29yZGluZyB0byB0aGUgc3BlYywgdGhlIGxpbmUgYnJlYWsgaXMgJ1xcclxcbicsIGJ1dCBkb2Vzbid0IGhvbGQgdHJ1ZSBpbiBwcmFjdGljZVxuaGVhZGVyU3BsaXRSRSA9IC9bXFxyfFxcbl0rLztcblxuZnVuY3Rpb24gcGFyc2VIZWFkZXJzKHJhdykge1xuXHQvLyBOb3RlOiBTZXQtQ29va2llIHdpbGwgYmUgcmVtb3ZlZCBieSB0aGUgYnJvd3NlclxuXHR2YXIgaGVhZGVycyA9IHt9O1xuXG5cdGlmICghcmF3KSB7IHJldHVybiBoZWFkZXJzOyB9XG5cblx0cmF3LnRyaW0oKS5zcGxpdChoZWFkZXJTcGxpdFJFKS5mb3JFYWNoKGZ1bmN0aW9uIChoZWFkZXIpIHtcblx0XHR2YXIgYm91bmRhcnksIG5hbWUsIHZhbHVlO1xuXHRcdGJvdW5kYXJ5ID0gaGVhZGVyLmluZGV4T2YoJzonKTtcblx0XHRuYW1lID0gbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXIuc3Vic3RyaW5nKDAsIGJvdW5kYXJ5KS50cmltKCkpO1xuXHRcdHZhbHVlID0gaGVhZGVyLnN1YnN0cmluZyhib3VuZGFyeSArIDEpLnRyaW0oKTtcblx0XHRpZiAoaGVhZGVyc1tuYW1lXSkge1xuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoaGVhZGVyc1tuYW1lXSkpIHtcblx0XHRcdFx0Ly8gYWRkIHRvIGFuIGV4aXN0aW5nIGFycmF5XG5cdFx0XHRcdGhlYWRlcnNbbmFtZV0ucHVzaCh2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Ly8gY29udmVydCBzaW5nbGUgdmFsdWUgdG8gYXJyYXlcblx0XHRcdFx0aGVhZGVyc1tuYW1lXSA9IFtoZWFkZXJzW25hbWVdLCB2YWx1ZV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0Ly8gbmV3LCBzaW5nbGUgdmFsdWVcblx0XHRcdGhlYWRlcnNbbmFtZV0gPSB2YWx1ZTtcblx0XHR9XG5cdH0pO1xuXG5cdHJldHVybiBoZWFkZXJzO1xufVxuXG5mdW5jdGlvbiBzYWZlTWl4aW4odGFyZ2V0LCBzb3VyY2UpIHtcblx0T2JqZWN0LmtleXMoc291cmNlIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0Ly8gbWFrZSBzdXJlIHRoZSBwcm9wZXJ0eSBhbHJlYWR5IGV4aXN0cyBhc1xuXHRcdC8vIElFIDYgd2lsbCBibG93IHVwIGlmIHdlIGFkZCBhIG5ldyBwcm9wXG5cdFx0aWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShwcm9wKSAmJiBwcm9wIGluIHRhcmdldCkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0Ly8gaWdub3JlLCBleHBlY3RlZCBmb3Igc29tZSBwcm9wZXJ0aWVzIGF0IHNvbWUgcG9pbnRzIGluIHRoZSByZXF1ZXN0IGxpZmVjeWNsZVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0cmV0dXJuIHRhcmdldDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjbGllbnQoZnVuY3Rpb24geGhyKHJlcXVlc3QpIHtcblx0cmV0dXJuIHJlc3BvbnNlUHJvbWlzZS5wcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHQvKmpzaGludCBtYXhjb21wbGV4aXR5OjIwICovXG5cblx0XHR2YXIgY2xpZW50LCBtZXRob2QsIHVybCwgaGVhZGVycywgZW50aXR5LCBoZWFkZXJOYW1lLCByZXNwb25zZSwgWEhSO1xuXG5cdFx0cmVxdWVzdCA9IHR5cGVvZiByZXF1ZXN0ID09PSAnc3RyaW5nJyA/IHsgcGF0aDogcmVxdWVzdCB9IDogcmVxdWVzdCB8fCB7fTtcblx0XHRyZXNwb25zZSA9IHsgcmVxdWVzdDogcmVxdWVzdCB9O1xuXG5cdFx0aWYgKHJlcXVlc3QuY2FuY2VsZWQpIHtcblx0XHRcdHJlc3BvbnNlLmVycm9yID0gJ3ByZWNhbmNlbGVkJztcblx0XHRcdHJlamVjdChyZXNwb25zZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0WEhSID0gcmVxdWVzdC5lbmdpbmUgfHwgWE1MSHR0cFJlcXVlc3Q7XG5cdFx0aWYgKCFYSFIpIHtcblx0XHRcdHJlamVjdCh7IHJlcXVlc3Q6IHJlcXVlc3QsIGVycm9yOiAneGhyLW5vdC1hdmFpbGFibGUnIH0pO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGVudGl0eSA9IHJlcXVlc3QuZW50aXR5O1xuXHRcdHJlcXVlc3QubWV0aG9kID0gcmVxdWVzdC5tZXRob2QgfHwgKGVudGl0eSA/ICdQT1NUJyA6ICdHRVQnKTtcblx0XHRtZXRob2QgPSByZXF1ZXN0Lm1ldGhvZDtcblx0XHR1cmwgPSByZXNwb25zZS51cmwgPSByZXF1ZXN0LnBhdGggfHwgJyc7XG5cblx0XHR0cnkge1xuXHRcdFx0Y2xpZW50ID0gcmVzcG9uc2UucmF3ID0gbmV3IFhIUigpO1xuXG5cdFx0XHQvLyBtaXhpbiBleHRyYSByZXF1ZXN0IHByb3BlcnRpZXMgYmVmb3JlIGFuZCBhZnRlciBvcGVuaW5nIHRoZSByZXF1ZXN0IGFzIHNvbWUgcHJvcGVydGllcyByZXF1aXJlIGJlaW5nIHNldCBhdCBkaWZmZXJlbnQgcGhhc2VzIG9mIHRoZSByZXF1ZXN0XG5cdFx0XHRzYWZlTWl4aW4oY2xpZW50LCByZXF1ZXN0Lm1peGluKTtcblx0XHRcdGNsaWVudC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcblx0XHRcdHNhZmVNaXhpbihjbGllbnQsIHJlcXVlc3QubWl4aW4pO1xuXG5cdFx0XHRoZWFkZXJzID0gcmVxdWVzdC5oZWFkZXJzO1xuXHRcdFx0Zm9yIChoZWFkZXJOYW1lIGluIGhlYWRlcnMpIHtcblx0XHRcdFx0Lypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cblx0XHRcdFx0aWYgKGhlYWRlck5hbWUgPT09ICdDb250ZW50LVR5cGUnICYmIGhlYWRlcnNbaGVhZGVyTmFtZV0gPT09ICdtdWx0aXBhcnQvZm9ybS1kYXRhJykge1xuXHRcdFx0XHRcdC8vIFhNTEh0dHBSZXF1ZXN0IGdlbmVyYXRlcyBpdHMgb3duIENvbnRlbnQtVHlwZSBoZWFkZXIgd2l0aCB0aGVcblx0XHRcdFx0XHQvLyBhcHByb3ByaWF0ZSBtdWx0aXBhcnQgYm91bmRhcnkgd2hlbiBzZW5kaW5nIG11bHRpcGFydC9mb3JtLWRhdGEuXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjbGllbnQuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXJOYW1lLCBoZWFkZXJzW2hlYWRlck5hbWVdKTtcblx0XHRcdH1cblxuXHRcdFx0cmVxdWVzdC5jYW5jZWxlZCA9IGZhbHNlO1xuXHRcdFx0cmVxdWVzdC5jYW5jZWwgPSBmdW5jdGlvbiBjYW5jZWwoKSB7XG5cdFx0XHRcdHJlcXVlc3QuY2FuY2VsZWQgPSB0cnVlO1xuXHRcdFx0XHRjbGllbnQuYWJvcnQoKTtcblx0XHRcdFx0cmVqZWN0KHJlc3BvbnNlKTtcblx0XHRcdH07XG5cblx0XHRcdGNsaWVudC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoLyogZSAqLykge1xuXHRcdFx0XHRpZiAocmVxdWVzdC5jYW5jZWxlZCkgeyByZXR1cm47IH1cblx0XHRcdFx0aWYgKGNsaWVudC5yZWFkeVN0YXRlID09PSAoWEhSLkRPTkUgfHwgNCkpIHtcblx0XHRcdFx0XHRyZXNwb25zZS5zdGF0dXMgPSB7XG5cdFx0XHRcdFx0XHRjb2RlOiBjbGllbnQuc3RhdHVzLFxuXHRcdFx0XHRcdFx0dGV4dDogY2xpZW50LnN0YXR1c1RleHRcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdHJlc3BvbnNlLmhlYWRlcnMgPSBwYXJzZUhlYWRlcnMoY2xpZW50LmdldEFsbFJlc3BvbnNlSGVhZGVycygpKTtcblx0XHRcdFx0XHRyZXNwb25zZS5lbnRpdHkgPSBjbGllbnQucmVzcG9uc2VUZXh0O1xuXG5cdFx0XHRcdFx0Ly8gIzEyNSAtLSBTb21ldGltZXMgSUU4LTkgdXNlcyAxMjIzIGluc3RlYWQgb2YgMjA0XG5cdFx0XHRcdFx0Ly8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG5cdFx0XHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1cy5jb2RlID09PSAxMjIzKSB7XG5cdFx0XHRcdFx0XHRyZXNwb25zZS5zdGF0dXMuY29kZSA9IDIwNDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzLmNvZGUgPiAwKSB7XG5cdFx0XHRcdFx0XHQvLyBjaGVjayBzdGF0dXMgY29kZSBhcyByZWFkeXN0YXRlY2hhbmdlIGZpcmVzIGJlZm9yZSBlcnJvciBldmVudFxuXHRcdFx0XHRcdFx0cmVzb2x2ZShyZXNwb25zZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gZ2l2ZSB0aGUgZXJyb3IgY2FsbGJhY2sgYSBjaGFuY2UgdG8gZmlyZSBiZWZvcmUgcmVzb2x2aW5nXG5cdFx0XHRcdFx0XHQvLyByZXF1ZXN0cyBmb3IgZmlsZTovLyBVUkxzIGRvIG5vdCBoYXZlIGEgc3RhdHVzIGNvZGVcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRyZXNvbHZlKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdH0sIDApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y2xpZW50Lm9uZXJyb3IgPSBmdW5jdGlvbiAoLyogZSAqLykge1xuXHRcdFx0XHRcdHJlc3BvbnNlLmVycm9yID0gJ2xvYWRlcnJvcic7XG5cdFx0XHRcdFx0cmVqZWN0KHJlc3BvbnNlKTtcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdC8vIElFIDYgd2lsbCBub3Qgc3VwcG9ydCBlcnJvciBoYW5kbGluZ1xuXHRcdFx0fVxuXG5cdFx0XHRjbGllbnQuc2VuZChlbnRpdHkpO1xuXHRcdH1cblx0XHRjYXRjaCAoZSkge1xuXHRcdFx0cmVzcG9uc2UuZXJyb3IgPSAnbG9hZGVycm9yJztcblx0XHRcdHJlamVjdChyZXNwb25zZSk7XG5cdFx0fVxuXG5cdH0pO1xufSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdENsaWVudCwgbWl4aW4sIHJlc3BvbnNlUHJvbWlzZSwgY2xpZW50O1xuXG5kZWZhdWx0Q2xpZW50ID0gcmVxdWlyZSgnLi9jbGllbnQvZGVmYXVsdCcpO1xubWl4aW4gPSByZXF1aXJlKCcuL3V0aWwvbWl4aW4nKTtcbnJlc3BvbnNlUHJvbWlzZSA9IHJlcXVpcmUoJy4vdXRpbC9yZXNwb25zZVByb21pc2UnKTtcbmNsaWVudCA9IHJlcXVpcmUoJy4vY2xpZW50Jyk7XG5cbi8qKlxuICogSW50ZXJjZXB0b3JzIGhhdmUgdGhlIGFiaWxpdHkgdG8gaW50ZXJjZXB0IHRoZSByZXF1ZXN0IGFuZC9vcmcgcmVzcG9uc2VcbiAqIG9iamVjdHMuICBUaGV5IG1heSBhdWdtZW50LCBwcnVuZSwgdHJhbnNmb3JtIG9yIHJlcGxhY2UgdGhlXG4gKiByZXF1ZXN0L3Jlc3BvbnNlIGFzIG5lZWRlZC4gIENsaWVudHMgbWF5IGJlIGNvbXBvc2VkIGJ5IHdyYXBwaW5nXG4gKiB0b2dldGhlciBtdWx0aXBsZSBpbnRlcmNlcHRvcnMuXG4gKlxuICogQ29uZmlndXJlZCBpbnRlcmNlcHRvcnMgYXJlIGZ1bmN0aW9uYWwgaW4gbmF0dXJlLiAgV3JhcHBpbmcgYSBjbGllbnQgaW5cbiAqIGFuIGludGVyY2VwdG9yIHdpbGwgbm90IGFmZmVjdCB0aGUgY2xpZW50LCBtZXJlbHkgdGhlIGRhdGEgdGhhdCBmbG93cyBpblxuICogYW5kIG91dCBvZiB0aGF0IGNsaWVudC4gIEEgY29tbW9uIGNvbmZpZ3VyYXRpb24gY2FuIGJlIGNyZWF0ZWQgb25jZSBhbmRcbiAqIHNoYXJlZDsgc3BlY2lhbGl6YXRpb24gY2FuIGJlIGNyZWF0ZWQgYnkgZnVydGhlciB3cmFwcGluZyB0aGF0IGNsaWVudFxuICogd2l0aCBjdXN0b20gaW50ZXJjZXB0b3JzLlxuICpcbiAqIEBwYXJhbSB7Q2xpZW50fSBbdGFyZ2V0XSBjbGllbnQgdG8gd3JhcFxuICogQHBhcmFtIHtPYmplY3R9IFtjb25maWddIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBpbnRlcmNlcHRvciwgcHJvcGVydGllcyB3aWxsIGJlIHNwZWNpZmljIHRvIHRoZSBpbnRlcmNlcHRvciBpbXBsZW1lbnRhdGlvblxuICogQHJldHVybnMge0NsaWVudH0gQSBjbGllbnQgd3JhcHBlZCB3aXRoIHRoZSBpbnRlcmNlcHRvclxuICpcbiAqIEBjbGFzcyBJbnRlcmNlcHRvclxuICovXG5cbmZ1bmN0aW9uIGRlZmF1bHRJbml0SGFuZGxlcihjb25maWcpIHtcblx0cmV0dXJuIGNvbmZpZztcbn1cblxuZnVuY3Rpb24gZGVmYXVsdFJlcXVlc3RIYW5kbGVyKHJlcXVlc3QgLyosIGNvbmZpZywgbWV0YSAqLykge1xuXHRyZXR1cm4gcmVxdWVzdDtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSAvKiwgY29uZmlnLCBtZXRhICovKSB7XG5cdHJldHVybiByZXNwb25zZTtcbn1cblxuLyoqXG4gKiBBbHRlcm5hdGUgcmV0dXJuIHR5cGUgZm9yIHRoZSByZXF1ZXN0IGhhbmRsZXIgdGhhdCBhbGxvd3MgZm9yIG1vcmUgY29tcGxleCBpbnRlcmFjdGlvbnMuXG4gKlxuICogQHBhcmFtIHByb3BlcnRpZXMucmVxdWVzdCB0aGUgdHJhZGl0aW9uYWwgcmVxdWVzdCByZXR1cm4gb2JqZWN0XG4gKiBAcGFyYW0ge1Byb21pc2V9IFtwcm9wZXJ0aWVzLmFib3J0XSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgaWYvd2hlbiB0aGUgcmVxdWVzdCBpcyBhYm9ydGVkXG4gKiBAcGFyYW0ge0NsaWVudH0gW3Byb3BlcnRpZXMuY2xpZW50XSBvdmVycmlkZSB0aGUgZGVmaW5lZCBjbGllbnQgd2l0aCBhbiBhbHRlcm5hdGUgY2xpZW50XG4gKiBAcGFyYW0gW3Byb3BlcnRpZXMucmVzcG9uc2VdIHJlc3BvbnNlIGZvciB0aGUgcmVxdWVzdCwgc2hvcnQgY2lyY3VpdCB0aGUgcmVxdWVzdFxuICovXG5mdW5jdGlvbiBDb21wbGV4UmVxdWVzdChwcm9wZXJ0aWVzKSB7XG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb21wbGV4UmVxdWVzdCkpIHtcblx0XHQvLyBpbiBjYXNlIHVzZXJzIGZvcmdldCB0aGUgJ25ldycgZG9uJ3QgbWl4IGludG8gdGhlIGludGVyY2VwdG9yXG5cdFx0cmV0dXJuIG5ldyBDb21wbGV4UmVxdWVzdChwcm9wZXJ0aWVzKTtcblx0fVxuXHRtaXhpbih0aGlzLCBwcm9wZXJ0aWVzKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW50ZXJjZXB0b3IgZm9yIHRoZSBwcm92aWRlZCBoYW5kbGVycy5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaGFuZGxlcnMuaW5pdF0gb25lIHRpbWUgaW50aWFsaXphdGlvbiwgbXVzdCByZXR1cm4gdGhlIGNvbmZpZyBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtoYW5kbGVycy5yZXF1ZXN0XSByZXF1ZXN0IGhhbmRsZXJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtoYW5kbGVycy5yZXNwb25zZV0gcmVzcG9uc2UgaGFuZGxlciByZWdhcmRsZXNzIG9mIGVycm9yIHN0YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaGFuZGxlcnMuc3VjY2Vzc10gcmVzcG9uc2UgaGFuZGxlciB3aGVuIHRoZSByZXF1ZXN0IGlzIG5vdCBpbiBlcnJvclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2hhbmRsZXJzLmVycm9yXSByZXNwb25zZSBoYW5kbGVyIHdoZW4gdGhlIHJlcXVlc3QgaXMgaW4gZXJyb3IsIG1heSBiZSB1c2VkIHRvICd1bnJlamVjdCcgYW4gZXJyb3Igc3RhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtoYW5kbGVycy5jbGllbnRdIHRoZSBjbGllbnQgdG8gdXNlIGlmIG90aGVyd2lzZSBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byBwbGF0Zm9ybSBkZWZhdWx0IGNsaWVudFxuICpcbiAqIEByZXR1cm5zIHtJbnRlcmNlcHRvcn1cbiAqL1xuZnVuY3Rpb24gaW50ZXJjZXB0b3IoaGFuZGxlcnMpIHtcblxuXHR2YXIgaW5pdEhhbmRsZXIsIHJlcXVlc3RIYW5kbGVyLCBzdWNjZXNzUmVzcG9uc2VIYW5kbGVyLCBlcnJvclJlc3BvbnNlSGFuZGxlcjtcblxuXHRoYW5kbGVycyA9IGhhbmRsZXJzIHx8IHt9O1xuXG5cdGluaXRIYW5kbGVyICAgICAgICAgICAgPSBoYW5kbGVycy5pbml0ICAgIHx8IGRlZmF1bHRJbml0SGFuZGxlcjtcblx0cmVxdWVzdEhhbmRsZXIgICAgICAgICA9IGhhbmRsZXJzLnJlcXVlc3QgfHwgZGVmYXVsdFJlcXVlc3RIYW5kbGVyO1xuXHRzdWNjZXNzUmVzcG9uc2VIYW5kbGVyID0gaGFuZGxlcnMuc3VjY2VzcyB8fCBoYW5kbGVycy5yZXNwb25zZSB8fCBkZWZhdWx0UmVzcG9uc2VIYW5kbGVyO1xuXHRlcnJvclJlc3BvbnNlSGFuZGxlciAgID0gaGFuZGxlcnMuZXJyb3IgICB8fCBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gUHJvcGFnYXRlIHRoZSByZWplY3Rpb24sIHdpdGggdGhlIHJlc3VsdCBvZiB0aGUgaGFuZGxlclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKGhhbmRsZXJzLnJlc3BvbnNlIHx8IGRlZmF1bHRSZXNwb25zZUhhbmRsZXIpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpXG5cdFx0XHQudGhlbihQcm9taXNlLnJlamVjdC5iaW5kKFByb21pc2UpKTtcblx0fTtcblxuXHRyZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgY29uZmlnKSB7XG5cblx0XHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdGNvbmZpZyA9IHRhcmdldDtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB0YXJnZXQgIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHRhcmdldCA9IGhhbmRsZXJzLmNsaWVudCB8fCBkZWZhdWx0Q2xpZW50O1xuXHRcdH1cblxuXHRcdGNvbmZpZyA9IGluaXRIYW5kbGVyKGNvbmZpZyB8fCB7fSk7XG5cblx0XHRmdW5jdGlvbiBpbnRlcmNlcHRlZENsaWVudChyZXF1ZXN0KSB7XG5cdFx0XHR2YXIgY29udGV4dCwgbWV0YTtcblx0XHRcdGNvbnRleHQgPSB7fTtcblx0XHRcdG1ldGEgPSB7ICdhcmd1bWVudHMnOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLCBjbGllbnQ6IGludGVyY2VwdGVkQ2xpZW50IH07XG5cdFx0XHRyZXF1ZXN0ID0gdHlwZW9mIHJlcXVlc3QgPT09ICdzdHJpbmcnID8geyBwYXRoOiByZXF1ZXN0IH0gOiByZXF1ZXN0IHx8IHt9O1xuXHRcdFx0cmVxdWVzdC5vcmlnaW5hdG9yID0gcmVxdWVzdC5vcmlnaW5hdG9yIHx8IGludGVyY2VwdGVkQ2xpZW50O1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlUHJvbWlzZShcblx0XHRcdFx0cmVxdWVzdEhhbmRsZXIuY2FsbChjb250ZXh0LCByZXF1ZXN0LCBjb25maWcsIG1ldGEpLFxuXHRcdFx0XHRmdW5jdGlvbiAocmVxdWVzdCkge1xuXHRcdFx0XHRcdHZhciByZXNwb25zZSwgYWJvcnQsIG5leHQ7XG5cdFx0XHRcdFx0bmV4dCA9IHRhcmdldDtcblx0XHRcdFx0XHRpZiAocmVxdWVzdCBpbnN0YW5jZW9mIENvbXBsZXhSZXF1ZXN0KSB7XG5cdFx0XHRcdFx0XHQvLyB1bnBhY2sgcmVxdWVzdFxuXHRcdFx0XHRcdFx0YWJvcnQgPSByZXF1ZXN0LmFib3J0O1xuXHRcdFx0XHRcdFx0bmV4dCA9IHJlcXVlc3QuY2xpZW50IHx8IG5leHQ7XG5cdFx0XHRcdFx0XHRyZXNwb25zZSA9IHJlcXVlc3QucmVzcG9uc2U7XG5cdFx0XHRcdFx0XHQvLyBub3JtYWxpemUgcmVxdWVzdCwgbXVzdCBiZSBsYXN0XG5cdFx0XHRcdFx0XHRyZXF1ZXN0ID0gcmVxdWVzdC5yZXF1ZXN0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXNwb25zZSA9IHJlc3BvbnNlIHx8IFByb21pc2UucmVzb2x2ZShyZXF1ZXN0KS50aGVuKGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5leHQocmVxdWVzdCkpLnRoZW4oXG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uIChyZXNwb25zZSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBzdWNjZXNzUmVzcG9uc2VIYW5kbGVyLmNhbGwoY29udGV4dCwgcmVzcG9uc2UsIGNvbmZpZywgbWV0YSk7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uIChyZXNwb25zZSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBlcnJvclJlc3BvbnNlSGFuZGxlci5jYWxsKGNvbnRleHQsIHJlc3BvbnNlLCBjb25maWcsIG1ldGEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHJldHVybiBhYm9ydCA/IFByb21pc2UucmFjZShbcmVzcG9uc2UsIGFib3J0XSkgOiByZXNwb25zZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZnVuY3Rpb24gKGVycm9yKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KHsgcmVxdWVzdDogcmVxdWVzdCwgZXJyb3I6IGVycm9yIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiBjbGllbnQoaW50ZXJjZXB0ZWRDbGllbnQsIHRhcmdldCk7XG5cdH07XG59XG5cbmludGVyY2VwdG9yLkNvbXBsZXhSZXF1ZXN0ID0gQ29tcGxleFJlcXVlc3Q7XG5cbm1vZHVsZS5leHBvcnRzID0gaW50ZXJjZXB0b3I7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW50ZXJjZXB0b3IsIG1peGluVXRpbCwgZGVmYXVsdGVyO1xuXG5pbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uL2ludGVyY2VwdG9yJyk7XG5taXhpblV0aWwgPSByZXF1aXJlKCcuLi91dGlsL21peGluJyk7XG5cbmRlZmF1bHRlciA9IChmdW5jdGlvbiAoKSB7XG5cblx0ZnVuY3Rpb24gbWl4aW4ocHJvcCwgdGFyZ2V0LCBkZWZhdWx0cykge1xuXHRcdGlmIChwcm9wIGluIHRhcmdldCB8fCBwcm9wIGluIGRlZmF1bHRzKSB7XG5cdFx0XHR0YXJnZXRbcHJvcF0gPSBtaXhpblV0aWwoe30sIGRlZmF1bHRzW3Byb3BdLCB0YXJnZXRbcHJvcF0pO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNvcHkocHJvcCwgdGFyZ2V0LCBkZWZhdWx0cykge1xuXHRcdGlmIChwcm9wIGluIGRlZmF1bHRzICYmICEocHJvcCBpbiB0YXJnZXQpKSB7XG5cdFx0XHR0YXJnZXRbcHJvcF0gPSBkZWZhdWx0c1twcm9wXTtcblx0XHR9XG5cdH1cblxuXHR2YXIgbWFwcGluZ3MgPSB7XG5cdFx0bWV0aG9kOiBjb3B5LFxuXHRcdHBhdGg6IGNvcHksXG5cdFx0cGFyYW1zOiBtaXhpbixcblx0XHRoZWFkZXJzOiBtaXhpbixcblx0XHRlbnRpdHk6IGNvcHksXG5cdFx0bWl4aW46IG1peGluXG5cdH07XG5cblx0cmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGRlZmF1bHRzKSB7XG5cdFx0Zm9yICh2YXIgcHJvcCBpbiBtYXBwaW5ncykge1xuXHRcdFx0Lypqc2hpbnQgZm9yaW46IGZhbHNlICovXG5cdFx0XHRtYXBwaW5nc1twcm9wXShwcm9wLCB0YXJnZXQsIGRlZmF1bHRzKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRhcmdldDtcblx0fTtcblxufSgpKTtcblxuLyoqXG4gKiBQcm92aWRlIGRlZmF1bHQgdmFsdWVzIGZvciBhIHJlcXVlc3QuIFRoZXNlIHZhbHVlcyB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlXG4gKiByZXF1ZXN0IGlmIHRoZSByZXF1ZXN0IG9iamVjdCBkb2VzIG5vdCBhbHJlYWR5IGNvbnRhaW4gYW4gZXhwbGljaXQgdmFsdWUuXG4gKlxuICogRm9yICdwYXJhbXMnLCAnaGVhZGVycycsIGFuZCAnbWl4aW4nLCBpbmRpdmlkdWFsIHZhbHVlcyBhcmUgbWl4ZWQgaW4gd2l0aCB0aGVcbiAqIHJlcXVlc3QncyB2YWx1ZXMuIFRoZSByZXN1bHQgaXMgYSBuZXcgb2JqZWN0IHJlcHJlc2VudGlpbmcgdGhlIGNvbWJpbmVkXG4gKiByZXF1ZXN0IGFuZCBjb25maWcgdmFsdWVzLiBOZWl0aGVyIGlucHV0IG9iamVjdCBpcyBtdXRhdGVkLlxuICpcbiAqIEBwYXJhbSB7Q2xpZW50fSBbY2xpZW50XSBjbGllbnQgdG8gd3JhcFxuICogQHBhcmFtIHtzdHJpbmd9IFtjb25maWcubWV0aG9kXSB0aGUgZGVmYXVsdCBtZXRob2RcbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29uZmlnLnBhdGhdIHRoZSBkZWZhdWx0IHBhdGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLnBhcmFtc10gdGhlIGRlZmF1bHQgcGFyYW1zLCBtaXhlZCB3aXRoIHRoZSByZXF1ZXN0J3MgZXhpc3RpbmcgcGFyYW1zXG4gKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5oZWFkZXJzXSB0aGUgZGVmYXVsdCBoZWFkZXJzLCBtaXhlZCB3aXRoIHRoZSByZXF1ZXN0J3MgZXhpc3RpbmcgaGVhZGVyc1xuICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcubWl4aW5dIHRoZSBkZWZhdWx0IFwibWl4aW5zXCIgKGh0dHAvaHR0cHMgb3B0aW9ucyksIG1peGVkIHdpdGggdGhlIHJlcXVlc3QncyBleGlzdGluZyBcIm1peGluc1wiXG4gKlxuICogQHJldHVybnMge0NsaWVudH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBpbnRlcmNlcHRvcih7XG5cdHJlcXVlc3Q6IGZ1bmN0aW9uIGhhbmRsZVJlcXVlc3QocmVxdWVzdCwgY29uZmlnKSB7XG5cdFx0cmV0dXJuIGRlZmF1bHRlcihyZXF1ZXN0LCBjb25maWcpO1xuXHR9XG59KTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBpbnRlcmNlcHRvcjtcblxuaW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvcicpO1xuXG4vKipcbiAqIFJlamVjdHMgdGhlIHJlc3BvbnNlIHByb21pc2UgYmFzZWQgb24gdGhlIHN0YXR1cyBjb2RlLlxuICpcbiAqIENvZGVzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB0aGUgcHJvdmlkZWQgdmFsdWUgYXJlIHJlamVjdGVkLiAgRGVmYXVsdFxuICogdmFsdWUgNDAwLlxuICpcbiAqIEBwYXJhbSB7Q2xpZW50fSBbY2xpZW50XSBjbGllbnQgdG8gd3JhcFxuICogQHBhcmFtIHtudW1iZXJ9IFtjb25maWcuY29kZT00MDBdIGNvZGUgdG8gaW5kaWNhdGUgYSByZWplY3Rpb25cbiAqXG4gKiBAcmV0dXJucyB7Q2xpZW50fVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGludGVyY2VwdG9yKHtcblx0aW5pdDogZnVuY3Rpb24gKGNvbmZpZykge1xuXHRcdGNvbmZpZy5jb2RlID0gY29uZmlnLmNvZGUgfHwgNDAwO1xuXHRcdHJldHVybiBjb25maWc7XG5cdH0sXG5cdHJlc3BvbnNlOiBmdW5jdGlvbiAocmVzcG9uc2UsIGNvbmZpZykge1xuXHRcdGlmIChyZXNwb25zZS5zdGF0dXMgJiYgcmVzcG9uc2Uuc3RhdHVzLmNvZGUgPj0gY29uZmlnLmNvZGUpIHtcblx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdChyZXNwb25zZSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXNwb25zZTtcblx0fVxufSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW50ZXJjZXB0b3IsIG1pbWUsIHJlZ2lzdHJ5LCBub29wQ29udmVydGVyLCBtaXNzaW5nQ29udmVydGVyLCBhdHRlbXB0O1xuXG5pbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uL2ludGVyY2VwdG9yJyk7XG5taW1lID0gcmVxdWlyZSgnLi4vbWltZScpO1xucmVnaXN0cnkgPSByZXF1aXJlKCcuLi9taW1lL3JlZ2lzdHJ5Jyk7XG5hdHRlbXB0ID0gcmVxdWlyZSgnLi4vdXRpbC9hdHRlbXB0Jyk7XG5cbm5vb3BDb252ZXJ0ZXIgPSB7XG5cdHJlYWQ6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iajsgfSxcblx0d3JpdGU6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iajsgfVxufTtcblxubWlzc2luZ0NvbnZlcnRlciA9IHtcblx0cmVhZDogZnVuY3Rpb24gKCkgeyB0aHJvdyAnTm8gcmVhZCBtZXRob2QgZm91bmQgb24gY29udmVydGVyJzsgfSxcblx0d3JpdGU6IGZ1bmN0aW9uICgpIHsgdGhyb3cgJ05vIHdyaXRlIG1ldGhvZCBmb3VuZCBvbiBjb252ZXJ0ZXInOyB9XG59O1xuXG4vKipcbiAqIE1JTUUgdHlwZSBzdXBwb3J0IGZvciByZXF1ZXN0IGFuZCByZXNwb25zZSBlbnRpdGllcy4gIEVudGl0aWVzIGFyZVxuICogKGRlKXNlcmlhbGl6ZWQgdXNpbmcgdGhlIGNvbnZlcnRlciBmb3IgdGhlIE1JTUUgdHlwZS5cbiAqXG4gKiBSZXF1ZXN0IGVudGl0aWVzIGFyZSBjb252ZXJ0ZWQgdXNpbmcgdGhlIGRlc2lyZWQgY29udmVydGVyIGFuZCB0aGVcbiAqICdBY2NlcHQnIHJlcXVlc3QgaGVhZGVyIHByZWZlcnMgdGhpcyBNSU1FLlxuICpcbiAqIFJlc3BvbnNlIGVudGl0aWVzIGFyZSBjb252ZXJ0ZWQgYmFzZWQgb24gdGhlIENvbnRlbnQtVHlwZSByZXNwb25zZSBoZWFkZXIuXG4gKlxuICogQHBhcmFtIHtDbGllbnR9IFtjbGllbnRdIGNsaWVudCB0byB3cmFwXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvbmZpZy5taW1lPSd0ZXh0L3BsYWluJ10gTUlNRSB0eXBlIHRvIGVuY29kZSB0aGUgcmVxdWVzdFxuICogICBlbnRpdHlcbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29uZmlnLmFjY2VwdF0gQWNjZXB0IGhlYWRlciBmb3IgdGhlIHJlcXVlc3RcbiAqIEBwYXJhbSB7Q2xpZW50fSBbY29uZmlnLmNsaWVudD08cmVxdWVzdC5vcmlnaW5hdG9yPl0gY2xpZW50IHBhc3NlZCB0byB0aGVcbiAqICAgY29udmVydGVyLCBkZWZhdWx0cyB0byB0aGUgY2xpZW50IG9yaWdpbmF0aW5nIHRoZSByZXF1ZXN0XG4gKiBAcGFyYW0ge1JlZ2lzdHJ5fSBbY29uZmlnLnJlZ2lzdHJ5XSBNSU1FIHJlZ2lzdHJ5LCBkZWZhdWx0cyB0byB0aGUgcm9vdFxuICogICByZWdpc3RyeVxuICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnBlcm1pc3NpdmVdIEFsbG93IGFuIHVua293biByZXF1ZXN0IE1JTUUgdHlwZVxuICpcbiAqIEByZXR1cm5zIHtDbGllbnR9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gaW50ZXJjZXB0b3Ioe1xuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cdFx0Y29uZmlnLnJlZ2lzdHJ5ID0gY29uZmlnLnJlZ2lzdHJ5IHx8IHJlZ2lzdHJ5O1xuXHRcdHJldHVybiBjb25maWc7XG5cdH0sXG5cdHJlcXVlc3Q6IGZ1bmN0aW9uIChyZXF1ZXN0LCBjb25maWcpIHtcblx0XHR2YXIgdHlwZSwgaGVhZGVycztcblxuXHRcdGhlYWRlcnMgPSByZXF1ZXN0LmhlYWRlcnMgfHwgKHJlcXVlc3QuaGVhZGVycyA9IHt9KTtcblx0XHR0eXBlID0gbWltZS5wYXJzZShoZWFkZXJzWydDb250ZW50LVR5cGUnXSB8fCBjb25maWcubWltZSB8fCAndGV4dC9wbGFpbicpO1xuXHRcdGhlYWRlcnMuQWNjZXB0ID0gaGVhZGVycy5BY2NlcHQgfHwgY29uZmlnLmFjY2VwdCB8fCB0eXBlLnJhdyArICcsIGFwcGxpY2F0aW9uL2pzb247cT0wLjgsIHRleHQvcGxhaW47cT0wLjUsICovKjtxPTAuMic7XG5cblx0XHRpZiAoISgnZW50aXR5JyBpbiByZXF1ZXN0KSkge1xuXHRcdFx0cmV0dXJuIHJlcXVlc3Q7XG5cdFx0fVxuXG5cdFx0aGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSB0eXBlLnJhdztcblxuXHRcdHJldHVybiBjb25maWcucmVnaXN0cnkubG9va3VwKHR5cGUpWydjYXRjaCddKGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIGZhaWxlZCB0byByZXNvbHZlIGNvbnZlcnRlclxuXHRcdFx0aWYgKGNvbmZpZy5wZXJtaXNzaXZlKSB7XG5cdFx0XHRcdHJldHVybiBub29wQ29udmVydGVyO1xuXHRcdFx0fVxuXHRcdFx0dGhyb3cgJ21pbWUtdW5rbm93bic7XG5cdFx0fSkudGhlbihmdW5jdGlvbiAoY29udmVydGVyKSB7XG5cdFx0XHR2YXIgY2xpZW50ID0gY29uZmlnLmNsaWVudCB8fCByZXF1ZXN0Lm9yaWdpbmF0b3IsXG5cdFx0XHRcdHdyaXRlID0gY29udmVydGVyLndyaXRlIHx8IG1pc3NpbmdDb252ZXJ0ZXIud3JpdGU7XG5cblx0XHRcdHJldHVybiBhdHRlbXB0KHdyaXRlLmJpbmQodm9pZCAwLCByZXF1ZXN0LmVudGl0eSwgeyBjbGllbnQ6IGNsaWVudCwgcmVxdWVzdDogcmVxdWVzdCwgbWltZTogdHlwZSwgcmVnaXN0cnk6IGNvbmZpZy5yZWdpc3RyeSB9KSlcblx0XHRcdFx0WydjYXRjaCddKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRocm93ICdtaW1lLXNlcmlhbGl6YXRpb24nO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihlbnRpdHkpIHtcblx0XHRcdFx0XHRyZXF1ZXN0LmVudGl0eSA9IGVudGl0eTtcblx0XHRcdFx0XHRyZXR1cm4gcmVxdWVzdDtcblx0XHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlc3BvbnNlOiBmdW5jdGlvbiAocmVzcG9uc2UsIGNvbmZpZykge1xuXHRcdGlmICghKHJlc3BvbnNlLmhlYWRlcnMgJiYgcmVzcG9uc2UuaGVhZGVyc1snQ29udGVudC1UeXBlJ10gJiYgcmVzcG9uc2UuZW50aXR5KSkge1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xuXHRcdH1cblxuXHRcdHZhciB0eXBlID0gbWltZS5wYXJzZShyZXNwb25zZS5oZWFkZXJzWydDb250ZW50LVR5cGUnXSk7XG5cblx0XHRyZXR1cm4gY29uZmlnLnJlZ2lzdHJ5Lmxvb2t1cCh0eXBlKVsnY2F0Y2gnXShmdW5jdGlvbiAoKSB7IHJldHVybiBub29wQ29udmVydGVyOyB9KS50aGVuKGZ1bmN0aW9uIChjb252ZXJ0ZXIpIHtcblx0XHRcdHZhciBjbGllbnQgPSBjb25maWcuY2xpZW50IHx8IHJlc3BvbnNlLnJlcXVlc3QgJiYgcmVzcG9uc2UucmVxdWVzdC5vcmlnaW5hdG9yLFxuXHRcdFx0XHRyZWFkID0gY29udmVydGVyLnJlYWQgfHwgbWlzc2luZ0NvbnZlcnRlci5yZWFkO1xuXG5cdFx0XHRyZXR1cm4gYXR0ZW1wdChyZWFkLmJpbmQodm9pZCAwLCByZXNwb25zZS5lbnRpdHksIHsgY2xpZW50OiBjbGllbnQsIHJlc3BvbnNlOiByZXNwb25zZSwgbWltZTogdHlwZSwgcmVnaXN0cnk6IGNvbmZpZy5yZWdpc3RyeSB9KSlcblx0XHRcdFx0WydjYXRjaCddKGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0cmVzcG9uc2UuZXJyb3IgPSAnbWltZS1kZXNlcmlhbGl6YXRpb24nO1xuXHRcdFx0XHRcdHJlc3BvbnNlLmNhdXNlID0gZTtcblx0XHRcdFx0XHR0aHJvdyByZXNwb25zZTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKGVudGl0eSkge1xuXHRcdFx0XHRcdHJlc3BvbnNlLmVudGl0eSA9IGVudGl0eTtcblx0XHRcdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59KTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW50ZXJjZXB0b3IsIFVybEJ1aWxkZXI7XG5cbmludGVyY2VwdG9yID0gcmVxdWlyZSgnLi4vaW50ZXJjZXB0b3InKTtcblVybEJ1aWxkZXIgPSByZXF1aXJlKCcuLi9VcmxCdWlsZGVyJyk7XG5cbi8qKlxuICogQXBwbGllcyByZXF1ZXN0IHBhcmFtcyB0byB0aGUgcGF0aCBieSB0b2tlbiByZXBsYWNlbWVudFxuICpcbiAqIFBhcmFtcyBub3QgYXBwbGllZCBhcyBhIHRva2VuIGFyZSBhcHBlbmRlZCB0byB0aGUgcXVlcnkgc3RyaW5nLiBQYXJhbXNcbiAqIGFyZSByZW1vdmVkIGZyb20gdGhlIHJlcXVlc3Qgb2JqZWN0LCBhcyB0aGV5IGhhdmUgYmVlbiBjb25zdW1lZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBUaGUgdGVtcGxhdGUgaW50ZXJjZXB0b3IgYHJlc3QvaW50ZXJjZXB0b3IvdGVtcGxhdGVgIGlzIGFcbiAqIG11Y2ggcmljaGVyIHdheSB0byBhcHBseSBwYXJhbXRlcnMgdG8gYSB0ZW1wbGF0ZS4gVGhpcyBpbnRlcmNlcHRvciBpc1xuICogYXZhaWxhYmxlIGFzIGEgYnJpZGdlIHRvIHVzZXJzIHdobyBwcmV2aW91c2xlZCBkZXBlbmRlZCBvbiB0aGlzXG4gKiBmdW5jdGlvbmFsaXR5IGJlaW5nIGF2YWlsYWJsZSBkaXJlY3RseSBvbiBjbGllbnRzLlxuICpcbiAqIEBwYXJhbSB7Q2xpZW50fSBbY2xpZW50XSBjbGllbnQgdG8gd3JhcFxuICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcucGFyYW1zXSBkZWZhdWx0IHBhcmFtIHZhbHVlc1xuICpcbiAqIEByZXR1cm5zIHtDbGllbnR9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gaW50ZXJjZXB0b3Ioe1xuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cdFx0Y29uZmlnLnBhcmFtcyA9IGNvbmZpZy5wYXJhbXMgfHwge307XG5cdFx0cmV0dXJuIGNvbmZpZztcblx0fSxcblx0cmVxdWVzdDogZnVuY3Rpb24gKHJlcXVlc3QsIGNvbmZpZykge1xuXHRcdHZhciBwYXRoLCBwYXJhbXM7XG5cblx0XHRwYXRoID0gcmVxdWVzdC5wYXRoIHx8ICcnO1xuXHRcdHBhcmFtcyA9IHJlcXVlc3QucGFyYW1zIHx8IHt9O1xuXG5cdFx0cmVxdWVzdC5wYXRoID0gbmV3IFVybEJ1aWxkZXIocGF0aCwgY29uZmlnLnBhcmFtcykuYXBwZW5kKCcnLCBwYXJhbXMpLmJ1aWxkKCk7XG5cdFx0ZGVsZXRlIHJlcXVlc3QucGFyYW1zO1xuXG5cdFx0cmV0dXJuIHJlcXVlc3Q7XG5cdH1cbn0pO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGludGVyY2VwdG9yLCBVcmxCdWlsZGVyO1xuXG5pbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uL2ludGVyY2VwdG9yJyk7XG5VcmxCdWlsZGVyID0gcmVxdWlyZSgnLi4vVXJsQnVpbGRlcicpO1xuXG5mdW5jdGlvbiBzdGFydHNXaXRoKHN0ciwgcHJlZml4KSB7XG5cdHJldHVybiBzdHIuaW5kZXhPZihwcmVmaXgpID09PSAwO1xufVxuXG5mdW5jdGlvbiBlbmRzV2l0aChzdHIsIHN1ZmZpeCkge1xuXHRyZXR1cm4gc3RyLmxhc3RJbmRleE9mKHN1ZmZpeCkgKyBzdWZmaXgubGVuZ3RoID09PSBzdHIubGVuZ3RoO1xufVxuXG4vKipcbiAqIFByZWZpeGVzIHRoZSByZXF1ZXN0IHBhdGggd2l0aCBhIGNvbW1vbiB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge0NsaWVudH0gW2NsaWVudF0gY2xpZW50IHRvIHdyYXBcbiAqIEBwYXJhbSB7bnVtYmVyfSBbY29uZmlnLnByZWZpeF0gcGF0aCBwcmVmaXhcbiAqXG4gKiBAcmV0dXJucyB7Q2xpZW50fVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGludGVyY2VwdG9yKHtcblx0cmVxdWVzdDogZnVuY3Rpb24gKHJlcXVlc3QsIGNvbmZpZykge1xuXHRcdHZhciBwYXRoO1xuXG5cdFx0aWYgKGNvbmZpZy5wcmVmaXggJiYgIShuZXcgVXJsQnVpbGRlcihyZXF1ZXN0LnBhdGgpLmlzRnVsbHlRdWFsaWZpZWQoKSkpIHtcblx0XHRcdHBhdGggPSBjb25maWcucHJlZml4O1xuXHRcdFx0aWYgKHJlcXVlc3QucGF0aCkge1xuXHRcdFx0XHRpZiAoIWVuZHNXaXRoKHBhdGgsICcvJykgJiYgIXN0YXJ0c1dpdGgocmVxdWVzdC5wYXRoLCAnLycpKSB7XG5cdFx0XHRcdFx0Ly8gYWRkIG1pc3NpbmcgJy8nIGJldHdlZW4gcGF0aCBzZWN0aW9uc1xuXHRcdFx0XHRcdHBhdGggKz0gJy8nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBhdGggKz0gcmVxdWVzdC5wYXRoO1xuXHRcdFx0fVxuXHRcdFx0cmVxdWVzdC5wYXRoID0gcGF0aDtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVxdWVzdDtcblx0fVxufSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW50ZXJjZXB0b3IsIHVyaVRlbXBsYXRlLCBtaXhpbjtcblxuaW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvcicpO1xudXJpVGVtcGxhdGUgPSByZXF1aXJlKCcuLi91dGlsL3VyaVRlbXBsYXRlJyk7XG5taXhpbiA9IHJlcXVpcmUoJy4uL3V0aWwvbWl4aW4nKTtcblxuLyoqXG4gKiBBcHBsaWVzIHJlcXVlc3QgcGFyYW1zIHRvIHRoZSBwYXRoIGFzIGEgVVJJIFRlbXBsYXRlXG4gKlxuICogUGFyYW1zIGFyZSByZW1vdmVkIGZyb20gdGhlIHJlcXVlc3Qgb2JqZWN0LCBhcyB0aGV5IGhhdmUgYmVlbiBjb25zdW1lZC5cbiAqXG4gKiBAc2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2NTcwXG4gKlxuICogQHBhcmFtIHtDbGllbnR9IFtjbGllbnRdIGNsaWVudCB0byB3cmFwXG4gKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5wYXJhbXNdIGRlZmF1bHQgcGFyYW0gdmFsdWVzXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvbmZpZy50ZW1wbGF0ZV0gZGVmYXVsdCB0ZW1wbGF0ZVxuICpcbiAqIEByZXR1cm5zIHtDbGllbnR9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gaW50ZXJjZXB0b3Ioe1xuXHRpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cdFx0Y29uZmlnLnBhcmFtcyA9IGNvbmZpZy5wYXJhbXMgfHwge307XG5cdFx0Y29uZmlnLnRlbXBsYXRlID0gY29uZmlnLnRlbXBsYXRlIHx8ICcnO1xuXHRcdHJldHVybiBjb25maWc7XG5cdH0sXG5cdHJlcXVlc3Q6IGZ1bmN0aW9uIChyZXF1ZXN0LCBjb25maWcpIHtcblx0XHR2YXIgdGVtcGxhdGUsIHBhcmFtcztcblxuXHRcdHRlbXBsYXRlID0gcmVxdWVzdC5wYXRoIHx8IGNvbmZpZy50ZW1wbGF0ZTtcblx0XHRwYXJhbXMgPSBtaXhpbih7fSwgcmVxdWVzdC5wYXJhbXMsIGNvbmZpZy5wYXJhbXMpO1xuXG5cdFx0cmVxdWVzdC5wYXRoID0gdXJpVGVtcGxhdGUuZXhwYW5kKHRlbXBsYXRlLCBwYXJhbXMpO1xuXHRcdGRlbGV0ZSByZXF1ZXN0LnBhcmFtcztcblxuXHRcdHJldHVybiByZXF1ZXN0O1xuXHR9XG59KTtcbiIsIi8qXG4qIENvcHlyaWdodCAyMDE0LTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4qIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4qXG4qIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFBhcnNlIGEgTUlNRSB0eXBlIGludG8gaXQncyBjb25zdGl0dWVudCBwYXJ0c1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBtaW1lIE1JTUUgdHlwZSB0byBwYXJzZVxuICogQHJldHVybiB7e1xuICogICB7c3RyaW5nfSByYXcgdGhlIG9yaWdpbmFsIE1JTUUgdHlwZVxuICogICB7c3RyaW5nfSB0eXBlIHRoZSB0eXBlIGFuZCBzdWJ0eXBlXG4gKiAgIHtzdHJpbmd9IFtzdWZmaXhdIG1pbWUgc3VmZml4LCBpbmNsdWRpbmcgdGhlIHBsdXMsIGlmIGFueVxuICogICB7T2JqZWN0fSBwYXJhbXMga2V5L3ZhbHVlIHBhaXIgb2YgYXR0cmlidXRlc1xuICogfX1cbiAqL1xuZnVuY3Rpb24gcGFyc2UobWltZSkge1xuXHR2YXIgcGFyYW1zLCB0eXBlO1xuXG5cdHBhcmFtcyA9IG1pbWUuc3BsaXQoJzsnKTtcblx0dHlwZSA9IHBhcmFtc1swXS50cmltKCkuc3BsaXQoJysnKTtcblxuXHRyZXR1cm4ge1xuXHRcdHJhdzogbWltZSxcblx0XHR0eXBlOiB0eXBlWzBdLFxuXHRcdHN1ZmZpeDogdHlwZVsxXSA/ICcrJyArIHR5cGVbMV0gOiAnJyxcblx0XHRwYXJhbXM6IHBhcmFtcy5zbGljZSgxKS5yZWR1Y2UoZnVuY3Rpb24gKHBhcmFtcywgcGFpcikge1xuXHRcdFx0cGFpciA9IHBhaXIuc3BsaXQoJz0nKTtcblx0XHRcdHBhcmFtc1twYWlyWzBdLnRyaW0oKV0gPSBwYWlyWzFdID8gcGFpclsxXS50cmltKCkgOiB2b2lkIDA7XG5cdFx0XHRyZXR1cm4gcGFyYW1zO1xuXHRcdH0sIHt9KVxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0cGFyc2U6IHBhcnNlXG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIG1pbWUsIHJlZ2lzdHJ5O1xuXG5taW1lID0gcmVxdWlyZSgnLi4vbWltZScpO1xuXG5mdW5jdGlvbiBSZWdpc3RyeShtaW1lcykge1xuXG5cdC8qKlxuXHQgKiBMb29rdXAgdGhlIGNvbnZlcnRlciBmb3IgYSBNSU1FIHR5cGVcblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgdGhlIE1JTUUgdHlwZVxuXHQgKiBAcmV0dXJuIGEgcHJvbWlzZSBmb3IgdGhlIGNvbnZlcnRlclxuXHQgKi9cblx0dGhpcy5sb29rdXAgPSBmdW5jdGlvbiBsb29rdXAodHlwZSkge1xuXHRcdHZhciBwYXJzZWQ7XG5cblx0XHRwYXJzZWQgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyBtaW1lLnBhcnNlKHR5cGUpIDogdHlwZTtcblxuXHRcdGlmIChtaW1lc1twYXJzZWQucmF3XSkge1xuXHRcdFx0cmV0dXJuIG1pbWVzW3BhcnNlZC5yYXddO1xuXHRcdH1cblx0XHRpZiAobWltZXNbcGFyc2VkLnR5cGUgKyBwYXJzZWQuc3VmZml4XSkge1xuXHRcdFx0cmV0dXJuIG1pbWVzW3BhcnNlZC50eXBlICsgcGFyc2VkLnN1ZmZpeF07XG5cdFx0fVxuXHRcdGlmIChtaW1lc1twYXJzZWQudHlwZV0pIHtcblx0XHRcdHJldHVybiBtaW1lc1twYXJzZWQudHlwZV07XG5cdFx0fVxuXHRcdGlmIChtaW1lc1twYXJzZWQuc3VmZml4XSkge1xuXHRcdFx0cmV0dXJuIG1pbWVzW3BhcnNlZC5zdWZmaXhdO1xuXHRcdH1cblxuXHRcdHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1VuYWJsZSB0byBsb2NhdGUgY29udmVydGVyIGZvciBtaW1lIFwiJyArIHBhcnNlZC5yYXcgKyAnXCInKSk7XG5cdH07XG5cblx0LyoqXG5cdCAqIENyZWF0ZSBhIGxhdGUgZGlzcGF0Y2hlZCBwcm94eSB0byB0aGUgdGFyZ2V0IGNvbnZlcnRlci5cblx0ICpcblx0ICogQ29tbW9uIHdoZW4gYSBjb252ZXJ0ZXIgaXMgcmVnaXN0ZXJlZCB1bmRlciBtdWx0aXBsZSBuYW1lcyBhbmRcblx0ICogc2hvdWxkIGJlIGtlcHQgaW4gc3luYyBpZiB1cGRhdGVkLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBtaW1lIGNvbnZlcnRlciB0byBkaXNwYXRjaCB0b1xuXHQgKiBAcmV0dXJucyBjb252ZXJ0ZXIgd2hvc2UgcmVhZC93cml0ZSBtZXRob2RzIHRhcmdldCB0aGUgZGVzaXJlZCBtaW1lIGNvbnZlcnRlclxuXHQgKi9cblx0dGhpcy5kZWxlZ2F0ZSA9IGZ1bmN0aW9uIGRlbGVnYXRlKHR5cGUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVhZDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2YXIgYXJncyA9IGFyZ3VtZW50cztcblx0XHRcdFx0cmV0dXJuIHRoaXMubG9va3VwKHR5cGUpLnRoZW4oZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuXHRcdFx0XHRcdHJldHVybiBjb252ZXJ0ZXIucmVhZC5hcHBseSh0aGlzLCBhcmdzKTtcblx0XHRcdFx0fS5iaW5kKHRoaXMpKTtcblx0XHRcdH0uYmluZCh0aGlzKSxcblx0XHRcdHdyaXRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZhciBhcmdzID0gYXJndW1lbnRzO1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5sb29rdXAodHlwZSkudGhlbihmdW5jdGlvbiAoY29udmVydGVyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNvbnZlcnRlci53cml0ZS5hcHBseSh0aGlzLCBhcmdzKTtcblx0XHRcdFx0fS5iaW5kKHRoaXMpKTtcblx0XHRcdH0uYmluZCh0aGlzKVxuXHRcdH07XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlZ2lzdGVyIGEgY3VzdG9tIGNvbnZlcnRlciBmb3IgYSBNSU1FIHR5cGVcblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgdGhlIE1JTUUgdHlwZVxuXHQgKiBAcGFyYW0gY29udmVydGVyIHRoZSBjb252ZXJ0ZXIgZm9yIHRoZSBNSU1FIHR5cGVcblx0ICogQHJldHVybiBhIHByb21pc2UgZm9yIHRoZSBjb252ZXJ0ZXJcblx0ICovXG5cdHRoaXMucmVnaXN0ZXIgPSBmdW5jdGlvbiByZWdpc3Rlcih0eXBlLCBjb252ZXJ0ZXIpIHtcblx0XHRtaW1lc1t0eXBlXSA9IFByb21pc2UucmVzb2x2ZShjb252ZXJ0ZXIpO1xuXHRcdHJldHVybiBtaW1lc1t0eXBlXTtcblx0fTtcblxuXHQvKipcblx0ICogQ3JlYXRlIGEgY2hpbGQgcmVnaXN0cnkgd2hvZXMgcmVnaXN0ZXJlZCBjb252ZXJ0ZXJzIHJlbWFpbiBsb2NhbCwgd2hpbGVcblx0ICogYWJsZSB0byBsb29rdXAgY29udmVydGVycyBmcm9tIGl0cyBwYXJlbnQuXG5cdCAqXG5cdCAqIEByZXR1cm5zIGNoaWxkIE1JTUUgcmVnaXN0cnlcblx0ICovXG5cdHRoaXMuY2hpbGQgPSBmdW5jdGlvbiBjaGlsZCgpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ2lzdHJ5KE9iamVjdC5jcmVhdGUobWltZXMpKTtcblx0fTtcblxufVxuXG5yZWdpc3RyeSA9IG5ldyBSZWdpc3RyeSh7fSk7XG5cbi8vIGluY2x1ZGUgcHJvdmlkZWQgc2VyaWFsaXplcnNcbnJlZ2lzdHJ5LnJlZ2lzdGVyKCdhcHBsaWNhdGlvbi9oYWwnLCByZXF1aXJlKCcuL3R5cGUvYXBwbGljYXRpb24vaGFsJykpO1xucmVnaXN0cnkucmVnaXN0ZXIoJ2FwcGxpY2F0aW9uL2pzb24nLCByZXF1aXJlKCcuL3R5cGUvYXBwbGljYXRpb24vanNvbicpKTtcbnJlZ2lzdHJ5LnJlZ2lzdGVyKCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLCByZXF1aXJlKCcuL3R5cGUvYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJykpO1xucmVnaXN0cnkucmVnaXN0ZXIoJ211bHRpcGFydC9mb3JtLWRhdGEnLCByZXF1aXJlKCcuL3R5cGUvbXVsdGlwYXJ0L2Zvcm0tZGF0YScpKTtcbnJlZ2lzdHJ5LnJlZ2lzdGVyKCd0ZXh0L3BsYWluJywgcmVxdWlyZSgnLi90eXBlL3RleHQvcGxhaW4nKSk7XG5cbnJlZ2lzdHJ5LnJlZ2lzdGVyKCcranNvbicsIHJlZ2lzdHJ5LmRlbGVnYXRlKCdhcHBsaWNhdGlvbi9qc29uJykpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdHJ5O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEzLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHBhdGhQcmVmaXgsIHRlbXBsYXRlLCBmaW5kLCBsYXp5UHJvbWlzZSwgcmVzcG9uc2VQcm9taXNlO1xuXG5wYXRoUHJlZml4ID0gcmVxdWlyZSgnLi4vLi4vLi4vaW50ZXJjZXB0b3IvcGF0aFByZWZpeCcpO1xudGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi8uLi9pbnRlcmNlcHRvci90ZW1wbGF0ZScpO1xuZmluZCA9IHJlcXVpcmUoJy4uLy4uLy4uL3V0aWwvZmluZCcpO1xubGF6eVByb21pc2UgPSByZXF1aXJlKCcuLi8uLi8uLi91dGlsL2xhenlQcm9taXNlJyk7XG5yZXNwb25zZVByb21pc2UgPSByZXF1aXJlKCcuLi8uLi8uLi91dGlsL3Jlc3BvbnNlUHJvbWlzZScpO1xuXG5mdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShvYmosIG5hbWUsIHZhbHVlKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIG5hbWUsIHtcblx0XHR2YWx1ZTogdmFsdWUsXG5cdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdHdyaXRlYWJsZTogdHJ1ZVxuXHR9KTtcbn1cblxuLyoqXG4gKiBIeXBlcnRleHQgQXBwbGljYXRpb24gTGFuZ3VhZ2Ugc2VyaWFsaXplclxuICpcbiAqIEltcGxlbWVudGVkIHRvIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9kcmFmdC1rZWxseS1qc29uLWhhbC0wNlxuICpcbiAqIEFzIHRoZSBzcGVjIGlzIHN0aWxsIGEgZHJhZnQsIHRoaXMgaW1wbGVtZW50YXRpb24gd2lsbCBiZSB1cGRhdGVkIGFzIHRoZVxuICogc3BlYyBldm9sdmVzXG4gKlxuICogT2JqZWN0cyBhcmUgcmVhZCBhcyBIQUwgaW5kZXhpbmcgbGlua3MgYW5kIGVtYmVkZGVkIG9iamVjdHMgb24gdG8gdGhlXG4gKiByZXNvdXJjZS4gT2JqZWN0cyBhcmUgd3JpdHRlbiBhcyBwbGFpbiBKU09OLlxuICpcbiAqIEVtYmVkZGVkIHJlbGF0aW9uc2hpcHMgYXJlIGluZGV4ZWQgb250byB0aGUgcmVzb3VyY2UgYnkgdGhlIHJlbGF0aW9uc2hpcFxuICogYXMgYSBwcm9taXNlIGZvciB0aGUgcmVsYXRlZCByZXNvdXJjZS5cbiAqXG4gKiBMaW5rcyBhcmUgaW5kZXhlZCBvbnRvIHRoZSByZXNvdXJjZSBhcyBhIGxhenkgcHJvbWlzZSB0aGF0IHdpbGwgR0VUIHRoZVxuICogcmVzb3VyY2Ugd2hlbiBhIGhhbmRsZXIgaXMgZmlyc3QgcmVnaXN0ZXJlZCBvbiB0aGUgcHJvbWlzZS5cbiAqXG4gKiBBIGByZXF1ZXN0Rm9yYCBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIGVudGl0eSB0byBtYWtlIGEgcmVxdWVzdCBmb3IgdGhlXG4gKiByZWxhdGlvbnNoaXAuXG4gKlxuICogQSBgY2xpZW50Rm9yYCBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIGVudGl0eSB0byBnZXQgYSBmdWxsIENsaWVudCBmb3IgYVxuICogcmVsYXRpb25zaGlwLlxuICpcbiAqIFRoZSBgX2xpbmtzYCBhbmQgYF9lbWJlZGRlZGAgcHJvcGVydGllcyBvbiB0aGUgcmVzb3VyY2UgYXJlIG1hZGVcbiAqIG5vbi1lbnVtZXJhYmxlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuXHRyZWFkOiBmdW5jdGlvbiAoc3RyLCBvcHRzKSB7XG5cdFx0dmFyIGNsaWVudCwgY29uc29sZTtcblxuXHRcdG9wdHMgPSBvcHRzIHx8IHt9O1xuXHRcdGNsaWVudCA9IG9wdHMuY2xpZW50O1xuXHRcdGNvbnNvbGUgPSBvcHRzLmNvbnNvbGUgfHwgY29uc29sZTtcblxuXHRcdGZ1bmN0aW9uIGRlcHJlY2F0aW9uV2FybmluZyhyZWxhdGlvbnNoaXAsIGRlcHJlY2F0aW9uKSB7XG5cdFx0XHRpZiAoZGVwcmVjYXRpb24gJiYgY29uc29sZSAmJiBjb25zb2xlLndhcm4gfHwgY29uc29sZS5sb2cpIHtcblx0XHRcdFx0KGNvbnNvbGUud2FybiB8fCBjb25zb2xlLmxvZykuY2FsbChjb25zb2xlLCAnUmVsYXRpb25zaGlwIFxcJycgKyByZWxhdGlvbnNoaXAgKyAnXFwnIGlzIGRlcHJlY2F0ZWQsIHNlZSAnICsgZGVwcmVjYXRpb24pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBvcHRzLnJlZ2lzdHJ5Lmxvb2t1cChvcHRzLm1pbWUuc3VmZml4KS50aGVuKGZ1bmN0aW9uIChjb252ZXJ0ZXIpIHtcblx0XHRcdHJldHVybiBjb252ZXJ0ZXIucmVhZChzdHIsIG9wdHMpO1xuXHRcdH0pLnRoZW4oZnVuY3Rpb24gKHJvb3QpIHtcblx0XHRcdGZpbmQuZmluZFByb3BlcnRpZXMocm9vdCwgJ19lbWJlZGRlZCcsIGZ1bmN0aW9uIChlbWJlZGRlZCwgcmVzb3VyY2UsIG5hbWUpIHtcblx0XHRcdFx0T2JqZWN0LmtleXMoZW1iZWRkZWQpLmZvckVhY2goZnVuY3Rpb24gKHJlbGF0aW9uc2hpcCkge1xuXHRcdFx0XHRcdGlmIChyZWxhdGlvbnNoaXAgaW4gcmVzb3VyY2UpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0dmFyIHJlbGF0ZWQgPSByZXNwb25zZVByb21pc2Uoe1xuXHRcdFx0XHRcdFx0ZW50aXR5OiBlbWJlZGRlZFtyZWxhdGlvbnNoaXBdXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsIHJlbGF0aW9uc2hpcCwgcmVsYXRlZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRkZWZpbmVQcm9wZXJ0eShyZXNvdXJjZSwgbmFtZSwgZW1iZWRkZWQpO1xuXHRcdFx0fSk7XG5cdFx0XHRmaW5kLmZpbmRQcm9wZXJ0aWVzKHJvb3QsICdfbGlua3MnLCBmdW5jdGlvbiAobGlua3MsIHJlc291cmNlLCBuYW1lKSB7XG5cdFx0XHRcdE9iamVjdC5rZXlzKGxpbmtzKS5mb3JFYWNoKGZ1bmN0aW9uIChyZWxhdGlvbnNoaXApIHtcblx0XHRcdFx0XHR2YXIgbGluayA9IGxpbmtzW3JlbGF0aW9uc2hpcF07XG5cdFx0XHRcdFx0aWYgKHJlbGF0aW9uc2hpcCBpbiByZXNvdXJjZSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRkZWZpbmVQcm9wZXJ0eShyZXNvdXJjZSwgcmVsYXRpb25zaGlwLCByZXNwb25zZVByb21pc2UubWFrZShsYXp5UHJvbWlzZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAobGluay5kZXByZWNhdGlvbikgeyBkZXByZWNhdGlvbldhcm5pbmcocmVsYXRpb25zaGlwLCBsaW5rLmRlcHJlY2F0aW9uKTsgfVxuXHRcdFx0XHRcdFx0aWYgKGxpbmsudGVtcGxhdGVkID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0ZW1wbGF0ZShjbGllbnQpKHsgcGF0aDogbGluay5ocmVmIH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGNsaWVudCh7IHBhdGg6IGxpbmsuaHJlZiB9KTtcblx0XHRcdFx0XHR9KSkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsIG5hbWUsIGxpbmtzKTtcblx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsICdjbGllbnRGb3InLCBmdW5jdGlvbiAocmVsYXRpb25zaGlwLCBjbGllbnRPdmVycmlkZSkge1xuXHRcdFx0XHRcdHZhciBsaW5rID0gbGlua3NbcmVsYXRpb25zaGlwXTtcblx0XHRcdFx0XHRpZiAoIWxpbmspIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biByZWxhdGlvbnNoaXA6ICcgKyByZWxhdGlvbnNoaXApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobGluay5kZXByZWNhdGlvbikgeyBkZXByZWNhdGlvbldhcm5pbmcocmVsYXRpb25zaGlwLCBsaW5rLmRlcHJlY2F0aW9uKTsgfVxuXHRcdFx0XHRcdGlmIChsaW5rLnRlbXBsYXRlZCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRlbXBsYXRlKFxuXHRcdFx0XHRcdFx0XHRjbGllbnRPdmVycmlkZSB8fCBjbGllbnQsXG5cdFx0XHRcdFx0XHRcdHsgdGVtcGxhdGU6IGxpbmsuaHJlZiB9XG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gcGF0aFByZWZpeChcblx0XHRcdFx0XHRcdGNsaWVudE92ZXJyaWRlIHx8IGNsaWVudCxcblx0XHRcdFx0XHRcdHsgcHJlZml4OiBsaW5rLmhyZWYgfVxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRkZWZpbmVQcm9wZXJ0eShyZXNvdXJjZSwgJ3JlcXVlc3RGb3InLCBmdW5jdGlvbiAocmVsYXRpb25zaGlwLCByZXF1ZXN0LCBjbGllbnRPdmVycmlkZSkge1xuXHRcdFx0XHRcdHZhciBjbGllbnQgPSB0aGlzLmNsaWVudEZvcihyZWxhdGlvbnNoaXAsIGNsaWVudE92ZXJyaWRlKTtcblx0XHRcdFx0XHRyZXR1cm4gY2xpZW50KHJlcXVlc3QpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gcm9vdDtcblx0XHR9KTtcblxuXHR9LFxuXG5cdHdyaXRlOiBmdW5jdGlvbiAob2JqLCBvcHRzKSB7XG5cdFx0cmV0dXJuIG9wdHMucmVnaXN0cnkubG9va3VwKG9wdHMubWltZS5zdWZmaXgpLnRoZW4oZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuXHRcdFx0cmV0dXJuIGNvbnZlcnRlci53cml0ZShvYmosIG9wdHMpO1xuXHRcdH0pO1xuXHR9XG5cbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBKU09OIGNvbnZlcnRlciB3aXRoIGN1c3RvbSByZXZpdmVyL3JlcGxhY2VyLlxuICpcbiAqIFRoZSBleHRlbmRlZCBjb252ZXJ0ZXIgbXVzdCBiZSBwdWJsaXNoZWQgdG8gYSBNSU1FIHJlZ2lzdHJ5IGluIG9yZGVyXG4gKiB0byBiZSB1c2VkLiBUaGUgZXhpc3RpbmcgY29udmVydGVyIHdpbGwgbm90IGJlIG1vZGlmaWVkLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvSlNPTlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtyZXZpdmVyPXVuZGVmaW5lZF0gY3VzdG9tIEpTT04ucGFyc2UgcmV2aXZlclxuICogQHBhcmFtIHtmdW5jdGlvbnxBcnJheX0gW3JlcGxhY2VyPXVuZGVmaW5lZF0gY3VzdG9tIEpTT04uc3RyaW5naWZ5IHJlcGxhY2VyXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvbnZlcnRlcihyZXZpdmVyLCByZXBsYWNlcikge1xuXHRyZXR1cm4ge1xuXG5cdFx0cmVhZDogZnVuY3Rpb24gKHN0cikge1xuXHRcdFx0cmV0dXJuIEpTT04ucGFyc2Uoc3RyLCByZXZpdmVyKTtcblx0XHR9LFxuXG5cdFx0d3JpdGU6IGZ1bmN0aW9uIChvYmopIHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShvYmosIHJlcGxhY2VyKTtcblx0XHR9LFxuXG5cdFx0ZXh0ZW5kOiBjcmVhdGVDb252ZXJ0ZXJcblxuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUNvbnZlcnRlcigpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVuY29kZWRTcGFjZVJFLCB1cmxFbmNvZGVkU3BhY2VSRTtcblxuZW5jb2RlZFNwYWNlUkUgPSAvJTIwL2c7XG51cmxFbmNvZGVkU3BhY2VSRSA9IC9cXCsvZztcblxuZnVuY3Rpb24gdXJsRW5jb2RlKHN0cikge1xuXHRzdHIgPSBlbmNvZGVVUklDb21wb25lbnQoc3RyKTtcblx0Ly8gc3BlYyBzYXlzIHNwYWNlIHNob3VsZCBiZSBlbmNvZGVkIGFzICcrJ1xuXHRyZXR1cm4gc3RyLnJlcGxhY2UoZW5jb2RlZFNwYWNlUkUsICcrJyk7XG59XG5cbmZ1bmN0aW9uIHVybERlY29kZShzdHIpIHtcblx0Ly8gc3BlYyBzYXlzIHNwYWNlIHNob3VsZCBiZSBlbmNvZGVkIGFzICcrJ1xuXHRzdHIgPSBzdHIucmVwbGFjZSh1cmxFbmNvZGVkU3BhY2VSRSwgJyAnKTtcblx0cmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmQoc3RyLCBuYW1lLCB2YWx1ZSkge1xuXHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcblx0XHR2YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0c3RyID0gYXBwZW5kKHN0ciwgbmFtZSwgdmFsdWUpO1xuXHRcdH0pO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGlmIChzdHIubGVuZ3RoID4gMCkge1xuXHRcdFx0c3RyICs9ICcmJztcblx0XHR9XG5cdFx0c3RyICs9IHVybEVuY29kZShuYW1lKTtcblx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuXHRcdFx0c3RyICs9ICc9JyArIHVybEVuY29kZSh2YWx1ZSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBzdHI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG5cdHJlYWQ6IGZ1bmN0aW9uIChzdHIpIHtcblx0XHR2YXIgb2JqID0ge307XG5cdFx0c3RyLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbiAoZW50cnkpIHtcblx0XHRcdHZhciBwYWlyLCBuYW1lLCB2YWx1ZTtcblx0XHRcdHBhaXIgPSBlbnRyeS5zcGxpdCgnPScpO1xuXHRcdFx0bmFtZSA9IHVybERlY29kZShwYWlyWzBdKTtcblx0XHRcdGlmIChwYWlyLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0XHR2YWx1ZSA9IHVybERlY29kZShwYWlyWzFdKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR2YWx1ZSA9IG51bGw7XG5cdFx0XHR9XG5cdFx0XHRpZiAobmFtZSBpbiBvYmopIHtcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KG9ialtuYW1lXSkpIHtcblx0XHRcdFx0XHQvLyBjb252ZXJ0IHRvIGFuIGFycmF5LCBwZXJzZXJ2aW5nIGN1cnJuZW50IHZhbHVlXG5cdFx0XHRcdFx0b2JqW25hbWVdID0gW29ialtuYW1lXV07XG5cdFx0XHRcdH1cblx0XHRcdFx0b2JqW25hbWVdLnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdG9ialtuYW1lXSA9IHZhbHVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiBvYmo7XG5cdH0sXG5cblx0d3JpdGU6IGZ1bmN0aW9uIChvYmopIHtcblx0XHR2YXIgc3RyID0gJyc7XG5cdFx0T2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRzdHIgPSBhcHBlbmQoc3RyLCBuYW1lLCBvYmpbbmFtZV0pO1xuXHRcdH0pO1xuXHRcdHJldHVybiBzdHI7XG5cdH1cblxufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNC0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIE1pY2hhZWwgSmFja3NvblxuICovXG5cbi8qIGdsb2JhbCBGb3JtRGF0YSwgRmlsZSwgQmxvYiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGlzRm9ybUVsZW1lbnQob2JqZWN0KSB7XG5cdHJldHVybiBvYmplY3QgJiZcblx0XHRvYmplY3Qubm9kZVR5cGUgPT09IDEgJiYgLy8gTm9kZS5FTEVNRU5UX05PREVcblx0XHRvYmplY3QudGFnTmFtZSA9PT0gJ0ZPUk0nO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVGb3JtRGF0YUZyb21PYmplY3Qob2JqZWN0KSB7XG5cdHZhciBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXG5cdHZhciB2YWx1ZTtcblx0Zm9yICh2YXIgcHJvcGVydHkgaW4gb2JqZWN0KSB7XG5cdFx0aWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcblxuXHRcdFx0aWYgKHZhbHVlIGluc3RhbmNlb2YgRmlsZSkge1xuXHRcdFx0XHRmb3JtRGF0YS5hcHBlbmQocHJvcGVydHksIHZhbHVlLCB2YWx1ZS5uYW1lKTtcblx0XHRcdH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBCbG9iKSB7XG5cdFx0XHRcdGZvcm1EYXRhLmFwcGVuZChwcm9wZXJ0eSwgdmFsdWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9ybURhdGEuYXBwZW5kKHByb3BlcnR5LCBTdHJpbmcodmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZm9ybURhdGE7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG5cdHdyaXRlOiBmdW5jdGlvbiAob2JqZWN0KSB7XG5cdFx0aWYgKHR5cGVvZiBGb3JtRGF0YSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignVGhlIG11bHRpcGFydC9mb3JtLWRhdGEgbWltZSBzZXJpYWxpemVyIHJlcXVpcmVzIEZvcm1EYXRhIHN1cHBvcnQnKTtcblx0XHR9XG5cblx0XHQvLyBTdXBwb3J0IEZvcm1EYXRhIGRpcmVjdGx5LlxuXHRcdGlmIChvYmplY3QgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuXHRcdFx0cmV0dXJuIG9iamVjdDtcblx0XHR9XG5cblx0XHQvLyBTdXBwb3J0IDxmb3JtPiBlbGVtZW50cy5cblx0XHRpZiAoaXNGb3JtRWxlbWVudChvYmplY3QpKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZvcm1EYXRhKG9iamVjdCk7XG5cdFx0fVxuXG5cdFx0Ly8gU3VwcG9ydCBwbGFpbiBvYmplY3RzLCBtYXkgY29udGFpbiBGaWxlL0Jsb2IgYXMgdmFsdWUuXG5cdFx0aWYgKHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdCAhPT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIGNyZWF0ZUZvcm1EYXRhRnJvbU9iamVjdChvYmplY3QpO1xuXHRcdH1cblxuXHRcdHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGNyZWF0ZSBGb3JtRGF0YSBmcm9tIG9iamVjdCAnICsgb2JqZWN0KTtcblx0fVxuXG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cblx0cmVhZDogZnVuY3Rpb24gKHN0cikge1xuXHRcdHJldHVybiBzdHI7XG5cdH0sXG5cblx0d3JpdGU6IGZ1bmN0aW9uIChvYmopIHtcblx0XHRyZXR1cm4gb2JqLnRvU3RyaW5nKCk7XG5cdH1cblxufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNS0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQXR0ZW1wdCB0byBpbnZva2UgYSBmdW5jdGlvbiBjYXB0dXJpbmcgdGhlIHJlc3VsdGluZyB2YWx1ZSBhcyBhIFByb21pc2VcbiAqXG4gKiBJZiB0aGUgbWV0aG9kIHRocm93cywgdGhlIGNhdWdodCB2YWx1ZSB1c2VkIHRvIHJlamVjdCB0aGUgUHJvbWlzZS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSB3b3JrIGZ1bmN0aW9uIHRvIGludm9rZVxuICogQHJldHVybnMge1Byb21pc2V9IFByb21pc2UgZm9yIHRoZSBvdXRwdXQgb2YgdGhlIHdvcmsgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gYXR0ZW1wdCh3b3JrKSB7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh3b3JrKCkpO1xuXHR9XG5cdGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYXR0ZW1wdDtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMDkgTmljaG9sYXMgQy4gWmFrYXMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKlxuICogQmFzZSA2NCBpbXBsZW1lbnRhdGlvbiBpbiBKYXZhU2NyaXB0XG4gKiBPcmlnaW5hbCBzb3VyY2UgYXZhaWxhYmxlIGF0IGh0dHBzOi8vcmF3LmdpdGh1Yi5jb20vbnpha2FzL2NvbXB1dGVyLXNjaWVuY2UtaW4tamF2YXNjcmlwdC8wMmEyNzQ1YjRhYTgyMTRmMmNhZTFiZjBiMTViNDQ3Y2ExYTkxYjIzL2VuY29kaW5ncy9iYXNlNjQvYmFzZTY0LmpzXG4gKlxuICogTGludGVyIHJlZmluZW1lbnQgYnkgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLypqc2hpbnQgYml0d2lzZTogZmFsc2UgKi9cblxudmFyIGRpZ2l0cyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuLyoqXG4gKiBCYXNlNjQtZW5jb2RlcyBhIHN0cmluZyBvZiB0ZXh0LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IFRoZSB0ZXh0IHRvIGVuY29kZS5cbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGJhc2U2NC1lbmNvZGVkIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYmFzZTY0RW5jb2RlKHRleHQpIHtcblxuXHRpZiAoLyhbXlxcdTAwMDAtXFx1MDBmZl0pLy50ZXN0KHRleHQpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGJhc2U2NCBlbmNvZGUgbm9uLUFTQ0lJIGNoYXJhY3RlcnMuJyk7XG5cdH1cblxuXHR2YXIgaSA9IDAsXG5cdFx0Y3VyLCBwcmV2LCBieXRlTnVtLFxuXHRcdHJlc3VsdCA9IFtdO1xuXG5cdHdoaWxlIChpIDwgdGV4dC5sZW5ndGgpIHtcblxuXHRcdGN1ciA9IHRleHQuY2hhckNvZGVBdChpKTtcblx0XHRieXRlTnVtID0gaSAlIDM7XG5cblx0XHRzd2l0Y2ggKGJ5dGVOdW0pIHtcblx0XHRjYXNlIDA6IC8vZmlyc3QgYnl0ZVxuXHRcdFx0cmVzdWx0LnB1c2goZGlnaXRzLmNoYXJBdChjdXIgPj4gMikpO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIDE6IC8vc2Vjb25kIGJ5dGVcblx0XHRcdHJlc3VsdC5wdXNoKGRpZ2l0cy5jaGFyQXQoKHByZXYgJiAzKSA8PCA0IHwgKGN1ciA+PiA0KSkpO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIDI6IC8vdGhpcmQgYnl0ZVxuXHRcdFx0cmVzdWx0LnB1c2goZGlnaXRzLmNoYXJBdCgocHJldiAmIDB4MGYpIDw8IDIgfCAoY3VyID4+IDYpKSk7XG5cdFx0XHRyZXN1bHQucHVzaChkaWdpdHMuY2hhckF0KGN1ciAmIDB4M2YpKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHByZXYgPSBjdXI7XG5cdFx0aSArPSAxO1xuXHR9XG5cblx0aWYgKGJ5dGVOdW0gPT09IDApIHtcblx0XHRyZXN1bHQucHVzaChkaWdpdHMuY2hhckF0KChwcmV2ICYgMykgPDwgNCkpO1xuXHRcdHJlc3VsdC5wdXNoKCc9PScpO1xuXHR9IGVsc2UgaWYgKGJ5dGVOdW0gPT09IDEpIHtcblx0XHRyZXN1bHQucHVzaChkaWdpdHMuY2hhckF0KChwcmV2ICYgMHgwZikgPDwgMikpO1xuXHRcdHJlc3VsdC5wdXNoKCc9Jyk7XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xufVxuXG4vKipcbiAqIEJhc2U2NC1kZWNvZGVzIGEgc3RyaW5nIG9mIHRleHQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRleHQgVGhlIHRleHQgdG8gZGVjb2RlLlxuICogQHJldHVybiB7c3RyaW5nfSBUaGUgYmFzZTY0LWRlY29kZWQgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBiYXNlNjREZWNvZGUodGV4dCkge1xuXG5cdC8vaWdub3JlIHdoaXRlIHNwYWNlXG5cdHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xccy9nLCAnJyk7XG5cblx0Ly9maXJzdCBjaGVjayBmb3IgYW55IHVuZXhwZWN0ZWQgaW5wdXRcblx0aWYgKCEoL15bYS16MC05XFwrXFwvXFxzXStcXD17MCwyfSQvaS50ZXN0KHRleHQpKSB8fCB0ZXh0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdOb3QgYSBiYXNlNjQtZW5jb2RlZCBzdHJpbmcuJyk7XG5cdH1cblxuXHQvL2xvY2FsIHZhcmlhYmxlc1xuXHR2YXIgY3VyLCBwcmV2LCBkaWdpdE51bSxcblx0XHRpID0gMCxcblx0XHRyZXN1bHQgPSBbXTtcblxuXHQvL3JlbW92ZSBhbnkgZXF1YWxzIHNpZ25zXG5cdHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcPS9nLCAnJyk7XG5cblx0Ly9sb29wIG92ZXIgZWFjaCBjaGFyYWN0ZXJcblx0d2hpbGUgKGkgPCB0ZXh0Lmxlbmd0aCkge1xuXG5cdFx0Y3VyID0gZGlnaXRzLmluZGV4T2YodGV4dC5jaGFyQXQoaSkpO1xuXHRcdGRpZ2l0TnVtID0gaSAlIDQ7XG5cblx0XHRzd2l0Y2ggKGRpZ2l0TnVtKSB7XG5cblx0XHQvL2Nhc2UgMDogZmlyc3QgZGlnaXQgLSBkbyBub3RoaW5nLCBub3QgZW5vdWdoIGluZm8gdG8gd29yayB3aXRoXG5cblx0XHRjYXNlIDE6IC8vc2Vjb25kIGRpZ2l0XG5cdFx0XHRyZXN1bHQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKHByZXYgPDwgMiB8IGN1ciA+PiA0KSk7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgMjogLy90aGlyZCBkaWdpdFxuXHRcdFx0cmVzdWx0LnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZSgocHJldiAmIDB4MGYpIDw8IDQgfCBjdXIgPj4gMikpO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIDM6IC8vZm91cnRoIGRpZ2l0XG5cdFx0XHRyZXN1bHQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKChwcmV2ICYgMykgPDwgNiB8IGN1cikpO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0cHJldiA9IGN1cjtcblx0XHRpICs9IDE7XG5cdH1cblxuXHQvL3JldHVybiBhIHN0cmluZ1xuXHRyZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRlbmNvZGU6IGJhc2U2NEVuY29kZSxcblx0ZGVjb2RlOiBiYXNlNjREZWNvZGVcbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuXHQvKipcblx0ICogRmluZCBvYmplY3RzIHdpdGhpbiBhIGdyYXBoIHRoZSBjb250YWluIGEgcHJvcGVydHkgb2YgYSBjZXJ0YWluIG5hbWUuXG5cdCAqXG5cdCAqIE5PVEU6IHRoaXMgbWV0aG9kIHdpbGwgbm90IGRpc2NvdmVyIG9iamVjdCBncmFwaCBjeWNsZXMuXG5cdCAqXG5cdCAqIEBwYXJhbSB7Kn0gb2JqIG9iamVjdCB0byBzZWFyY2ggb25cblx0ICogQHBhcmFtIHtzdHJpbmd9IHByb3AgbmFtZSBvZiB0aGUgcHJvcGVydHkgdG8gc2VhcmNoIGZvclxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSBmb3VuZCBwcm9wZXJ0aWVzIGFuZCB0aGVpciBwYXJlbnRcblx0ICovXG5cdGZpbmRQcm9wZXJ0aWVzOiBmdW5jdGlvbiBmaW5kUHJvcGVydGllcyhvYmosIHByb3AsIGNhbGxiYWNrKSB7XG5cdFx0aWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IG9iaiA9PT0gbnVsbCkgeyByZXR1cm47IH1cblx0XHRpZiAocHJvcCBpbiBvYmopIHtcblx0XHRcdGNhbGxiYWNrKG9ialtwcm9wXSwgb2JqLCBwcm9wKTtcblx0XHR9XG5cdFx0T2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdGZpbmRQcm9wZXJ0aWVzKG9ialtrZXldLCBwcm9wLCBjYWxsYmFjayk7XG5cdFx0fSk7XG5cdH1cblxufTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBhdHRlbXB0ID0gcmVxdWlyZSgnLi9hdHRlbXB0Jyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgcHJvbWlzZSB3aG9zZSB3b3JrIGlzIHN0YXJ0ZWQgb25seSB3aGVuIGEgaGFuZGxlciBpcyByZWdpc3RlcmVkLlxuICpcbiAqIFRoZSB3b3JrIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBhdCBtb3N0IG9uY2UuIFRocm93biB2YWx1ZXMgd2lsbCByZXN1bHRcbiAqIGluIHByb21pc2UgcmVqZWN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHdvcmsgZnVuY3Rpb24gd2hvc2Ugb3VwdXQgaXMgdXNlZCB0byByZXNvbHZlIHRoZVxuICogICByZXR1cm5lZCBwcm9taXNlLlxuICogQHJldHVybnMge1Byb21pc2V9IGEgbGF6eSBwcm9taXNlXG4gKi9cbmZ1bmN0aW9uIGxhenlQcm9taXNlKHdvcmspIHtcblx0dmFyIHN0YXJ0ZWQsIHJlc29sdmVyLCBwcm9taXNlLCB0aGVuO1xuXG5cdHN0YXJ0ZWQgPSBmYWxzZTtcblxuXHRwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdHJlc29sdmVyID0ge1xuXHRcdFx0cmVzb2x2ZTogcmVzb2x2ZSxcblx0XHRcdHJlamVjdDogcmVqZWN0XG5cdFx0fTtcblx0fSk7XG5cdHRoZW4gPSBwcm9taXNlLnRoZW47XG5cblx0cHJvbWlzZS50aGVuID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmICghc3RhcnRlZCkge1xuXHRcdFx0c3RhcnRlZCA9IHRydWU7XG5cdFx0XHRhdHRlbXB0KHdvcmspLnRoZW4ocmVzb2x2ZXIucmVzb2x2ZSwgcmVzb2x2ZXIucmVqZWN0KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoZW4uYXBwbHkocHJvbWlzZSwgYXJndW1lbnRzKTtcblx0fTtcblxuXHRyZXR1cm4gcHJvbWlzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsYXp5UHJvbWlzZTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbXB0eSA9IHt9O1xuXG4vKipcbiAqIE1peCB0aGUgcHJvcGVydGllcyBmcm9tIHRoZSBzb3VyY2Ugb2JqZWN0IGludG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqIFdoZW4gdGhlIHNhbWUgcHJvcGVydHkgb2NjdXJzIGluIG1vcmUgdGhlbiBvbmUgb2JqZWN0LCB0aGUgcmlnaHQgbW9zdFxuICogdmFsdWUgd2lucy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGVzdCB0aGUgb2JqZWN0IHRvIGNvcHkgcHJvcGVydGllcyB0b1xuICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZXMgdGhlIG9iamVjdHMgdG8gY29weSBwcm9wZXJ0aWVzIGZyb20uICBNYXkgYmUgMSB0byBOIGFyZ3VtZW50cywgYnV0IG5vdCBhbiBBcnJheS5cbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIGRlc3RpbmF0aW9uIG9iamVjdFxuICovXG5mdW5jdGlvbiBtaXhpbihkZXN0IC8qLCBzb3VyY2VzLi4uICovKSB7XG5cdHZhciBpLCBsLCBzb3VyY2UsIG5hbWU7XG5cblx0aWYgKCFkZXN0KSB7IGRlc3QgPSB7fTsgfVxuXHRmb3IgKGkgPSAxLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuXHRcdHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblx0XHRmb3IgKG5hbWUgaW4gc291cmNlKSB7XG5cdFx0XHRpZiAoIShuYW1lIGluIGRlc3QpIHx8IChkZXN0W25hbWVdICE9PSBzb3VyY2VbbmFtZV0gJiYgKCEobmFtZSBpbiBlbXB0eSkgfHwgZW1wdHlbbmFtZV0gIT09IHNvdXJjZVtuYW1lXSkpKSB7XG5cdFx0XHRcdGRlc3RbbmFtZV0gPSBzb3VyY2VbbmFtZV07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGRlc3Q7IC8vIE9iamVjdFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1peGluO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTYgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBOb3JtYWxpemUgSFRUUCBoZWFkZXIgbmFtZXMgdXNpbmcgdGhlIHBzZXVkbyBjYW1lbCBjYXNlLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICogICBjb250ZW50LXR5cGUgICAgICAgICAtPiBDb250ZW50LVR5cGVcbiAqICAgYWNjZXB0cyAgICAgICAgICAgICAgLT4gQWNjZXB0c1xuICogICB4LWN1c3RvbS1oZWFkZXItbmFtZSAtPiBYLUN1c3RvbS1IZWFkZXItTmFtZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSByYXcgaGVhZGVyIG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gdGhlIG5vcm1hbGl6ZWQgaGVhZGVyIG5hbWVcbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplSGVhZGVyTmFtZShuYW1lKSB7XG5cdHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcblx0XHQuc3BsaXQoJy0nKVxuXHRcdC5tYXAoZnVuY3Rpb24gKGNodW5rKSB7IHJldHVybiBjaHVuay5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNodW5rLnNsaWNlKDEpOyB9KVxuXHRcdC5qb2luKCctJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbm9ybWFsaXplSGVhZGVyTmFtZTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNC0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qanNoaW50IGxhdGVkZWY6IG5vZnVuYyAqL1xuXG52YXIgbm9ybWFsaXplSGVhZGVyTmFtZSA9IHJlcXVpcmUoJy4vbm9ybWFsaXplSGVhZGVyTmFtZScpO1xuXG5mdW5jdGlvbiBwcm9wZXJ0eShwcm9taXNlLCBuYW1lKSB7XG5cdHJldHVybiBwcm9taXNlLnRoZW4oXG5cdFx0ZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gdmFsdWUgJiYgdmFsdWVbbmFtZV07XG5cdFx0fSxcblx0XHRmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCh2YWx1ZSAmJiB2YWx1ZVtuYW1lXSk7XG5cdFx0fVxuXHQpO1xufVxuXG4vKipcbiAqIE9idGFpbiB0aGUgcmVzcG9uc2UgZW50aXR5XG4gKlxuICogQHJldHVybnMge1Byb21pc2V9IGZvciB0aGUgcmVzcG9uc2UgZW50aXR5XG4gKi9cbmZ1bmN0aW9uIGVudGl0eSgpIHtcblx0Lypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cblx0cmV0dXJuIHByb3BlcnR5KHRoaXMsICdlbnRpdHknKTtcbn1cblxuLyoqXG4gKiBPYnRhaW4gdGhlIHJlc3BvbnNlIHN0YXR1c1xuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBmb3IgdGhlIHJlc3BvbnNlIHN0YXR1c1xuICovXG5mdW5jdGlvbiBzdGF0dXMoKSB7XG5cdC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG5cdHJldHVybiBwcm9wZXJ0eShwcm9wZXJ0eSh0aGlzLCAnc3RhdHVzJyksICdjb2RlJyk7XG59XG5cbi8qKlxuICogT2J0YWluIHRoZSByZXNwb25zZSBoZWFkZXJzIG1hcFxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBmb3IgdGhlIHJlc3BvbnNlIGhlYWRlcnMgbWFwXG4gKi9cbmZ1bmN0aW9uIGhlYWRlcnMoKSB7XG5cdC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG5cdHJldHVybiBwcm9wZXJ0eSh0aGlzLCAnaGVhZGVycycpO1xufVxuXG4vKipcbiAqIE9idGFpbiBhIHNwZWNpZmljIHJlc3BvbnNlIGhlYWRlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZWFkZXJOYW1lIHRoZSBoZWFkZXIgdG8gcmV0cmlldmVcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBmb3IgdGhlIHJlc3BvbnNlIGhlYWRlcidzIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIGhlYWRlcihoZWFkZXJOYW1lKSB7XG5cdC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG5cdGhlYWRlck5hbWUgPSBub3JtYWxpemVIZWFkZXJOYW1lKGhlYWRlck5hbWUpO1xuXHRyZXR1cm4gcHJvcGVydHkodGhpcy5oZWFkZXJzKCksIGhlYWRlck5hbWUpO1xufVxuXG4vKipcbiAqIEZvbGxvdyBhIHJlbGF0ZWQgcmVzb3VyY2VcbiAqXG4gKiBUaGUgcmVsYXRpb25zaGlwIHRvIGZvbGxvdyBtYXkgYmUgZGVmaW5lIGFzIGEgcGxhaW4gc3RyaW5nLCBhbiBvYmplY3RcbiAqIHdpdGggdGhlIHJlbCBhbmQgcGFyYW1zLCBvciBhbiBhcnJheSBjb250YWluaW5nIG9uZSBvciBtb3JlIGVudHJpZXNcbiAqIHdpdGggdGhlIHByZXZpb3VzIGZvcm1zLlxuICpcbiAqIEV4YW1wbGVzOlxuICogICByZXNwb25zZS5mb2xsb3coJ25leHQnKVxuICpcbiAqICAgcmVzcG9uc2UuZm9sbG93KHsgcmVsOiAnbmV4dCcsIHBhcmFtczogeyBwYWdlU2l6ZTogMTAwIH0gfSlcbiAqXG4gKiAgIHJlc3BvbnNlLmZvbGxvdyhbXG4gKiAgICAgICB7IHJlbDogJ2l0ZW1zJywgcGFyYW1zOiB7IHByb2plY3Rpb246ICdub0ltYWdlcycgfSB9LFxuICogICAgICAgJ3NlYXJjaCcsXG4gKiAgICAgICB7IHJlbDogJ2ZpbmRCeUdhbGxlcnlJc051bGwnLCBwYXJhbXM6IHsgcHJvamVjdGlvbjogJ25vSW1hZ2VzJyB9IH0sXG4gKiAgICAgICAnaXRlbXMnXG4gKiAgIF0pXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fEFycmF5fSByZWxzIG9uZSwgb3IgbW9yZSwgcmVsYXRpb25zaGlwcyB0byBmb2xsb3dcbiAqIEByZXR1cm5zIFJlc3BvbnNlUHJvbWlzZTxSZXNwb25zZT4gcmVsYXRlZCByZXNvdXJjZVxuICovXG5mdW5jdGlvbiBmb2xsb3cocmVscykge1xuXHQvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuXHRyZWxzID0gW10uY29uY2F0KHJlbHMpO1xuXG5cdHJldHVybiBtYWtlKHJlbHMucmVkdWNlKGZ1bmN0aW9uIChyZXNwb25zZSwgcmVsKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cdFx0XHRpZiAodHlwZW9mIHJlbCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0cmVsID0geyByZWw6IHJlbCB9O1xuXHRcdFx0fVxuXHRcdFx0aWYgKHR5cGVvZiByZXNwb25zZS5lbnRpdHkuY2xpZW50Rm9yICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignSHlwZXJtZWRpYSByZXNwb25zZSBleHBlY3RlZCcpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGNsaWVudCA9IHJlc3BvbnNlLmVudGl0eS5jbGllbnRGb3IocmVsLnJlbCk7XG5cdFx0XHRyZXR1cm4gY2xpZW50KHsgcGFyYW1zOiByZWwucGFyYW1zIH0pO1xuXHRcdH0pO1xuXHR9LCB0aGlzKSk7XG59XG5cbi8qKlxuICogV3JhcCBhIFByb21pc2UgYXMgYW4gUmVzcG9uc2VQcm9taXNlXG4gKlxuICogQHBhcmFtIHtQcm9taXNlPFJlc3BvbnNlPn0gcHJvbWlzZSB0aGUgcHJvbWlzZSBmb3IgYW4gSFRUUCBSZXNwb25zZVxuICogQHJldHVybnMge1Jlc3BvbnNlUHJvbWlzZTxSZXNwb25zZT59IHdyYXBwZWQgcHJvbWlzZSBmb3IgUmVzcG9uc2Ugd2l0aCBhZGRpdGlvbmFsIGhlbHBlciBtZXRob2RzXG4gKi9cbmZ1bmN0aW9uIG1ha2UocHJvbWlzZSkge1xuXHRwcm9taXNlLnN0YXR1cyA9IHN0YXR1cztcblx0cHJvbWlzZS5oZWFkZXJzID0gaGVhZGVycztcblx0cHJvbWlzZS5oZWFkZXIgPSBoZWFkZXI7XG5cdHByb21pc2UuZW50aXR5ID0gZW50aXR5O1xuXHRwcm9taXNlLmZvbGxvdyA9IGZvbGxvdztcblx0cmV0dXJuIHByb21pc2U7XG59XG5cbmZ1bmN0aW9uIHJlc3BvbnNlUHJvbWlzZShvYmosIGNhbGxiYWNrLCBlcnJiYWNrKSB7XG5cdHJldHVybiBtYWtlKFByb21pc2UucmVzb2x2ZShvYmopLnRoZW4oY2FsbGJhY2ssIGVycmJhY2spKTtcbn1cblxucmVzcG9uc2VQcm9taXNlLm1ha2UgPSBtYWtlO1xucmVzcG9uc2VQcm9taXNlLnJlamVjdCA9IGZ1bmN0aW9uICh2YWwpIHtcblx0cmV0dXJuIG1ha2UoUHJvbWlzZS5yZWplY3QodmFsKSk7XG59O1xucmVzcG9uc2VQcm9taXNlLnByb21pc2UgPSBmdW5jdGlvbiAoZnVuYykge1xuXHRyZXR1cm4gbWFrZShuZXcgUHJvbWlzZShmdW5jKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3BvbnNlUHJvbWlzZTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNS0yMDE2IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjaGFyTWFwO1xuXG5jaGFyTWFwID0gKGZ1bmN0aW9uICgpIHtcblx0dmFyIHN0cmluZ3MgPSB7XG5cdFx0YWxwaGE6ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jyxcblx0XHRkaWdpdDogJzAxMjM0NTY3ODknXG5cdH07XG5cblx0c3RyaW5ncy5nZW5EZWxpbXMgPSAnOi8/I1tdQCc7XG5cdHN0cmluZ3Muc3ViRGVsaW1zID0gJyEkJlxcJygpKissOz0nO1xuXHRzdHJpbmdzLnJlc2VydmVkID0gc3RyaW5ncy5nZW5EZWxpbXMgKyBzdHJpbmdzLnN1YkRlbGltcztcblx0c3RyaW5ncy51bnJlc2VydmVkID0gc3RyaW5ncy5hbHBoYSArIHN0cmluZ3MuZGlnaXQgKyAnLS5ffic7XG5cdHN0cmluZ3MudXJsID0gc3RyaW5ncy5yZXNlcnZlZCArIHN0cmluZ3MudW5yZXNlcnZlZDtcblx0c3RyaW5ncy5zY2hlbWUgPSBzdHJpbmdzLmFscGhhICsgc3RyaW5ncy5kaWdpdCArICcrLS4nO1xuXHRzdHJpbmdzLnVzZXJpbmZvID0gc3RyaW5ncy51bnJlc2VydmVkICsgc3RyaW5ncy5zdWJEZWxpbXMgKyAnOic7XG5cdHN0cmluZ3MuaG9zdCA9IHN0cmluZ3MudW5yZXNlcnZlZCArIHN0cmluZ3Muc3ViRGVsaW1zO1xuXHRzdHJpbmdzLnBvcnQgPSBzdHJpbmdzLmRpZ2l0O1xuXHRzdHJpbmdzLnBjaGFyID0gc3RyaW5ncy51bnJlc2VydmVkICsgc3RyaW5ncy5zdWJEZWxpbXMgKyAnOkAnO1xuXHRzdHJpbmdzLnNlZ21lbnQgPSBzdHJpbmdzLnBjaGFyO1xuXHRzdHJpbmdzLnBhdGggPSBzdHJpbmdzLnNlZ21lbnQgKyAnLyc7XG5cdHN0cmluZ3MucXVlcnkgPSBzdHJpbmdzLnBjaGFyICsgJy8/Jztcblx0c3RyaW5ncy5mcmFnbWVudCA9IHN0cmluZ3MucGNoYXIgKyAnLz8nO1xuXG5cdHJldHVybiBPYmplY3Qua2V5cyhzdHJpbmdzKS5yZWR1Y2UoZnVuY3Rpb24gKGNoYXJNYXAsIHNldCkge1xuXHRcdGNoYXJNYXBbc2V0XSA9IHN0cmluZ3Nbc2V0XS5zcGxpdCgnJykucmVkdWNlKGZ1bmN0aW9uIChjaGFycywgbXlDaGFyKSB7XG5cdFx0XHRjaGFyc1tteUNoYXJdID0gdHJ1ZTtcblx0XHRcdHJldHVybiBjaGFycztcblx0XHR9LCB7fSk7XG5cdFx0cmV0dXJuIGNoYXJNYXA7XG5cdH0sIHt9KTtcbn0oKSk7XG5cbmZ1bmN0aW9uIGVuY29kZShzdHIsIGFsbG93ZWQpIHtcblx0aWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdTdHJpbmcgcmVxdWlyZWQgZm9yIFVSTCBlbmNvZGluZycpO1xuXHR9XG5cdHJldHVybiBzdHIuc3BsaXQoJycpLm1hcChmdW5jdGlvbiAobXlDaGFyKSB7XG5cdFx0aWYgKGFsbG93ZWQuaGFzT3duUHJvcGVydHkobXlDaGFyKSkge1xuXHRcdFx0cmV0dXJuIG15Q2hhcjtcblx0XHR9XG5cdFx0dmFyIGNvZGUgPSBteUNoYXIuY2hhckNvZGVBdCgwKTtcblx0XHRpZiAoY29kZSA8PSAxMjcpIHtcblx0XHRcdHZhciBlbmNvZGVkID0gY29kZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcbiBcdFx0XHRyZXR1cm4gJyUnICsgKGVuY29kZWQubGVuZ3RoICUgMiA9PT0gMSA/ICcwJyA6ICcnKSArIGVuY29kZWQ7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChteUNoYXIpLnRvVXBwZXJDYXNlKCk7XG5cdFx0fVxuXHR9KS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gbWFrZUVuY29kZXIoYWxsb3dlZCkge1xuXHRhbGxvd2VkID0gYWxsb3dlZCB8fCBjaGFyTWFwLnVucmVzZXJ2ZWQ7XG5cdHJldHVybiBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0cmV0dXJuIGVuY29kZShzdHIsIGFsbG93ZWQpO1xuXHR9O1xufVxuXG5mdW5jdGlvbiBkZWNvZGUoc3RyKSB7XG5cdHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cblx0Lypcblx0ICogRGVjb2RlIFVSTCBlbmNvZGVkIHN0cmluZ3Ncblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZGVjb2RlZCBzdHJpbmdcblx0ICovXG5cdGRlY29kZTogZGVjb2RlLFxuXG5cdC8qXG5cdCAqIFVSTCBlbmNvZGUgYSBzdHJpbmdcblx0ICpcblx0ICogQWxsIGJ1dCBhbHBoYS1udW1lcmljcyBhbmQgYSB2ZXJ5IGxpbWl0ZWQgc2V0IG9mIHB1bmN0dWF0aW9uIC0gLiBfIH4gYXJlXG5cdCAqIGVuY29kZWQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHQgKi9cblx0ZW5jb2RlOiBtYWtlRW5jb2RlcigpLFxuXG5cdC8qXG5cdCogVVJMIGVuY29kZSBhIFVSTFxuXHQqXG5cdCogQWxsIGNoYXJhY3RlciBwZXJtaXR0ZWQgYW55d2hlcmUgaW4gYSBVUkwgYXJlIGxlZnQgdW5lbmNvZGVkIGV2ZW5cblx0KiBpZiB0aGF0IGNoYXJhY3RlciBpcyBub3QgcGVybWl0dGVkIGluIHRoYXQgcG9ydGlvbiBvZiBhIFVSTC5cblx0KlxuXHQqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIHR5cGljYWxseSBub3Qgd2hhdCB5b3Ugd2FudC5cblx0KlxuXHQqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdCogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdCovXG5cdGVuY29kZVVSTDogbWFrZUVuY29kZXIoY2hhck1hcC51cmwpLFxuXG5cdC8qXG5cdCAqIFVSTCBlbmNvZGUgdGhlIHNjaGVtZSBwb3J0aW9uIG9mIGEgVVJMXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHQgKi9cblx0ZW5jb2RlU2NoZW1lOiBtYWtlRW5jb2RlcihjaGFyTWFwLnNjaGVtZSksXG5cblx0Lypcblx0ICogVVJMIGVuY29kZSB0aGUgdXNlciBpbmZvIHBvcnRpb24gb2YgYSBVUkxcblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0ICogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdCAqL1xuXHRlbmNvZGVVc2VySW5mbzogbWFrZUVuY29kZXIoY2hhck1hcC51c2VyaW5mbyksXG5cblx0Lypcblx0ICogVVJMIGVuY29kZSB0aGUgaG9zdCBwb3J0aW9uIG9mIGEgVVJMXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHQgKi9cblx0ZW5jb2RlSG9zdDogbWFrZUVuY29kZXIoY2hhck1hcC5ob3N0KSxcblxuXHQvKlxuXHQgKiBVUkwgZW5jb2RlIHRoZSBwb3J0IHBvcnRpb24gb2YgYSBVUkxcblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0ICogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdCAqL1xuXHRlbmNvZGVQb3J0OiBtYWtlRW5jb2RlcihjaGFyTWFwLnBvcnQpLFxuXG5cdC8qXG5cdCAqIFVSTCBlbmNvZGUgYSBwYXRoIHNlZ21lbnQgcG9ydGlvbiBvZiBhIFVSTFxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0ICovXG5cdGVuY29kZVBhdGhTZWdtZW50OiBtYWtlRW5jb2RlcihjaGFyTWFwLnNlZ21lbnQpLFxuXG5cdC8qXG5cdCAqIFVSTCBlbmNvZGUgdGhlIHBhdGggcG9ydGlvbiBvZiBhIFVSTFxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0ICovXG5cdGVuY29kZVBhdGg6IG1ha2VFbmNvZGVyKGNoYXJNYXAucGF0aCksXG5cblx0Lypcblx0ICogVVJMIGVuY29kZSB0aGUgcXVlcnkgcG9ydGlvbiBvZiBhIFVSTFxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0ICovXG5cdGVuY29kZVF1ZXJ5OiBtYWtlRW5jb2RlcihjaGFyTWFwLnF1ZXJ5KSxcblxuXHQvKlxuXHQgKiBVUkwgZW5jb2RlIHRoZSBmcmFnbWVudCBwb3J0aW9uIG9mIGEgVVJMXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHQgKi9cblx0ZW5jb2RlRnJhZ21lbnQ6IG1ha2VFbmNvZGVyKGNoYXJNYXAuZnJhZ21lbnQpXG5cbn07XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUtMjAxNiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXJpRW5jb2Rlciwgb3BlcmF0aW9ucywgcHJlZml4UkU7XG5cbnVyaUVuY29kZXIgPSByZXF1aXJlKCcuL3VyaUVuY29kZXInKTtcblxucHJlZml4UkUgPSAvXihbXjpdKik6KFswLTldKykkLztcbm9wZXJhdGlvbnMgPSB7XG5cdCcnOiAgeyBmaXJzdDogJycsICBzZXBhcmF0b3I6ICcsJywgbmFtZWQ6IGZhbHNlLCBlbXB0eTogJycsICBlbmNvZGVyOiB1cmlFbmNvZGVyLmVuY29kZSB9LFxuXHQnKyc6IHsgZmlyc3Q6ICcnLCAgc2VwYXJhdG9yOiAnLCcsIG5hbWVkOiBmYWxzZSwgZW1wdHk6ICcnLCAgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGVVUkwgfSxcblx0JyMnOiB7IGZpcnN0OiAnIycsIHNlcGFyYXRvcjogJywnLCBuYW1lZDogZmFsc2UsIGVtcHR5OiAnJywgIGVuY29kZXI6IHVyaUVuY29kZXIuZW5jb2RlVVJMIH0sXG5cdCcuJzogeyBmaXJzdDogJy4nLCBzZXBhcmF0b3I6ICcuJywgbmFtZWQ6IGZhbHNlLCBlbXB0eTogJycsICBlbmNvZGVyOiB1cmlFbmNvZGVyLmVuY29kZSB9LFxuXHQnLyc6IHsgZmlyc3Q6ICcvJywgc2VwYXJhdG9yOiAnLycsIG5hbWVkOiBmYWxzZSwgZW1wdHk6ICcnLCAgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGUgfSxcblx0JzsnOiB7IGZpcnN0OiAnOycsIHNlcGFyYXRvcjogJzsnLCBuYW1lZDogdHJ1ZSwgIGVtcHR5OiAnJywgIGVuY29kZXI6IHVyaUVuY29kZXIuZW5jb2RlIH0sXG5cdCc/JzogeyBmaXJzdDogJz8nLCBzZXBhcmF0b3I6ICcmJywgbmFtZWQ6IHRydWUsICBlbXB0eTogJz0nLCBlbmNvZGVyOiB1cmlFbmNvZGVyLmVuY29kZSB9LFxuXHQnJic6IHsgZmlyc3Q6ICcmJywgc2VwYXJhdG9yOiAnJicsIG5hbWVkOiB0cnVlLCAgZW1wdHk6ICc9JywgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGUgfSxcblx0Jz0nOiB7IHJlc2VydmVkOiB0cnVlIH0sXG5cdCcsJzogeyByZXNlcnZlZDogdHJ1ZSB9LFxuXHQnISc6IHsgcmVzZXJ2ZWQ6IHRydWUgfSxcblx0J0AnOiB7IHJlc2VydmVkOiB0cnVlIH0sXG5cdCd8JzogeyByZXNlcnZlZDogdHJ1ZSB9XG59O1xuXG5mdW5jdGlvbiBhcHBseShvcGVyYXRpb24sIGV4cHJlc3Npb24sIHBhcmFtcykge1xuXHQvKmpzaGludCBtYXhjb21wbGV4aXR5OjExICovXG5cdHJldHVybiBleHByZXNzaW9uLnNwbGl0KCcsJykucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZhcmlhYmxlKSB7XG5cdFx0dmFyIG9wdHMsIHZhbHVlO1xuXG5cdFx0b3B0cyA9IHt9O1xuXHRcdGlmICh2YXJpYWJsZS5zbGljZSgtMSkgPT09ICcqJykge1xuXHRcdFx0dmFyaWFibGUgPSB2YXJpYWJsZS5zbGljZSgwLCAtMSk7XG5cdFx0XHRvcHRzLmV4cGxvZGUgPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAocHJlZml4UkUudGVzdCh2YXJpYWJsZSkpIHtcblx0XHRcdHZhciBwcmVmaXggPSBwcmVmaXhSRS5leGVjKHZhcmlhYmxlKTtcblx0XHRcdHZhcmlhYmxlID0gcHJlZml4WzFdO1xuXHRcdFx0b3B0cy5tYXhMZW5ndGggPSBwYXJzZUludChwcmVmaXhbMl0pO1xuXHRcdH1cblxuXHRcdHZhcmlhYmxlID0gdXJpRW5jb2Rlci5kZWNvZGUodmFyaWFibGUpO1xuXHRcdHZhbHVlID0gcGFyYW1zW3ZhcmlhYmxlXTtcblxuXHRcdGlmICh2YWx1ZSA9PT0gdm9pZCAwIHx8IHZhbHVlID09PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0XHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcblx0XHRcdHJlc3VsdCA9IHZhbHVlLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2YWx1ZSkge1xuXHRcdFx0XHRpZiAocmVzdWx0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdHJlc3VsdCArPSBvcHRzLmV4cGxvZGUgPyBvcGVyYXRpb24uc2VwYXJhdG9yIDogJywnO1xuXHRcdFx0XHRcdGlmIChvcGVyYXRpb24ubmFtZWQgJiYgb3B0cy5leHBsb2RlKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFyaWFibGUpO1xuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IHZhbHVlLmxlbmd0aCA/ICc9JyA6IG9wZXJhdGlvbi5lbXB0eTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5maXJzdDtcblx0XHRcdFx0XHRpZiAob3BlcmF0aW9uLm5hbWVkKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFyaWFibGUpO1xuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IHZhbHVlLmxlbmd0aCA/ICc9JyA6IG9wZXJhdGlvbi5lbXB0eTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhbHVlKTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sIHJlc3VsdCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdHJlc3VsdCA9IE9iamVjdC5rZXlzKHZhbHVlKS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgbmFtZSkge1xuXHRcdFx0XHRpZiAocmVzdWx0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdHJlc3VsdCArPSBvcHRzLmV4cGxvZGUgPyBvcGVyYXRpb24uc2VwYXJhdG9yIDogJywnO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdCArPSBvcGVyYXRpb24uZmlyc3Q7XG5cdFx0XHRcdFx0aWYgKG9wZXJhdGlvbi5uYW1lZCAmJiAhb3B0cy5leHBsb2RlKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFyaWFibGUpO1xuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IHZhbHVlW25hbWVdLmxlbmd0aCA/ICc9JyA6IG9wZXJhdGlvbi5lbXB0eTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKG5hbWUpO1xuXHRcdFx0XHRyZXN1bHQgKz0gb3B0cy5leHBsb2RlID8gJz0nIDogJywnO1xuXHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFsdWVbbmFtZV0pO1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fSwgcmVzdWx0KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR2YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG5cdFx0XHRpZiAob3B0cy5tYXhMZW5ndGgpIHtcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZS5zbGljZSgwLCBvcHRzLm1heExlbmd0aCk7XG5cdFx0XHR9XG5cdFx0XHRyZXN1bHQgKz0gcmVzdWx0Lmxlbmd0aCA/IG9wZXJhdGlvbi5zZXBhcmF0b3IgOiBvcGVyYXRpb24uZmlyc3Q7XG5cdFx0XHRpZiAob3BlcmF0aW9uLm5hbWVkKSB7XG5cdFx0XHRcdHJlc3VsdCArPSBvcGVyYXRpb24uZW5jb2Rlcih2YXJpYWJsZSk7XG5cdFx0XHRcdHJlc3VsdCArPSB2YWx1ZS5sZW5ndGggPyAnPScgOiBvcGVyYXRpb24uZW1wdHk7XG5cdFx0XHR9XG5cdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFsdWUpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sICcnKTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kRXhwcmVzc2lvbihleHByZXNzaW9uLCBwYXJhbXMpIHtcblx0dmFyIG9wZXJhdGlvbjtcblxuXHRvcGVyYXRpb24gPSBvcGVyYXRpb25zW2V4cHJlc3Npb24uc2xpY2UoMCwxKV07XG5cdGlmIChvcGVyYXRpb24pIHtcblx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi5zbGljZSgxKTtcblx0fVxuXHRlbHNlIHtcblx0XHRvcGVyYXRpb24gPSBvcGVyYXRpb25zWycnXTtcblx0fVxuXG5cdGlmIChvcGVyYXRpb24ucmVzZXJ2ZWQpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Jlc2VydmVkIGV4cHJlc3Npb24gb3BlcmF0aW9ucyBhcmUgbm90IHN1cHBvcnRlZCcpO1xuXHR9XG5cblx0cmV0dXJuIGFwcGx5KG9wZXJhdGlvbiwgZXhwcmVzc2lvbiwgcGFyYW1zKTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kVGVtcGxhdGUodGVtcGxhdGUsIHBhcmFtcykge1xuXHR2YXIgc3RhcnQsIGVuZCwgdXJpO1xuXG5cdHVyaSA9ICcnO1xuXHRlbmQgPSAwO1xuXHR3aGlsZSAodHJ1ZSkge1xuXHRcdHN0YXJ0ID0gdGVtcGxhdGUuaW5kZXhPZigneycsIGVuZCk7XG5cdFx0aWYgKHN0YXJ0ID09PSAtMSkge1xuXHRcdFx0Ly8gbm8gbW9yZSBleHByZXNzaW9uc1xuXHRcdFx0dXJpICs9IHRlbXBsYXRlLnNsaWNlKGVuZCk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0dXJpICs9IHRlbXBsYXRlLnNsaWNlKGVuZCwgc3RhcnQpO1xuXHRcdGVuZCA9IHRlbXBsYXRlLmluZGV4T2YoJ30nLCBzdGFydCkgKyAxO1xuXHRcdHVyaSArPSBleHBhbmRFeHByZXNzaW9uKHRlbXBsYXRlLnNsaWNlKHN0YXJ0ICsgMSwgZW5kIC0gMSksIHBhcmFtcyk7XG5cdH1cblxuXHRyZXR1cm4gdXJpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuXHQvKipcblx0ICogRXhwYW5kIGEgVVJJIFRlbXBsYXRlIHdpdGggcGFyYW1ldGVycyB0byBmb3JtIGEgVVJJLlxuXHQgKlxuXHQgKiBGdWxsIGltcGxlbWVudGF0aW9uIChsZXZlbCA0KSBvZiByZmM2NTcwLlxuXHQgKiBAc2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2NTcwXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZW1wbGF0ZSBVUkkgdGVtcGxhdGVcblx0ICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIHBhcmFtcyB0byBhcHBseSB0byB0aGUgdGVtcGxhdGUgZHVycmluZyBleHBhbnRpb25cblx0ICogQHJldHVybnMge3N0cmluZ30gZXhwYW5kZWQgVVJJXG5cdCAqL1xuXHRleHBhbmQ6IGV4cGFuZFRlbXBsYXRlXG5cbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19
