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