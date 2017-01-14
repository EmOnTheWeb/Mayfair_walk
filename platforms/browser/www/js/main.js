var geocode = require('./geocode.js'); //returns a function that geocodes addresses, returns coordinates

var coordinates = geocode([
						'Piccadilly Circus, London W1J 9HS',
						'Albany, Piccadilly, Mayfair, London, W1J',
						'Burlington Arcade, Burlington House, 0BG, Piccadilly, London W1J'
				  	]); //pass addresses and waypoints to the function

// var get_directions = require('directions.js'); //returns a function that returns turn by turn directions

// var turn_by_turn = get_directions(coordinates); //get turn by turn directions with geocoded coordinates; 
