/**
* Author: Ben Beshel
* Title: SD_Demo.js
* A simple HTML5 Canvas paint tool as a demo for Digital Humanities T-Pen
*  SharedCanvas project
*/

var myWidth = 1000;
var myHeight = 600;
var totalPixels = myWidth * myHeight;
var undoAr = [];
var pixelCount = 0;
var pixAr = [];
var lastPixelCount = 0;
var OMColor = 'rgb(140,120,255)';

 var crops = {
    Color: 'rgb(0,255,0)'

	}; 
	
var points = {
	Color: 'rgb(255,170,0)'
	};
	
var currentFill = crops["Color"];
var currentFillPoint = points["Color"];

var itemSelect;
var totalAcres = 0;
var orgCost = 751.00;
	




//helper DOM function
function elt(name, attributes) {
  var node = document.createElement(name);
  if (attributes) {
    for (var attr in attributes)
      if (attributes.hasOwnProperty(attr))
        node.setAttribute(attr, attributes[attr]);
  }
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];
    if (typeof child == "string")
      child = document.createTextNode(child);
    node.appendChild(child);
  }
  return node;
}

//canvas foundation
var controls = Object.create(null);

function createPaint(parent) {
  var canvas = elt("canvas", {width: myWidth, height: myHeight});
  var cx = canvas.getContext("2d");
  var toolbar = elt("div", {class: "toolbar"});
  for (var name in controls) {
	if (name !== "save") {
		toolbar.appendChild(controls[name](cx));
	} else {
		var temp = document.createElement("div");
		temp.appendChild(controls[name](cx));
		toolbar.appendChild(temp);
	}
  }

  var panel = elt("div", {class: "picturepanel"}, canvas);
  parent.appendChild(elt("div", null, panel, toolbar));
	var button = document.createElement("button");
	var t = document.createTextNode("Undo");
	button.appendChild(t);
	button.addEventListener("click", function(event) {
		undoAction(cx, true);
	});
	parent.appendChild(button);
  
  addUndoAction(cx);
  pixAr.push(0);
}

//tool selection/creation
var tools = Object.create(null);

controls.tool = function(cx) {
  var select = elt("select");
  for (var name in tools)
    select.appendChild(elt("option", null, name));

  cx.canvas.addEventListener("mousedown", function(event) {
    if (event.which == 1) {
      tools[select.value](event, cx);
      event.preventDefault();
    }
  });

  
  return elt("span", null, "Tool: ", select);
};

//helps find where mouse is on page to client
function relativePos(event, element) {
  var rect = element.getBoundingClientRect();
  return {x: Math.floor(event.clientX - rect.left),
          y: Math.floor(event.clientY - rect.top)};
}

//tracks mousemove events when m1 down
function trackDrag(onMove, onEnd) {
  function end(event) {
    removeEventListener("mousemove", onMove);
    removeEventListener("mouseup", end);
    if (onEnd)
      onEnd(event);
  }
  addEventListener("mousemove", onMove);
  addEventListener("mouseup", end);
}

// tools.Point = function(event, cx){
	// currentFillPoint = points[itemSelect.value];
	
	// addUndoAction(cx);
	// pixAr.push(0);
	// var lw = cx.lineWidth;
	// cx.lineCap="round";
	// cx.lineWidth = 1;
	// cx.fillStyle = currentFillPoint;
	// var pos = relativePos(event, cx.canvas);

	// cx.beginPath();
	// cx.strokeStyle= '#000000';
	// cx.arc(pos.x, pos.y, 5, 0, Math.PI * 2, false);
	
	
    // cx.fill();
	// cx.globalAlpha=1.0;
	// cx.stroke();
	// cx.closePath();
	// cx.lineWidth = lw;
// };


//line tool helpers
tools.Line = function(event, cx, onEnd) {
  cx.lineCap = "round";

  var pos = relativePos(event, cx.canvas);
 
  var startPos = pos;
  
  


	//set this to lighter to mix, source-over to overwrite
	cx.globalCompositeOperation = "source-over";
	
	cx.beginPath();
	cx.moveTo(pos.x, pos.y);
  
  trackDrag(function(event) {
    pos = relativePos(event, cx.canvas);
    cx.lineTo(pos.x, pos.y);
    cx.stroke();
  }, 
	//this function closes off a path
	function(){
		
		cx.moveTo(startPos.x, startPos.y);
		cx.lineTo(pos.x, pos.y);
		cx.closePath();
		cx.stroke();
		addUndoAction(cx);
		
		cx.fillStyle = 'rgb(255,0,100)';//new
		cx.fill();//new
		if(currentFill === OMColor){
			countPixels(cx);
		}
		else{
			pixAr.push(0);
		}
		undoAction(cx, false);
		cx.fillStyle = currentFill;//new
		cx.globalAlpha=0.4;
		cx.fill();//new
		cx.stroke();
		cx.fillStyle = '#FFFFFF';
		cx.globalAlpha=1.0;
		updateFigures();
		
	});//new, used to have "onEnd"
	addUndoAction(cx);
};



// controls.pointItem = function(cx) {
  // var select = elt("select");
  // //cropSelect = select;
  // for (var name in crops)
    // select.appendChild(elt("option", null, name));

  // cx.canvas.addEventListener("mousedown", function(event) {
    // if (event.which == 1) {
      // currentFill = crops[select.value];
    // }
  // });
  
  // return elt("div", null, "Sustainable Practices: ", select);
// };

controls.fillItem = function(cx) {
  var select = elt("select");
  itemSelect = select;
  for (var name in points)
    select.appendChild(elt("option", null, name));

  cx.canvas.addEventListener("mousedown", function(event) {
    if (event.which == 1) {
      currentFillPoint = points[select.value];
    }
  });
  
  return elt("div", null, "n: ", select);
};



//save locally
controls.save = function(cx) {
  var link = elt("a", {href: "/"}, "Save");
  function update() {
    try {
      link.href = cx.canvas.toDataURL();
    } catch (e) {
      if (e instanceof SecurityError)
        link.href = "javascript:alert(" +
          JSON.stringify("Can't save: " + e.toString()) + ")";
      else
        throw e;
    }
  }
  link.addEventListener("mouseover", update);
  link.addEventListener("focus", update);
  return link;
};

//load image from url
function loadImageURL(cx, url) {
  var image = document.createElement("img");
  image.addEventListener("load", function() {
    var color = cx.fillStyle, size = cx.lineWidth;

    cx.drawImage(image, 0, 0, myWidth, myHeight);
    cx.fillStyle = color;
    cx.strokeStyle = color;
    cx.lineWidth = size;
  });
  image.src = url;
}

//open local image
controls.openFile = function(cx) {
  var input = elt("input", {type: "file"});
  input.addEventListener("change", function() {
    if (input.files.length == 0) return;
    var reader = new FileReader();
    reader.addEventListener("load", function() {
		var acreBool = false;
		loadImageURL(cx, reader.result);
		  
		// while(!acreBool){
			// totalAcres = Number(prompt("Please enter the total acreage of your plot of land (integer only)"));
			// acreBool = isInt(totalAcres);
			// if(acreBool){
				// if(totalAcres <= 0){
					// acreBool = false;
				// }
			// }
	  // }
    });
    reader.readAsDataURL(input.files[0]);
  });
  return elt("div", null, "Open file: ", input);
};


function countPixels(cx){
	lastPixelCount = 0;
	var imgData=cx.getImageData(0,0,myWidth,myHeight);

	// loop through each pixel and count non-transparent pixels
	
	for (var i=0;i<imgData.data.length;i+=4)
	{
		if(imgData.data[i]===255 && imgData.data[i+1]===0 && imgData.data[i+2]===100){ 
			lastPixelCount++; 
		}
	}
	pixelCount += lastPixelCount;
	pixAr.push(lastPixelCount);
};



function addUndoAction(cx){
	undoAr.push(cx.getImageData(0,0,myWidth,myHeight));
};

function undoAction(cx, pixBool){
	
	if(undoAr.length > 1){
		cx.putImageData(undoAr.pop(),0,0);
	
		if(pixBool){
			pixelCount -= pixAr.pop();
		}
	updateFigures();
	}
};

function isInt(num){
	if(typeof num === 'number'){
		if(num % 1 === 0){
			return true;
		}
		else { 
			return false;
		}
	}
	else {
		return false;
	}
};

var onImageLoadSuccess = function (e) {
var imgData = e.data;
};
var onImageLoadFail = function (e) {
};

  

var updateFigures = function(){
	var baseOM = (pixelCount / totalPixels) * orgCost * totalAcres;
	// divs[0].innerHTML = "1% OM: $" + (baseOM.toFixed(2));
	// divs[1].innerHTML = "5% OM: $" + (baseOM * 5).toFixed(2);
}
createPaint(document.body);

var canvasDiv = document.getElementsByTagName("div");
canvasDiv[0].className = "canvas";

// var container = document.createElement("div");
// container.className = "toolpanel";
// document.body.appendChild(container);
// container.appendChild(document.getElementsByClassName("toolbar")[0]);
// container.appendChild(document.getElementsByTagName("button")[0]);
// var divs = [];
// for(var i = 0; i < 3; i++){
	// divs[i] = document.createElement("div");
	// container.appendChild(divs[i]);
// }
// divs[0].innerHTML = "1% OM: $" + ("0");
// divs[1].innerHTML = "5% OM: $" + ("0");

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

// function rgbToHex(r, g, b) {
    // return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
// }

// for (var n in points) {
	// var curString = points[n].substring(4,points[n].length-1);
	// curString = curString.split(",");
        // divs[2].innerHTML +=
            // ('<span style="background:' + rgbToHex(Number(curString[0]),Number(curString[1]),Number(curString[2])) + '"></i> ' +
            // n + '<br>');
    // }

// for (var n in crops) {
	// var curString = crops[n].substring(4,crops[n].length-1);
	// curString = curString.split(",");
        // divs[2].innerHTML +=
            // ('<span style="background:' + rgbToHex(Number(curString[0]),Number(curString[1]),Number(curString[2])) + '"></i> ' +
            // n + '<br>');
    // }
	
// var toolbarDivNodes = document.getElementsByClassName("toolbar")[0].childNodes;
// toolbarDivNodes[0].className += "tool";
// toolbarDivNodes[1].className += "type";
// toolbarDivNodes[2].className += "type";
// toolbarDivNodes[3].className += "clear";








	
