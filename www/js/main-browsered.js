(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// var geocode = require('./geocode.js'); //returns a function that geocodes addresses, returns coordinates

// var coordinates = geocode([
// 						'Piccadilly Circus Tube Station, London',
// 						'Albany Piccadilly Mayfair London, W1J',
// 						'Burlington Arcade Burlington House 0BG Piccadilly, London W1J'
// 				  	]); //pass addresses and waypoints to the function

var process_gpx = require('./process_gpx.js'); 

var coordinates = process_gpx('house_to_tube.gpx'); 

console.log(coordinates); 

// var get_directions = require('directions.js'); //returns a function that returns turn by turn directions

// var turn_by_turn = get_directions(coordinates); //get turn by turn directions with geocoded coordinates; 

},{"./process_gpx.js":2}],2:[function(require,module,exports){
module.exports = function(gpx_file) {
    //get xml out of file 
   
    var xhr = new XMLHttpRequest();
    
    xhr.onreadystatechange = function() {

        if (xhr.readyState == XMLHttpRequest.DONE) { 
           var coordinates = getCoordinates(xhr.responseText); // the rest of the code ends and returns before onready state change fires done
           return coordinates; 
        }
    }
    xhr.open('GET', './js/'+gpx_file, true);
    xhr.send(null);

}

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
},{}]},{},[1]);
