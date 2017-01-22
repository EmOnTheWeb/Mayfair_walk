module.exports = function(coordinatesData) {

	//start tracking
	var watch_id= navigator.geolocation.watchPosition(

        //success
        function(position) {
            //check against route directions
            var lat = position.coords.latitude; 
            var long = position.coords.longitude; 
           	// console.log('latitude is ' + lat); 
           	// console.log('longitude is' + long); 

           	// console.log(coordinatesData); 
            //round numbers to 5 decimals 
            lat = lat.toFixed(4); 
            long = long.toFixed(4); 

            var instructionData = nearInstructionCoordinate(lat,long, coordinatesData); 

           // var waypoint = isClose(lat,long); //returns false if not close to anywhere, or waypoint number its closest to if close to a waypoint.
           // if(waypoint !== false) {
           //  //play corresponding audio 
           //      audio_elem = 'waypoint_'+waypoint; 
           //      playAudio(audio_elem);  
           // } 
           //  // if(waypoint) {
           //  route_data.push(position); 
        },
        //error
        function(error) {
                console.log('couldnt get coordinates!!!'); 
        },
        //settings
        { frequency: 10000, enableHighAccuracy: true}

    ); 
}
function nearInstructionCoordinate(lat,long, instructionPoints) { //compare lat long of device to coordinates where your gonna read out data, see if theres a match. If so return data for that coordinate

	
	for(var i=0; i<instructionPoints.length; i++) {

		var instructionCoordinates= instructionPoints[i]['coordinates']; 
		var instructionCoordinateLat = instructionCoordinates[1]; 
		var instructionCoordinateLong = instructionCoordinates[0]; 

		//round to 4 digits so if your more roughly nearby ... (this possibly needs more thinking about)
		instructionCoordinateLat = instructionCoordinateLat.toFixed(4); 
		instructionCoordinateLong = instructionCoordinateLong.toFixed(4); 
		// console.log('device latitude is' + typeof lat); 
		// console.log('device longitude is' + lonCoordinate
		// console.log('point lat is' + typeof instructionPointLat); 
		// console.log('point long is' + instructionPointLong); 
		
		if(lat === instructionCoordinateLat && long === instructionCoordinateLong) { //all the coordinates are strings at this point ... 
			return instructionPoints[i]; 
		}
	}
	return false; 
}

// function isClose(lat, long) {

//     for(var i=0; i<coordinates_array.length; i++) {

//         //if matches to 4 decimal places 
//         var waypoint_lat = coordinates_array[i][0]; 
//         var waypoint_long = coordinates_array[i][1]; 

//         // console.log('position lat long is' + lat + ' ' + long); 
//         // console.log('lat long waypoint is' +waypoint_lat + ' ' + waypoint_long); 

//         if((lat.substr(0,lat.length -1) === waypoint_lat.substr(0,waypoint_lat.length-1)) && 
//             (long.substr(0, long.length -1) === waypoint_long.substr(0,waypoint_long.length-1))) {
      
//             return i+1; 
//         }
//     }
//     return false; 
// }