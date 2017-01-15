module.exports = function(coordinates,callback) {

	var MapboxClient = require('mapbox/lib/services/directions'); 
	var client = new MapboxClient('pk.eyJ1IjoiZW1pbGllZGFubmVuYmVyZyIsImEiOiJjaXhmOTB6ZnowMDAwMnVzaDVkcnpsY2M1In0.33yDwUq670jHD8flKjzqxg');

	client.getDirections([
		  { latitude: 33.6875431, longitude: -95.4431142 },
		  { latitude: 33.6875431, longitude: -95.4831142 }
		], {
		  profile: 'mapbox.walking',
		  instructions: 'html',
		  alternatives: false,
		  geometry: 'polyline'
		}, function(err, results) {
		   		
		   		if(typeof callback == 'function') {
		   			callback(results); 
		   		}
		});



}