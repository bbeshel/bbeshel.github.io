/*
/*
 * CanvasHandler.js
 * Author: Ben Beshel, Graison Day
 * Handler for IIIF Canvases for T-PEN. 
*/

//TODO: bind mousevents to document, have canvas check if mouse exists
//TODO: move canvas order: middle canvas is shapes, top is feedback/interaction
//test

	var CanvasHandler = function () {
		
		//creates a context variable to access member functions
		var self = this;
		
		//The operation modes to select from
		self.MODES = [
			"POLY",
			"EDIT",
			"RECT",
			"CIRC",
			"ANNO",
		];
		
		//The names of op modes as they appear to the user
		self.MODE_NAMES = [
			"Polygon",
			"Edit",
			"Rectalinear",
			"Circular",
			"Annotate"
		];
		
		var dummyAnnotation = {
			"@id" : null,
			"@type" : "oa:Annotation",
			"motivation" : "sc:Painting",
			"resource" : {
				"@type" : "cnt:ContentAsText",
				"cnt:chars" : ""
			},
			"on" : null,
			"otherContent" : []
		};
		
		var dummyPolyAnnotation = {
			"@type" : "oa:Annotation",
			"motivation" : "sc:painting",
			"resource" : {
				"@type" : "oa:SpecificResource",
				"selector" : {
					"@type" : "oa:SvgSelector",
					"chars" : null
				}
			},
			"on" : null
		};
		
		/*
		The default configuration object.
		This will be overwritten by attributes of a SharedCanvas JSON-LD object when found, 
		as well as by user preferences changed live in the toolbar
		*/
		var CONFIGS = {
			anno : {
				strokeStyle : "black",
				lineWidth : 1
			},
			feedback : {
				strokeStyle : "red",
				lineWidth : 1,
				cursorSize : 5
			},
			snapZone : 10,
			canvasWidth : 0,
			canvasHeight : 0,
			canvasImageSrc : null,
			annotationList : null,
			canvasData : null
		};
		
		var annoListData;
		var canvasData;
		
		var receivedDataCheck = {
			image : false,
			annos : false,
			canvas : false,
			complete : function () {
				if (this.image && this.annos && this.canvas) {
					return true;
				}
				return false;
			}
		};
		
		//TODO: consider moving to init
		//Object to house the toolbar and its functions
		var tool = new CanvasHandlerToolbar(self);
		
		var parser = new JSONparser(self);
				
		//TODO: implement as feature
		//Used as a toggle for closing a shape on click
		var snapToClosePathBool = true;
		
		//Bool for checking if the mouse is near an anchor. Based on CONFIGS.snapZone
		var isInSnapZone = false;
		
		//Bool for mouse down
		var isMouseDown = false;
		
		//Bool to check if mouse is inside the selected annotation to be edited
		var isInSelectedAnno = false;

		//Bool telling if an anchor has been clicked and selected
		var isAnchorSelected = false;
		
		//Bool to tell whether an object is currently being edited
		var isEditingPath = false;

		//Bool to tell if the shape being edited has already been moved
		var isShapeMoved = false;
		
		var canvasDimensionsChecks = 0;
		
		var dimensionCheckLimit = 1;
				
		//Universal canvas mouse position
		var mPos;
		
		//Stores the previous canvas mouse position
		var prevmPos = { x : -1, y : -1};
		
		//Container for HTML positioning, allows layering of canvases
		//Normally, I abstain from inline CSS, but for now it's okay
		var $canvasContainer = $("<div id='canvasContainer'></div>");

		//The canvas that holds the image (jQuery)
		var $imgCanvas;
		//(js)
		var imgCanvas;
		//(canvas.getContext)
		var imgCx;
			
		//The canvas that displays completed annotations
		var $anoCanvas;
		var anoCanvas;
		var anoCx;
		
		//The canvas that loads and allows creation of annotations
		var $intCanvas;
		var intCanvas;
		var intCx;
		
		//May not need
		//Used as a bool for choosing on canvas click to end the path
		var userEndedPath = false;
		
		//Stores all anchorLists that are completed
		var completedPaths = [];
		
		//Temporary storage for any annotations as anchorLists that are being edited
		var selectedPaths = [];
		
		//The current index of all detected annotations in edit mode
		var selectedPathsCurIndex;
		
		//The index of the anchor in a specific annotation path that was selected
		var selectedPathsAnchorIndex;
		
		//LOOK here for list of SVG after closing a path
		//Stores HTML complete SVG tags defined by an anchor list path
		var svgTags = [];
		
		//TODO: move these to CONFIGS
		//Some styling
		var svgStrokeColor = "stroke:black;";
		var svgLineWidth = "line-width:5;";
		var svgFillStyle = "fill:none;";
		
		var svgPrefix = "<svg xmlns=\"http://www.w3.org/2000/svg\""
		var svgSuffix = "</svg>";

		/*
		Custom array-like data structure that holds information about a list of points.
		These points, called anchors, define a path, which will be used as an annotation.
		*/
		var anchorList = {
			x: [],
			y: [],
			length: 0,
			leftmost: 100000,
			rightmost: 0,
			topmost: 100000,
			bottommost: 0,
			annoListIndex: -1,
			type: null,
			JSON: null,
			push: function (px, py) {
				this.x.push(px);
				this.y.push(py);
				this.length++;
				
				this.updateBounds(px, py);
			},
			removeLast: function () {
				this.x.splice(this.x.length - 1, 1);
				this.y.splice(this.y.length - 1, 1);
				this.length--;
			},
			clear: function () {
				this.x = [];
				this.y = [];
				this.length = 0;
				this.leftmost = 100000;
				this.rightmost = 0;
				this.topmost = 100000;
				this.bottommost = 0;
				this.annoListIndex = -1;
				this.type = null;
				this.JSON = null;
			},
			updateBounds: function (px, py) {
				this.leftmost = px < this.leftmost ? px : this.leftmost;
				this.rightmost = px > this.rightmost ? px : this.rightmost;
				this.topmost = py < this.topmost ? py : this.topmost;
				this.bottommost = py > this.bottommost ? py : this.bottommost;
			},
			//TODO: probably absolute value this stuff...
			getBoundingBoxArea: function () {
				return Math.abs(this.rightmost - this.leftmost) * Math.abs(this.bottommost - this.topmost);
			},
			generateJSON: function () {
				var anno;
				switch (this.type) {
					case "POLY":
						var SVGstring = createSVGTag(this);
						anno = $.extend(true, {}, dummyPolyAnnotation);
						anno["resource"]["selector"]["chars"] = SVGstring;
						
						//TODO: get the link of this canvas for the on property
						// anno["on"
						
						this.JSON = anno;
						break;
					case "RECT":
						break;
					default:
					
				}
			}
		};
		
	
		
		this.init = function (data) {
			
		
			//Wraps the <canvas> and the toolbar.
			var $wrapper = $("<div id='CHwrapper'>");
			$("body").append($wrapper);
			
			//Button to close the current path (deprecated?)
			// var endPathBtn = $("<button id='endCurrentPathBtn' style='position: relative;'>End Current Path</button>");
			// endPathBtn.on("click", endPath);
			// $("body").append(endPathBtn);
			//TODO: need to get image dynamically from json
			//Temporary image used for testing
			var img2 = new Image();
			img2.src = "http://norman.hrc.utexas.edu/graphics/mswaste/160 h612e 617/160_h612e_617_001.jpg";
			
			
			$imgCanvas = $("<canvas class='tpenCanvas' id='imgCanvas'>");
			imgCanvas = $imgCanvas.get(0);
			imgCx = imgCanvas.getContext("2d");
			//TODO: need to have dynamic parent to append to
			//TODO: find default ID to attach to, or take as param.
			$canvasContainer.append($imgCanvas);
			
			$anoCanvas = $("<canvas class='tpenCanvas' id='anoCanvas'>");
			anoCanvas = $anoCanvas.get(0);
			anoCx = anoCanvas.getContext("2d");
			$canvasContainer.append($anoCanvas);
			
			$intCanvas = $("<canvas class='tpenCanvas' id='intCanvas'>");
			intCanvas = $intCanvas.get(0);
			intCx = intCanvas.getContext("2d");
			$canvasContainer.append($intCanvas);
			
			
			
			
			
			$wrapper.append($canvasContainer);
			tool.init($wrapper);

			//Clear the interaction canvas
			$(document).on("handler_canvasIntClear", function () {
				intCx.clearRect(0, 0, CONFIGS.canvasWidth, CONFIGS.canvasHeight);
			});
			
			//Clear the annotation canvas
			$(document).on("handler_canvasAnoClear", function () {
				anoCx.clearRect(0, 0, CONFIGS.canvasWidth, CONFIGS.canvasHeight);
			});
			
				//Changes the snap zone
			$(document).on("handler_changeSnapZone", function (e, data) {
				changeSnapZone(data);
			});
			
			//Calls to save the changes made in edit mode
			$(document).on("handler_saveEditChanges", function (e) {
				saveEditChanges();
			});
			
			$(document).on("parser_annoDataRetrieved", function (e, data) {
				console.log("FOUND ANNO DATA");
				console.log(data);
				CONFIGS.annotationList = jQuery.extend(true, {}, data);
				convertAnnotations();
				receivedDataCheck.annos = true;
				onAllDataRetrieved();
			});
			
			$(document).on("parser_canvasDataRetrieved", function (e, data) {
				console.log("FOUND CANVAS DATA");
				console.log(data);
				CONFIGS.canvasData = jQuery.extend(true, {}, data);
				setCanvasDimensions();
				receivedDataCheck.canvas = true;
				onAllDataRetrieved();
			});
			
			$(document).on("parser_imageDataRetrieved", function (e, data) {
				console.log("FOUND IMAGE DATA");
				console.log(data);
				//TODO: set canvas size based on parsed info, unless missing
				//TODO: add variable image tag for onload based on parsed content
				// var img = $("<img src='http://norman.hrc.utexas.edu/graphics/mswaste/160 h612e 617/160_h612e_617_001.jpg' />");
				CONFIGS.canvasImageSrc = data[0].src;
				drawAndResizeImage();
				receivedDataCheck.image = true;
				onAllDataRetrieved();
			});
			
			$(document).on("handler_setupStatusUpdate", function () {
				
			});
			
			//Changes the mode of operation on the canvas
			$(document).on("toolbar_changeOperationMode", function () {
				resetSharedParams();
			});
			
			//Generic document mousemove catch and handler
			$(document).on("mousemove", function (e) {
				//Update the mouse coordinates, etc...
				moveCallback(e);
				if (!mPos) { 
					return; 
				}
				tool[tool.MODE].mousemove(e);				
			});
			
			//Generic document click catch and handler
			$(document).on("click", function (e) {
				if (!mPos) { 
					return; 
				}
				tool[tool.MODE].click(e);
			});
			
			//Generic document mousedown catch and handler
			$(document).on("mousedown", function (e) {
				isMouseDown = true;
			});
			
			//Generic document mouseup catch and handler
			$(document).on("mouseup", function (e) {
				isMouseDown = false;
			});

			//TODO: make sure we dont call a function that doesnt exist!
			//Dynamic document keydown catch and handler
			$(document).keydown(function (e) {
				switch(e.which) {
					case 32: //space
						tool[tool.MODE].space(e);
					break;
					case 13: //enter
						tool[tool.MODE].enter(e);
				}
			});
			
			
			
			
			if (data != null) {
				console.log("data wasnt null");
				parser.requestData(data);
			} else {
				CONFIGS.canvasImageSrc = 'http://norman.hrc.utexas.edu/graphics/mswaste/160 h612e 617/160_h612e_617_001.jpg';
				var $canvImg = $("<img src='" + CONFIGS.canvasImageSrc + "'/>");
				$canvImg.on("load", function () {
					//TODO: make sure size of canvas conforms to standard
					//TODO: make sure original data preserved corresponding to JSON canvas size
					CONFIGS.canvasWidth = $canvImg.get(0).width;
					CONFIGS.canvasHeight = $canvImg.get(0).height;
					setCanvasDimensions();
					console.log(CONFIGS.canvasWidth);
					imgCx.drawImage($canvImg.get(0), 0, 0);
				});
			}
			
			
			
		};

		var onAllDataRetrieved = function () {
			if (receivedDataCheck.complete) {
				console.log("WE DID IT");
				redrawCompletedPaths();
			}
			// setCanvasDimensions();
			// drawAndResizeImage();
			// drawAllCanvasAnnotations();
		};
		
	
		var setCanvasDimensions = function () {
			if (CONFIGS.canvasData != null) {
				console.log("canvas data found");
				var wid = CONFIGS.canvasData.width;
				var hgt = CONFIGS.canvasData.height;
				CONFIGS.canvasWidth = wid;
				CONFIGS.canvasHeight = hgt;
			}

			if (CONFIGS.canvasWidth !== 0) {
				console.log("no canvas data found");
				var wid = CONFIGS.canvasWidth;
				var hgt = CONFIGS.canvasHeight;
			} else {
				console.log("returning");
				return;
			}
				console.log(CONFIGS.canvasWidth);
				console.log(CONFIGS.canvasHeight);
			
		
			imgCanvas.width = wid;
			imgCanvas.height = hgt;
			
			// imgCx.drawImage(canvImg.get(0), 0, 0);
			
			anoCanvas.width = wid;
			anoCanvas.height = hgt;
			intCanvas.width = wid;
			intCanvas.height = hgt;
			$canvasContainer.width(wid);
			$canvasContainer.height(hgt);
		};
		
		var drawAndResizeImage = function () {
			var $canvImg = $("<img src='" + CONFIGS.canvasImageSrc + "'/>");
			$canvImg.on("load", function () {
				//TODO: make sure size of canvas conforms to standard
				//TODO: make sure original data preserved corresponding to JSON canvas size
				$canvImg.width = CONFIGS.canvasWidth;
				$canvImg.height = CONFIGS.canvasHeight;
				imgCx.drawImage($canvImg.get(0), 0, 0);
				
			});
		};
		
		var convertAnnotations = function () {
			if (CONFIGS.canvasWidth === 0 && CONFIGS.canvasHeight === 0) {
				setTimeout(function () {
					//TODO: remove this, we should always have canvas dimensions?
					canvasDimensionsChecks++;
					if (canvasDimensionsChecks === dimensionCheckLimit) {
						CONFIGS.canvasWidth = 1000;
						CONFIGS.canvasHeight = 1000;
						setCanvasDimensions();
					}
					console.log("Warning: attempt to draw annotations failed. Reason: No canvas dimensions. Retrying...");
					convertAnnotations();
				}, 5000);
			} else if (CONFIGS.annotationList == null) {
				console.log("Warning: attempt to draw annotations failed. Reason: annotationList was null");
			} else {
				var annos = CONFIGS.annotationList.resources;
				var ind;
				console.log(annos);
				
				for (var i = 0; i < annos.length; i++) {
					//TODO: check the dimensions of the SVG to match canvas
					//TODO: change to convert to completedPaths only
					if (annos[i].hasOwnProperty("resource") && annos[i]["resource"].hasOwnProperty("selector")) {						
						console.log("SVG");
						if (annos[i]["resource"]["selector"].hasOwnProperty("chars")) {
							var svgString = annos[i]["resource"]["selector"]["chars"];
							drawSVGAnnotation(svgString);
							
						}
					} else if (annos[i].hasOwnProperty("on")) {
						console.log("rect");
						var curAnno = annos[i];
						console.log(curAnno);
						rectToAnchor(curAnno);
					}
				}
				redrawCompletedPaths();
			}
		};
		
		var rectToAnchor = function (annotation) {
			console.log(annotation);
			var ind = annotation["on"].search("xywh");
			if (ind > -1) {
				var dimString = annotation["on"].substr((ind + 5));
				var dims = dimString.split(",");
				var x, y, w, h;
				x = Number(dims[0]);
				y = Number(dims[1]);
				w = Number(dims[2]);
				h = Number(dims[3]);
				anchorList.clear();
				anchorList.push(x, y);
				anchorList.push((x + w), y);
				anchorList.push((x + w), (y + h));
				anchorList.push(x, (y + h));
				anchorList.push(x, y);
				
				anchorList.type = "RECT";
				// TODO: determine the position in the anno list?
				// anchorList.annoListIndex =
				// drawRectalinearAnnotation(dims);
				anchorList.JSON = JSON.stringify(annotation);
				var curList = jQuery.extend(true, {}, anchorList);
				completedPaths.push(curList);
				anchorList.clear();
			} else {
				console.error("Warning: annotation 'on' property found, but could not retrieve dimensions!");
			}
		};
		
		var drawRectalinearAnnotation = function (dimsArray) {
			//TODO: do some checks to make sure values conform
			anoCx.beginPath();
			var x, y, w, h;
			x = Number(dimsArray[0]);
			y = Number(dimsArray[1]);
			w = Number(dimsArray[2]);
			h = Number(dimsArray[3]);
			console.log(x);
			console.log(y);
			console.log(w);
			console.log(h);
			anoCx.moveTo(x, y);
			anoCx.lineTo((x + w), y);
			anoCx.lineTo((x + w), (y + h));
			anoCx.lineTo(x, (y + h));
			anoCx.lineTo(x, y);
			anoCx.stroke();
			
			
		};
		
		var drawSVGAnnotation = function (data) {
			//TODO: maybe check for type of data input
			console.log(data);
			
			var type = determineSVGType(data);
			switch (type) {
				case "CIRC":
					alert("Found a circle SVG - currently unsupported");
					break;
				case "POLY":
					var ind = data.search("points");
					
					// var pointPairs = 
					break;
				default:
					alert("Found an SVG with an unsupported type.");
			}
			
		};
		
		var determineSVGType = function (svgString) {
			//TODO: use the configs object 
			// var types = ["cirlce", "poly"];
			var type, ind;
			for (var i = 0; i < self.MODES.length; i++) {
				ind = string.toLowerCase().indexOf(self.MODES[i]);
				if (ind > -1) {
					type = self.MODES[i];
				}
			}
			return type;
			
		};
		
		//TODO: maybe convert the mouse coordinates to SC coordinates here?
		//Gets the mouse coordinates on the canvas
		this.getMousePos = function(evt) {
			var rect = imgCanvas.getBoundingClientRect();
			var tempX = Math.floor((evt.clientX - rect.left)/(rect.right-rect.left)*imgCanvas.width);
			var tempY = Math.floor((evt.clientY - rect.top)/(rect.bottom-rect.top)*imgCanvas.height);
			
			//checks if mouse event is within canvas bounds
			//helps with restricting event bindings
			if (CONFIGS.canvasWidth > tempX && tempX > -1 && CONFIGS.canvasHeight > tempY && tempY > -1) {
				return {
					x: tempX,
					y: tempY
				};
			} else {
				return null;
			}
		};	

		//Called on mousemove
		var moveCallback = function (e) {
			prevmPos = mPos;
			mPos = self.getMousePos(e);
			// console.log(mPos);
		};
		
		//TODO: rename this, or expand for each mode...
		//Draws the mouse pointer indicator
		var drawIndicator = function () {
			var x, y;
			
			//Checks to see if we should force the indicator to a snap point
			if (snapToClosePathBool && anchorList.length > 1) {
				var anchor = { 
					x : anchorList.x[0],
					y : anchorList.y[0]
				};
				if (checkIfNearAnchor(mPos, anchor)) {
					isInSnapZone = true;
					x = anchorList.x[0];
					y = anchorList.y[0];
				}
			}
			
			//Not near snap zone, so draw the indicator normally.
			if (x == null && y == null) {
				isInSnapZone = false;
				x = mPos.x;
				y = mPos.y;
			}
			
			intCx.beginPath();
			//TODO: make this permanent before calls 
			intCx.lineWidth = CONFIGS.feedback.lineWidth;
			intCx.strokeStyle = CONFIGS.feedback.strokeStyle;

			//TODO: make the radius editable.
			intCx.arc(x, y, 5, 0, 360);
			intCx.stroke();

			//Draw the line from the previous anchor to mPos/snap point
			if (anchorList.length > 0) {
				intCx.beginPath();
				intCx.moveTo(
					anchorList.x[anchorList.length-1], 
					anchorList.y[anchorList.length-1]
				);
				intCx.lineTo(x, y);
				intCx.stroke();
			}
		};
		
		//Draws the next line in the path being created
		var continuePath = function () {
			if (anchorList.length > 1) {
				anoCx.beginPath();
				anoCx.lineWidth = CONFIGS.anno.lineWidth;
				anoCx.strokeStyle = CONFIGS.anno.strokeStyle;
				anoCx.moveTo(
					anchorList.x[anchorList.length-2], 
					anchorList.y[anchorList.length-2]
				);
				anoCx.lineTo(
					anchorList.x[anchorList.length-1], 
					anchorList.y[anchorList.length-1]
				);
				anoCx.stroke();
				
			}
		};
		
		//TODO: setup so user can choose to close path
		/*
		ends the path only if it can be ended.
		This means that we have 3 anchors minimum
		Path is ended by connecting final and first anchors
		*/
		var endPath = function () {
			
			if (anchorList.length > 2) {
				anoCx.beginPath();
				anoCx.moveTo(
					anchorList.x[0],
					anchorList.y[0]
				);
				anoCx.lineTo(
					anchorList.x[anchorList.length-1],
					anchorList.y[anchorList.length-1]
				);
				anoCx.stroke();
				
				anchorList.push(anchorList.x[0], anchorList.y[0]);
				console.log(tool.MODE);
				anchorList.type = tool.MODE;
				console.log(anchorList.type);
				anchorList.generateJSON();
				console.log(anchorList);
				completedPaths.push(clone(anchorList));
				createSVGTag(anchorList);
				anchorList.clear();
				console.log(completedPaths);
				$(document).trigger("toolbar_updateAnnotationData");
			}
		}
		
		//TODO: possibly pass in a set of points from which an event was triggered...
		var addAnchor = function () {
			anchorList.push(mPos.x, mPos.y);
		};

		//Checks to see if we are near an anchor
		var checkIfNearAnchor = function (mousePoint, anchor) {
			//Bounding box around the anchor
			var anchorBox = {
				xMax : anchor.x + CONFIGS.snapZone, 
				xMin : anchor.x - CONFIGS.snapZone, 
				yMax : anchor.y + CONFIGS.snapZone, 
				yMin : anchor.y - CONFIGS.snapZone 
			};
			//If the mouse pos when this function was called is in the bounding box...
			if (
			mousePoint.x < anchorBox.xMax 
			&& mousePoint.x > anchorBox.xMin
			&& mousePoint.y < anchorBox.yMax 
			&& mousePoint.y > anchorBox.yMin
			) { 
				return true;
			} else {
				return false;
			}
		};
		
		//TODO: fill this in for display...
		var displayJSON = function () {
			
		};
		
		var createSVGTag = function (anchors) {
			//Not sure if we need this width/height
			//TODO: possibly set width/height to SC dims
			//TODO: convert points to relative width/height of SC
			var str = svgPrefix +
				"width=\"" + anchors.rightmost + "\" " + 
				"height=\"" + anchors.bottommost + "\"" +
				">" +
				"<polygon points=\"";
				
			for (var i = 0; i < anchors.length; i++) {
				str += anchors.x[i] + "," + anchors.y[i] + " ";
			}
			str += "\"";
			// str += "style=\"" + svgLineWidth + svgStrokeColor + svgFillStyle + "\"";
			str += " />"
			str += svgSuffix;
			svgTags.push(str);
			var svg = $(str);
			
			
			console.log(svgTags);
			console.log(svg.get(0));
			return str;
		};
		
		var readSVGTag = function (tag) {
			var $tag = $.parseHTML(tag);
						
			//TODO: need to check if properties exist. hasOwnProperty doesnt work, doesnt extend object prototype.
			// if ($tag[0].hasOwnProperty("lastChild") && $tag[0].lastChild.hasOwnProperty("animatedPoints")) {
				var pList = $tag[0].lastChild.animatedPoints;
				for (var i = 0; i < pList.length; i++) {
					anchorList.push(pList[i].x, pList[i].y);
				}
			// }
			drawPath(anchorList);
			anchorList.clear();
		};
		
		//put more shared params here if needed
		//TODO: find a more elegant way of doing this...
		var resetSharedParams = function () {
			isInSnapZone = false;
		};

		//Deep clones an object (special thanks to stackoverflow community)
		var clone = function(obj) {
			var copy;

			// Handle the 3 simple types, and null or undefined
			if (null == obj || "object" != typeof obj) return obj;

			// Handle Date
			if (obj instanceof Date) {
				copy = new Date();
				copy.setTime(obj.getTime());
				return copy;
			}

			// Handle Array
			if (obj instanceof Array) {
				copy = [];
				for (var i = 0, len = obj.length; i < len; i++) {
					copy[i] = clone(obj[i]);
				}
				return copy;
			}

			// Handle Object
			if (obj instanceof Object) {
				copy = {};
				for (var attr in obj) {
					if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
				}
				return copy;
			}

			throw new Error("Unable to copy obj! Its type isn't supported.");

		};

	
		//Checks if the user clicked inside a completed annotation during edit mode (selected a shaoe)
		var checkIfInAnnoBounds = function (curPath, mPosCur, index) {
			if (curPath.leftmost < mPosCur.x && mPosCur.x < curPath.rightmost && curPath.topmost < mPosCur.y && mPosCur.y < curPath.bottommost) {
				selectedPaths.push( { path : clone(curPath), compIndex : index } );
				isInSelectedAnno = true;
			};
		};

		//Finds the smallest path that was selected in edit mode
		var findSmallestSelectedPath = function () {
			var smallestIndex = 0;
			for (var i = 0; i < selectedPaths.length; i++) {
				if (selectedPaths[smallestIndex].path.getBoundingBoxArea() > selectedPaths[i].path.getBoundingBoxArea()) {
					smallestIndex = i;
				}
			}
			
			return selectedPaths[smallestIndex];
		};
		
		//Redraws the completed shape on the interaction canvas for editing
		var drawSelectedPathIndicator = function () {
			var selectedPath = selectedPaths[selectedPathsCurIndex].path;
			intCx.beginPath();
			intCx.moveTo(selectedPath.x[0], selectedPath.y[0]);
			for (var i = 1; i < selectedPath.length; i++) {
				intCx.lineTo(selectedPath.x[i], selectedPath.y[i]);
			}
			intCx.stroke();
		};
			
		//Draws a given path in its entirety
		var drawPath = function (path) {
			anoCx.beginPath();
			anoCx.moveTo(path.x[0], path.y[0]);
			for (var i = 1; i < path.length; i++) {
				anoCx.lineTo(path.x[i], path.y[i]);
			}
			anoCx.stroke();
		};
		
		//Updates all the anchors on an edited path, and their bounding box
		var updateSelectedPath = function (md) {
			var cur = selectedPathsCurIndex;
			for (var i = 0; i < selectedPaths[cur].path.length; i++) {
				selectedPaths[cur].path.x[i] -= md.x;
				selectedPaths[cur].path.y[i] -= md.y;					
			}
			selectedPaths[cur].path.leftmost -= md.x;	
			selectedPaths[cur].path.rightmost -= md.x;	
			selectedPaths[cur].path.topmost -= md.y;	
			selectedPaths[cur].path.bottommost -= md.y;	
		};

		//Updates the completedPaths based on the corresponding selectedPaths
		var updateCompletedPaths = function () {
			var curInd = 0;
			for (var i = 0; i < selectedPaths.length; i++) {
				curInd = selectedPaths[i].compIndex;
				completedPaths[curInd] = clone(selectedPaths[i].path);
			}
		};
		
		//Updates a single anchor in selectedPaths
		var updateSelectedAnchor = function (md) {
			selectedPaths[selectedPathsCurIndex].path.x[selectedPathsAnchorIndex] -= md.x;
			selectedPaths[selectedPathsCurIndex].path.y[selectedPathsAnchorIndex] -= md.y;
		};

		//Draws the connecting edges to an anchor that is selected
		var drawSelectedAdjacentEdgesIndicator = function () {
			var path = selectedPaths[selectedPathsCurIndex].path;
			var anchInd = selectedPathsAnchorIndex;
			var lastInd = path.length - 1;
			
			intCx.beginPath();
			if (anchInd === 0) {
				// var lastA = path.x.length - 1;
				intCx.moveTo(path.x[lastInd], path.y[lastInd]);
			} else {
				intCx.moveTo(path.x[anchInd - 1], path.y[anchInd - 1]);
			}
			intCx.lineTo(path.x[anchInd], path.y[anchInd]);
			if (anchInd === (lastInd)) {
				intCx.lineTo(path.x[0], path.y[0]);
			} else {
				intCx.lineTo(path.x[anchInd + 1], path.y[anchInd + 1]);
			}
			intCx.stroke();
		};

		//Changes the snapZone in CONFIGS
		var changeSnapZone = function (val) {
			CONFIGS.snapZone = val;
		};
		
		//Saves the changes made to an annotation during edit mode
		var saveEditChanges = function () {
			$(document).trigger("handler_canvasIntClear");
			
			if (isAnchorSelected) {
				addLastAnchor(selectedPaths[selectedPathsCurIndex].path);
			};
			var selectedPath = selectedPaths[selectedPathsCurIndex].path;
			var selectedPathCompletedIndex = selectedPaths[selectedPathsCurIndex].compIndex;
			
			redrawCompletedPaths();
			
			for (var i = 0; i < selectedPaths.length; i++) {
				drawPath(selectedPaths[i].path);
			}
			drawPath(selectedPath);
			
			updateCompletedPaths();
			$(document).trigger("toolbar_updateAnnotationData");
			
			selectedPathsCurIndex = 0;
			selectedPathsAnchorIndex = null;
			selectedPaths = [];
			isInSelectedAnno = false;
			isEditingPath = false;
			isAnchorSelected = false;
			isShapeMoved = false;
		};

		//Redraw all the shapes that were not edited
		var redrawCompletedPaths = function () {
			$(document).trigger("handler_canvasAnoClear");
			var skipPath = false;
			for (var i = 0; i < completedPaths.length; i++) {
				for (var j = 0; j < selectedPaths.length; j++) {
					if (selectedPaths[j].compIndex === i) {
						skipPath = true;
					}
				}
				if (!skipPath) {
					drawPath(completedPaths[i]);
				}
				skipPath = false;
			}
			$(document).trigger("toolbar_updateAnnotationData");
		};
		
		//Sorts selected list of shapes by bounding box area
		var sortSelectedBBAscending = function (list) {
			var newList = [];
			var smallestInd = 0;
			var curInd = 1;
			var temp;
			while (list.length > 1) {
				if (list[smallestInd].path.getBoundingBoxArea() > list[curInd].path.getBoundingBoxArea()) {
					smallestInd = curInd;
				}
				
				curInd++;
				
				if (curInd === list.length) {
					temp = list.splice(smallestInd, 1);
					newList.push(temp[0]);
					smallestInd = 0;
					curInd = 1;
				}
			}
			//push the final element here
			temp = list.splice(0, 1);
			newList.push(temp[0]);
			
			selectedPaths = newList;
			
		};

		//Check if the next click was near an anchor's snapZone in a selected path
		var checkSelectedPathAnchors = function () {
			var mousePoint = mPos;
			var path = selectedPaths[selectedPathsCurIndex].path;
			for (var i = 0; i < path.length; i++) {
				var anchor = {
					x : path.x[i],
					y : path.y[i]
				};
				if (checkIfNearAnchor(mousePoint, anchor)) {

				//TODO: set up list of selected points
					isAnchorSelected = true;
					if (i === (path.length - 1)) {
						selectedPathsAnchorIndex = 0;
					} else {
						selectedPathsAnchorIndex = i;
					}
				}
			}
		};

		//Removes the last point so we dont start editing it if it is a duplicate of first
		var removeLastAnchorIfDuplicate = function (path) {
			if (path.x[0] === path.x[path.length - 1]
			&& path.y[0] === path.y[path.length - 1]) {
				path.removeLast();
			}

		};
		
		//Add the last anchor as a duplicate of the first one for SVG
		var addLastAnchor = function (path) {
			var pointX = path.x[0];
			var pointY = path.y[0];
			path.push(pointX, pointY);
		};
		
		self.getCompletedPaths = function () {
			return completedPaths;
		};
		
		//initialize modes to allow function expansion
		tool.POLY = Object.create(null);
		tool.EDIT = Object.create(null);
		
		tool.POLY.mousemove = function (e) {
			$(document).trigger("handler_canvasIntClear");
			drawIndicator();
		};
		
		tool.POLY.click = function (e) {
			if (isInSnapZone) {
				endPath();
			} else {
				addAnchor();
				continuePath();
				//console.log(anchorList);
			}
		};
		
		tool.EDIT.mousemove = function (e) {
			//console.log(isAnchorSelected);
			var md = { x : prevmPos.x - mPos.x, y : prevmPos.y - mPos.y };
			if (isMouseDown && isInSelectedAnno && !isAnchorSelected) {
				
				//change from previous mouse move to current on each mousemove
				$(document).trigger("handler_canvasIntClear");
				updateSelectedPath(md);
				drawSelectedPathIndicator();
				isShapeMoved = true;
			} else if (isMouseDown && isAnchorSelected) {
				console.log("EDITING ANCHOR");
				$(document).trigger("handler_canvasIntClear");
				updateSelectedAnchor(md);
				drawSelectedAdjacentEdgesIndicator();
			}
		};
		
		//TODO: probably need to separate these or make better conditions...
		tool.EDIT.click = function (e) {
			
			// selectedPaths = [];
			if (!isEditingPath) {
				//console.log(completedPaths);
				//console.log(tool.MODE);
				console.log("Detected Shape!!");
				
				var mPosCur = mPos;
				
				for (var i = 0; i < completedPaths.length; i++) {
					checkIfInAnnoBounds(completedPaths[i], mPosCur, i);
				}
				
				if (selectedPaths.length > 0) {
					sortSelectedBBAscending(selectedPaths);
					console.log("Completed Sort.");
					console.log(selectedPaths);
					selectedPathsCurIndex = 0;
				} else {
					return;
				}
				isEditingPath = true;
				//console.log(selectedPaths);
				
				
				drawSelectedPathIndicator();
				
				//console.log(selectedPaths);
			} else if (!isAnchorSelected && isEditingPath && !isShapeMoved)  {
				console.log("Attempting to edit ANCHOR!!");
				checkSelectedPathAnchors();
				if (isAnchorSelected) {
					$(document).trigger("handler_canvasIntClear");
					//We remove the last point so we dont mess with the duplicate
					//(the duplicate is the first and last point, used for SVG tag)
					//TODO: maybe only add the duplicate when saving...
					console.log(selectedPaths[selectedPathsCurIndex].path);
					console.log(selectedPaths[selectedPathsCurIndex].path.x[0]);
					removeLastAnchorIfDuplicate(selectedPaths[selectedPathsCurIndex].path);
					console.log(selectedPaths[selectedPathsCurIndex].path);
					console.log("Removed last point");
					drawSelectedAdjacentEdgesIndicator();
				}
			}
		};
		
		
		tool.EDIT.space = function (e) {
			//this will be used to cycle through overlapping shapes...
			
			if (!isShapeMoved && !isAnchorSelected) {
				//do nothing
			} else {
				console.log("RETURNING");
				return;
			}
			if ( (selectedPathsCurIndex + 1) === selectedPaths.length) {
				selectedPathsCurIndex = 0;
			} else {
				selectedPathsCurIndex++;
			}
			$(document).trigger("handler_canvasIntClear");
			drawSelectedPathIndicator();
			
			
		};
		
		tool.EDIT.enter = function (e) {
			saveEditChanges();
		};
		
	};

	
	
	
	
	