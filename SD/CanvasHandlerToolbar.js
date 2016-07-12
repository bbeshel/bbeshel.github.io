

var CanvasHandlerToolbar = function (parentContext) {
	
	var chandlerParent = parentContext;
	
	var self = this;
	
	self.MODE = "";
	
	var $opModeSelector = $("<select id='opModeSelector' class='toolbarItem'></select>");
	
	var $jsonDisplay = $("<textarea readonly id='jsonToolbarDisplay' class='toolbarItem'></textarea>");
	
	var $toolDiv = $("<div id='toolContainer'></div>");
	
	var $buttonEdit = $("<button class='buttonEdit'>EDIT</button>");
	
	var $snapZoneSlider = $("<input id='snapZoneSlider' class='toolbarItem' type='range' min='1' max='26' step='5' value='10'/>");
	
	var $saveEditChanges = $("<button id='saveEditChanges' class='toolbarItem'>Save Changes</button>");
	
	this.init = function ($parent) {
		self.MODE = chandlerParent.MODES[0];
		for (var n in chandlerParent.MODES) {
			var $op = $(
				"<option value='" + chandlerParent.MODES[n] + "'>" 
				+ chandlerParent.MODE_NAMES[n] + "</option>"
			);
			
			$opModeSelector.append($op);
			
		}
		
		
		
		$parent.append($toolDiv);
		
		
		// $toolDiv.append($buttonEdit);
		$toolDiv.append($opModeSelector);
		$toolDiv.append($snapZoneSlider);
		$toolDiv.append($jsonDisplay);
		// $toolDiv.append($saveEditChanges);
		
		$opModeSelector.on("change", function () {
			var val = $opModeSelector.val();
			$(document).trigger("toolbar_changeOperationMode", [val]);
			// changeCanvasMode($opModeSelector.val());
		});
		
		$snapZoneSlider.on("change", function () {
			// chandlerParent.changeSnapZone($snapZoneSlider.val());
			var val = parseInt($snapZoneSlider.val());
			$(document).trigger("handler_changeSnapZone", [val]);
		});
		
		$saveEditChanges.on("click", function () {
			$(document).trigger("handler_saveEditChanges");
		});
		
		$(document).on("toolbar_changeOperationMode", function (e, data) {
			changeCanvasMode(data);
		});
		
		$(document).on("toolbar_updateAnnotationData", function () {
			$jsonDisplay.val("");
			var string = "";
			var annos = chandlerParent.getCompletedPaths();
			for (var i = 0; i < annos.length; i++) {
				if (annos[i].JSON != null) {
					string += JSON.stringify(annos[i].JSON);
				}
			}
			$jsonDisplay.val(string);
		});
		// $buttonEdit.on("click", function () {
			// changeCanvasMode("EDIT");
		// });
	};
	
	var toolbarAppend = function ($el) {
		$toolDiv.append($el);
	};
	
	//removes all associated tool elements except the opModeSelector
	var toolbarClear = function () {
		// console.log($toolDiv.slice);
		$toolDiv.children().not($opModeSelector).not($jsonDisplay).detach();
	};
	
	var toolbarModeInit = function () {
		toolbarClear();
		switch (self.MODE) {
			case "POLY":
				toolbarAppend($snapZoneSlider);
			break;
			case "EDIT":
				toolbarAppend($saveEditChanges);
			break;
			case "RECT":
			break;
			case "CIRC":
			break;
			case "ANNO":
			break;
		}
	};
	
	var changeCanvasMode = function (mode) {
		self.MODE = mode;
		$(document).trigger("handler_canvasIntClear");
		toolbarModeInit();
	};
	
	
	
	
};