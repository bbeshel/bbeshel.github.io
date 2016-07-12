	var JSONparser = function (context) {
		var self = this;
		
		var parent = context;
		
		// var $textField = $("#dataEntry");
		// $textField.on("textSubmit", function () {
			// evaluateData($textField.val());
		// });
		
		// var $textButton = $("#dataButton");
		// $textButton.on("click", function () {
			// $textField.trigger("textSubmit");
		// });
		
		var $curCont = $("<div>");
		var $curImg = $("<div>");
		var $curAno = $("<div>");
		var curTextLine = "";
		var lastURL = "";
		var anoListURL = "";
		var canvasURL = "";
		//var insideAnnoList = false; 
		var annoNumber = 0;
		var canvJSON;
		var annoJSON;
		var canvImg;

		//Handles errors
		// window.addEventListener('error',function(e){
		// console.log(e)}, true);

		//Handles the storage of information
		var storageHandler = function(unstoredObject){
			curTextLine += unstoredObject;
		}
		
		//Checks objects from the canvas 
		var basicCheck = function(canvasObject, $textOb){
			if (canvasObject["@type"] === "sc:Canvas") {
				handleURL(canvasObject["@id"]);
			}
			if (canvasObject["@type"] === "sc:AnnotationList") {
				$textOb = $curAno;
				//insideAnnoList = true;
				handleURL(canvasObject["@id"]);
				}
				
			if (canvasObject["@type"] === "dctypes:Image") {
				//console.log(canvasObject);
				//console.log(canvasObject["resource"]["@id"]);
				
				//here we are detecting for two different acceptable models for images
				if (canvasObject.hasOwnProperty("resource")) {
					handleURL(canvasObject["resource"]["@id"]);
				} else if (canvasObject.hasOwnProperty("@id")) {
					handleURL(canvasObject["@id"]);
				}
			}
			//console.log(canvasObject);
			for (n in canvasObject){
				//if (canvasObject.hasOwnProperty(n)){
				// // debugger; -->
				//console.log("in loop");
				//console.log(n);
				//console.log(canvasObject[n]);
				/* Slashed out curTextLine lines and textline lines will cause the  program to
				 display all attributes of a canvas instead of just certain ones from annotations.*/
					if (Array.isArray(canvasObject[n])){
								//curTextLine += n + ":(Array)";
								//textline(curTextLine, $textOb);
							basicCheck(canvasObject[n], $textOb);
							//curTextLine += "(/Array)";
							// curTextLine +=("<br />");				 -->
							//textline(curTextLine, $textOb, 1);					
					} else if (typeof(canvasObject[n]) === 'object') {
								//curTextLine += n + ":(Object, containing:)";
								//textline(curTextLine, $textOb);
							
							basicCheck(canvasObject[n], $textOb);
								//curTextLine += "(/Object)";
								// curTextLine +=("<br />");				 -->
								//textline(curTextLine, $textOb, 1);
							
					} else if (validChecker(canvasObject[n]) == true){
						if ($textOb == $curAno){
							switch(n){
								case "@type":
								/*if (canvasObject[n]=="sc:AnnotationList"){
									curTextLine += "Annotation List";
									curTextLine += ("<br />");
									textline(curTextLine, $textOb);
								}*/
								if(canvasObject[n] == "oa:Annotation"){
									curTextLine += "Annotation " + annoNumber.toString();
									curTextLine += ("<br />");
									textline(curTextLine, $textOb, 1);
									annoNumber += 1;
								}
								break;
								
								case "label":
								curTextLine += "Label: " + canvasObject[n];
								curTextLine += ("<br />");
								textline(curTextLine, $textOb);
								break;
								
								case "cnt:chars":
								curTextLine += "Text: " + canvasObject[n];
								curTextLine += ("<br />");
								textline(curTextLine, $textOb);
								break;
								
								/*case "forProject":
								curTextLine += "For: " + canvasObject[n];
								curTextLine += ("<br />");
								textline(curTextLine, $textOb);
								break;
								
								case "@id":
								curTextLine += "ID: " + canvasObject[n];
								curTextLine += ("<br />");
								textline(curTextLine, $textOb);
								break;
								*/
								
							}
							// storageHandler(n); -->
							//curTextLine += n + ": ";
							//curTextLine += canvasObject[n];
							//textline(curTextLine, $textOb);
							// curTextLine +=("<br />"); -->
						}
					} else {
						//Item was blank
					}
				//}
			}
		};
		


		var validChecker = function(objectValue){
			if (objectValue == null){
				return false;
			}

			else if (typeof objectValue === 'string'){
				// objectValue.trim(); -->
				if (objectValue.length > 0){
					if (objectValue.substring(0, 4) === "http") {
						// handleURL(objectValue);
					}
					return true;
				}
			}
			else if (typeof objectValue === 'number'){
				if (objectValue > -1){
					return true;
				}
			}
			else if (typeof objectValue === 'boolean'){
				return true;
			}
		};
			
		// var multipleObjectHelper = function(multiObject){
			// switch(Array.isArray(multiObject)){
				// case true:
					// //Add the name of the array + "(Array)"
					// for (var n=0; n<multiObject.length; n++){
						// basicCheck(multiObject[n]);
					// }
					// //Add the name of the array, + "(/Array)"
					// break;
						
			
				// case false:
					// //Add the name of the object, + "(Object, containing:)"
					// basicCheck(multiObject);
					// //Add the name of the object, + "(/Object)"
					// break;
			// }
		// };
		



		//Parses the canvas in order to obtain necessary data for redrawing the canvas
		//How information will be parsed depends on the type of canvas
		var canvasParser = function(jsontext){
			// var text = canvas.responseText; -->
			var parsedCanv = JSON.parse(jsontext);
			console.log(parsedCanv);
			var type = parsedCanv["@type"];
			if (type === "sc:AnnotationList") {
				anoListURL = parsedCanv["@id"];
				annoJSON = jQuery.extend(true, {}, parsedCanv);
				$(document).trigger("parser_annoDataRetrieved", [annoJSON]);
				basicCheck(parsedCanv, $curAno);
				//insideAnnoList = false;
			} else if (type === "sc:Canvas") {
				canvasURL = parsedCanv["@id"];
				//deep copy the object for use later
				canvJSON = jQuery.extend(true, {}, parsedCanv);
				$(document).trigger("parser_canvasDataRetrieved", [canvJSON]);
				basicCheck(parsedCanv, $curCont);
			} else {
				alert('Handled json does not have expected type "sc:Canvas" or "sc:AnnotationList');
			}
		};



		var resolveCanvasURL = function (url) {
			// clearArea();
			var aThing = $.getJSON(url, function() {
					alert("JSON data received.");
				}
			).done( function() {
				canvasParser(aThing.responseText);
				}
			).fail( function() {
				alert("A problem has been found. Cannot display image.");
				}
			);
		};
		
		var evaluateData = function (text) {
			if (isURL(text)) {
				resolveCanvasURL(text);
			} else {
				resolveJSON(text);
			}
		};
		
		var isURL = function (text) {
			if (text.substring(0, 4) == "http") {
				return true;
			} else {
				return false;
			}
		};
		
		
		//	HTML STUFF====================================================
		var handleURL = function (url) {
			//test if url first (basic test)
			var result = isURL(url);
			if (anoListURL === url) {
				return;
			} else if (canvasURL === url) {
				return;
			}
			
			if (result) {
				var rexp = /\.jpg/i;
				if (rexp.test(url)) {
					if (url == lastURL) {
						return;
					} else {
						lastURL = url;
					}
					resolveImage(url);
				} else {
					// alert("Found a URL, but could not identify it!"); -->
					// console.log(url); -->
					resolveCanvasURL(url);
				}
			}
			insideAnnoList = false;			
		};
		
		var resolveImage = function (imgUrl) {
			var $img = $("<img src='" + imgUrl + "' />");
			console.log("attempt to resolve image url");
			$img.on("load", function () {
				//TODO: display the image somewhere here!
				console.log("attempt image append");
				// $curImg.append(img);
				canvImg = $img;
				console.log (canvImg);
				$(document).trigger("parser_imageDataRetrieved", [canvImg]);
				
			})
			.on("error", function () {
				alert("Could not retrieve image data!");
			});
		};
		
		var resolveJSON = function (text, $box) {
			// clearArea();
			canvasParser(text);
			console.trace("this");
		};
		
		var textline = function (text, $box, bool) {
			if (bool){
				var para = "<p class='colorChange'>"
			}
			else{
			var para = "<p>";
			}
			$box.append(para + text + "</p>");
			curTextLine = "";
		};
		
		var clearArea = function () {
			$curCont.empty();
			$curImg.empty();
			curTextLine = "";
			lastURL = "";
		};
		
		self.getAnnotationListJSON = function () {
			if (annoJSON == null) {
				return;
			}
			return annoJSON;
		};
		
		self.getCanvasJSON = function () {
			if (canvJSON == null) {
				return;
			}
			return canvJSON;
		};
		
		self.getCanvasImage = function () {
			if (canvImg == null) {
				return;
			}
			return canvImg;
		};
		
		self.requestData = function (data) {
			evaluateData(data);
		};

		//Some tests, to be deleted later
		var exampleCanv = "http://165.134.241.141/annotationstore/annotation/55f9da84e4b04dde25a2734c";
		// evaluateData(exampleCanv);
	};