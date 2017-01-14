var geocode = require('geocode.js'); //returns a function that geocodes addresses, returns coordinates

var coordinates = geocode(); //pass addresses and waypoints to the function

var get_directions = require('directions.js'); //returns a function that returns turn by turn directions

var turn_by_turn = get_directions(coordinates); //get turn by turn directions with geocoded coordinates; 
