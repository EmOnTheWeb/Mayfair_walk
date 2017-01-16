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