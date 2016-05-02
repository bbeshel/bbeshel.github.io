/*
/*
 * CanvasHandler.js
 * Author: Ben Beshel, Graison Day
 * Handler for IIIF Canvases for T-PEN. 
*/

	var CanvasHandler = function () {
		
		var CONFIGS = {
			anno : {
				strokeStyle : "black",
				lineWidth : 1
			},
			feedback : {
				strokeStyle : "red",
				lineWidth : 1,
				cursorSize : 5
			}
		}
		
		//Universal canvas mouse position
		var mPos;
		
		//Container for HTML positioning, allows layering of canvases
		//Normally, I abstain from inline CSS, but for now it's okay
		var $container = $("<div id='canvasContainer' style='position: relative;'></div>");

		//The canvas that holds the image
		var $imgCanvas;
		var imgCanvas;
		var imgCx;
			
		//The canvas that displays immediate interaction
		var $fbkCanvas;
		var fbkCanvas;
		var fbkCx;
		
		//The canvas that loads and allows creation of annotations
		var $intCanvas;
		var intCanvas;
		var intCx;
		
		//May not need
		//Used as a bool for choosing on canvas click to end the path
		var userEndedPath = false;
		
		//Stores all "anchor lists" that are completed
		var completedPaths = [];
		
		//LOOK here for list of SVG after closing a path
		//Stores HTML complete SVG tags defined by an anchor list path
		var svgTags = [];
		//Some styling
		var svgStrokeColor = "stroke:black;";
		var svgLineWidth = "line-width:5;";
		var svgFillStyle = "fill:none;";
		
		var svgPrefix = "<svg xmlns=\"http://www.w3.org/2000/svg\""
		var svgSuffix = "</svg>";
		
		var anchorList = {
			x: [],
			y: [],
			length: 0,
			leftmost: 100000,
			rightmost: 0,
			topmost: 100000,
			bottommost: 0,
			push: function (px, py) {
				this.x.push(px);
				this.y.push(py);
				this.length++;
				
				this.updateBounds(px, py);
			},
			clear: function () {
				this.x = [];
				this.y = [];
				this.length = 0;
			},
			updateBounds: function (px, py) {
				this.leftmost = px < this.leftmost ? px : this.leftmost;
				this.rightmost = px > this.rightmost ? px : this.rightmost;
				this.topmost = py < this.topmost ? py : this.topmost;
				this.bottommost = py > this.bottommost ? py : this.bottommost;
			}
		};
		
		//creates a context variable to access member functions
		var self = this;
		
		this.init = function () {
			
			
			var endPathBtn = $("<button id='endCurrentPathBtn' style='position: relative;'>End Current Path</button>");
			endPathBtn.on("click", endPath);
			$("body").append(endPathBtn);
			//TODO: need to get image dynamically from json
			var img2 = new Image();
			img2.src = "http://norman.hrc.utexas.edu/graphics/mswaste/160 h612e 617/160_h612e_617_001.jpg";
			
			
			$imgCanvas = $("<canvas id='imgCanvas' style='position: absolute;'>");
			imgCanvas = $imgCanvas.get(0);
			imgCx = imgCanvas.getContext("2d");
			//TODO: need to have dynamic parent to append to
			//TODO: find default ID to attach to, or take as param.
			$container.append($imgCanvas);
			
			$fbkCanvas = $("<canvas id='fbkCanvas' style='position: absolute;'>");
			fbkCanvas = $fbkCanvas.get(0);
			fbkCx = fbkCanvas.getContext("2d");
			$container.append($fbkCanvas);
			
			$intCanvas = $("<canvas id='intCanvas' style='position: absolute;'>");
			intCanvas = $intCanvas.get(0);
			intCx = intCanvas.getContext("2d");
			$container.append($intCanvas);
			
			//TODO: set canvas size based on parsed info, unless missing
			//LOOK: add variable image tag for onload based on parsed content
			var img = $("<img src='http://norman.hrc.utexas.edu/graphics/mswaste/160 h612e 617/160_h612e_617_001.jpg' />");
			img.on("load", function () {
				//TODO: make sure size of canvas conforms to standard
				imgCanvas.width = img.get(0).width;
				imgCanvas.height = img.get(0).height;
				imgCx.drawImage(img.get(0), 0, 0);
				fbkCanvas.width = imgCanvas.width;
				fbkCanvas.height = imgCanvas.height;
				intCanvas.width = imgCanvas.width;
				intCanvas.height = imgCanvas.height;
			});
			
			
			
			$("body").append($container);

			
			$intCanvas.bind("mousemove", function(e) {
				moveCallback(e);
				//TODO: consider firing event instead
				fbkCx.clearRect(0, 0, fbkCanvas.width, fbkCanvas.height);
				drawIndicator(e);
			});
			
			$intCanvas.bind("click", function(e) {
				addAnchor();
				continuePath();
				console.log(anchorList);
			});
			 
			

			
		};
		
		this.getMousePos = function(evt) {
			var rect = imgCanvas.getBoundingClientRect();
			return {
				x: Math.floor((evt.clientX - rect.left)/(rect.right-rect.left)*imgCanvas.width),
				y: Math.floor((evt.clientY - rect.top)/(rect.bottom-rect.top)*imgCanvas.height)
			};
		};	
		
		var moveCallback = function (e) {
			mPos = self.getMousePos(e);
		};
		
		var drawIndicator = function (e) {
			fbkCx.beginPath();
			//TODO: make this permanent before calls somehow
			fbkCx.lineWidth = CONFIGS.feedback.lineWidth;
			fbkCx.strokeStyle = CONFIGS.feedback.strokeStyle;

			fbkCx.arc(mPos.x, mPos.y, 5, 0, 360);
			fbkCx.stroke();
			
			if (anchorList.length > 0) {
				fbkCx.beginPath();
				fbkCx.moveTo(
					anchorList.x[anchorList.length-1], 
					anchorList.y[anchorList.length-1]
				);
				fbkCx.lineTo(mPos.x, mPos.y);
				fbkCx.stroke();
			}
		};
		
		var continuePath = function () {
			if (anchorList.length > 1) {
				intCx.beginPath();
				intCx.lineWidth = CONFIGS.anno.lineWidth;
				intCx.strokeStyle = CONFIGS.anno.strokeStyle;
				intCx.moveTo(
					anchorList.x[anchorList.length-2], 
					anchorList.y[anchorList.length-2]
				);
				intCx.lineTo(
					anchorList.x[anchorList.length-1], 
					anchorList.y[anchorList.length-1]
				);
				intCx.stroke();
				
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
				if (userEndedPath) {
					userEndedPath = false;
					//TODO: implement user closed path
				} else {
					intCx.beginPath();
					intCx.moveTo(
						anchorList.x[0],
						anchorList.y[0]
					);
					intCx.lineTo(
						anchorList.x[anchorList.length-1],
						anchorList.y[anchorList.length-1]
					);
					intCx.stroke();
					
					anchorList.push(anchorList.x[0], anchorList.y[0]);
					completedPaths.push(anchorList);
					createSVGTag(anchorList);
					anchorList.clear();
				}
			}
		}
		
		var addAnchor = function () {
			anchorList.push(mPos.x, mPos.y);
		};
		
		var createSVGTag = function (anchors) {
			//Not sure if we need this width/height
			var str = svgPrefix +
				"width=\"" + anchors.rightmost + "\" " + 
				"height=\"" + anchors.bottommost + "\"" +
				">" +
				"<polygon points=\"";
				
			for (var i = 0; i < anchors.length; i++) {
				str += anchors.x[i] + "," + anchors.y[i] + " ";
			}
			str += "\"";
			str += "style=\"" + svgLineWidth + svgStrokeColor + svgFillStyle + "\" />"
			str += svgSuffix;
			svgTags.push(str);
			var svg = $(str);
			
			//TODO: remove, testing only
			// intCx.clearRect(0, 0, intCanvas.width, intCanvas.height);
			// anchorList.clear();
			
			// readSVGTag(str);
			
			console.log(svgTags);
			console.log(svg.get(0));
		};
		
		var readSVGTag = function (tag) {
			var $tag = $.parseHTML(tag);
			
			console.log($tag);
			console.log($tag[0].lastChild.animatedPoints[0]);
			console.log($tag[0].hasOwnProperty("lastChild"));
			console.log($tag[0].lastChild.hasOwnProperty("animatedPoints"));
			
			//TODO: need to check if properties exist. hasOwnProperty doesnt work, doesnt extend object prototype.
			// if ($tag[0].hasOwnProperty("lastChild") && $tag[0].lastChild.hasOwnProperty("animatedPoints")) {
				var pList = $tag[0].lastChild.animatedPoints;
				console.log("pushing");
				console.log(pList[0]);
				console.log(pList[0].x);
				for (var i = 0; i < pList.length; i++) {
					anchorList.push(pList[i].x, pList[i].y);
				}
			// }
			drawCompletedPath(anchorList);
		};
		
		//TODO: May need to check if 0 and n points match
		var drawCompletedPath = function (list) {
			intCx.beginPath();
			intCx.moveTo(list.x[0], list.y[0]);
			for (var i = 1; i < list.length; i++) {
				intCx.lineTo(list.x[i], list.y[i]);
			}
			intCx.stroke();
			anchorList.clear();
		};
		
		
		
	};

	
	
	
	
	