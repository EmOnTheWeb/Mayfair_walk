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



