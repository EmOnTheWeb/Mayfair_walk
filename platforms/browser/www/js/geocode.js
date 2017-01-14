module.exports = function(address_array) { //takes in array of strings

	var MapboxClient = require('mapbox/lib/services/geocoding'); 
	var client = new MapboxClient('pk.eyJ1IjoiZW1pbGllZGFubmVuYmVyZyIsImEiOiJjaXhmOTB6ZnowMDAwMnVzaDVkcnpsY2M1In0.33yDwUq670jHD8flKjzqxg');

	var coordinate_array = []; 

	for(var i=0; i<address_array.length; i++) {
		client.geocodeForward(address_array[i], {
			// dataset:'mapbox.places-permanent' (need special permission for batch geocoding)
		},function(err, res) {
	  		// res is the geocoding result as parsed JSON
	  		console.log(res); 
		});
	}
}







