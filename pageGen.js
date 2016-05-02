/**
All of the sections on the "code" page have the same layout.
This simply generates these elements and appends the individual
text sections to them.	
*/
$(document).ready(function(){
	var heads = ["C++", "Assembly x86", "LEX/FLEX", 
		"Haskell", "Java"];
	var ids = ["cplus","x86","lex","hask","java"];
	var div = $("<div>");
	var container = $('<div class="container">');
	var divhead = $('<div class="mini-header-div">');
	var body = $("body");
	
	//makes fresh versions of each element
	var recreate = function(){
		div = $("<div>");
		container = $('<div class="container">');
		divhead = $('<div class="mini-header-div">');
		body = $("body");	
	};
	
	//creates the directory
	var li;
	for(var i = 0; i < ids.length; i++){
		li = $("<li>");
		li.append('<a href="#' + ids[i] + '">' + heads[i] + '</a>' );
		$("ul").append(li);
	}
	
	
	//creates content panels
	var textList = $(".lang-content");
	for(var i = 0; i < heads.length; i++){
		div.append(textList[i]);
		divhead.html(heads[i]);
		divhead.attr('id',ids[i]);
		container.append(divhead);
		container.append(div);
		body.append(container);
		recreate();
	}
});