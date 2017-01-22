module.exports = function(coordinatesData) {

	//start tracking

	var watch_id= navigator.geolocation.watchPosition(

        //success
        function(position) {
                //check against route waypoints 
            var lat = position.coords.latitude; 
            var long = position.coords.longitude; 
            console.log(position); 
           //  //round numbers to 5 decimals 
           //  lat = lat.toFixed(5); 
           //  long = long.toFixed(5); 

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
        { frequency: 10000, enableHighAccuracy: true}); 
console.log('hi'); 
}