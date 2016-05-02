/**
All of the sections on the "projects" page have the same layout.
This simply generates these elements and appends the individual
text sections to them.	
*/
$(document).ready(function(){
	var heads = ["Prototype","YouTube Playlist Extension", "Java Maze Game",
	"Java Checkers","Java ChemHandler"];
	var ids = ["farm","yt","maze","checkers","chem"];
	var div = $("<div>");
	var container = $('<div class="container">');
	var divhead = $('<div class="mini-header-div">');
	var body = $("body");
	
	
	var recreate = function(){
		div = $("<div>");
		container = $('<div class="container">');
		divhead = $('<div class="mini-header-div">');
		body = $("body");	
	};
	
	
	var li;
	for(var i = 0; i < ids.length; i++){
		li = $("<li>");
		li.append('<a href="#' + ids[i] + '">' + heads[i] + '</a>' );
		$("ul").append(li);
	}
	
	
	
	for(var i = 0; i < heads.length; i++){
		div.append($("p:eq(1)"));
		divhead.html(heads[i]);
		divhead.attr('id',ids[i]);
		container.append(divhead);
		container.append(div);
		body.append(container);
		recreate();
	}
});