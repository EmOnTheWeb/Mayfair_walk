requestUri = 'http://localhost:8888/list-walks'; 

var xhr = new XMLHttpRequest();
    
xhr.open('GET',requestUri, true);
xhr.send(null);  

xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) { 

        var walks = xhr.responseText;
        readIntoSelect(walks);        
    }
}

function readIntoSelect(walks) {
	walks= JSON.parse(walks);
	selectElem=document.querySelector(".choose-walk"); 
	for(var i=0; i<walks.length; i++) {
		var opt=document.createElement("option"); 
		opt.text=walks[i]; 
		selectElem.add(opt,null); 



	}
}    