// var geocode = require('./geocode.js'); //returns a function that geocodes addresses, returns coordinates

// var coordinates = geocode([
// 						'Piccadilly Circus Tube Station, London',
// 						'Albany Piccadilly Mayfair London, W1J',
// 						'Burlington Arcade Burlington House 0BG Piccadilly, London W1J'
// 				  	]); //pass addresses and waypoints to the function

var processGPX = require('./process_gpx.js'); 

processGPX('house_to_tube.gpx',retrieveCoordinates); 


function retrieveCoordinates(coordinates) {
	
	// var getDirections = require('directions.js'); 

	// var turn_by_turn = getDirections(coordinates); 

}; 




// var get_directions = require('directions.js'); //returns a function that returns turn by turn directions

// var turn_by_turn = get_directions(coordinates); //get turn by turn directions with geocoded coordinates; 
