module.exports = function(array) { //takes in array of strings

	var MapboxClient = require('mapbox/lib/services/geocoding'); 
	var client = new MapboxClient('pk.eyJ1IjoiZW1pbGllZGFubmVuYmVyZyIsImEiOiJjaXhmOTB6ZnowMDAwMnVzaDVkcnpsY2M1In0.33yDwUq670jHD8flKjzqxg');

	client.geocodeForward('Paris,France', {
		// dataset:'mapbox.places-permanent'
	},function(err, res) {
  		// res is the geocoding result as parsed JSON
  		console.log(res); 
	});
}







