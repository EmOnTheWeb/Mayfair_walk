module.exports = function(directionObject) {

	var route = directionObject['routes'][0]; 
	var steps = route['steps'];

	for (var i= 0; i< steps.length; i++) {

		var currentStep=steps[i]; 

		var direction=currentStep['direction']; 
		var distance=currentStep['distance']; 
		var instruction=currentStep['maneuver']['instruction']; 
		var type=currentStep['maneuver']['type']; 
		var coordinates=currentStep['maneuver']['location']['coordinates']; 
	}


	console.log(steps); 


}