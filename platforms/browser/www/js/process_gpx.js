module.exports = function(gpx_file) {
    //get xml out of file 
   
    var xhr = new XMLHttpRequest();
    
    xhr.onreadystatechange = function() {

        if (xhr.readyState == XMLHttpRequest.DONE) { 
           var coordinates = getCoordinates(xhr.responseText); 
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