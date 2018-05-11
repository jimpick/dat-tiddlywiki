/*\
title: $:/core/modules/widgets/range.js
type: application/javascript
module-type: widget

Range widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var RangeWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
RangeWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
RangeWidget.prototype.render = function(parent,nextSibling) {
	// Save the parent dom node
	this.parentDomNode = parent;
	// Compute our attributes
	this.computeAttributes();
	// Execute our logic
	this.execute();
	// Create our elements
	this.inputDomNode = this.document.createElement("input");
	this.inputDomNode.setAttribute("type","range");
	this.inputDomNode.setAttribute("class",this.elementClass);
	if(this.minValue){
		this.inputDomNode.setAttribute("min", this.minValue);
	}
	if(this.maxValue){
		this.inputDomNode.setAttribute("max", this.maxValue);
	}
	if(this.increment){
		this.inputDomNode.setAttribute("step", this.increment);
	}
	this.inputDomNode.value = this.getValue();


	// Add a click event handler
	$tw.utils.addEventListeners(this.inputDomNode,[
		{name: "input", handlerObject: this, handlerMethod: "handleChangeEvent"}
	]);
	// Insert the label into the DOM and render any children
	parent.insertBefore(this.inputDomNode,nextSibling);
	this.domNodes.push(this.inputDomNode);
};

RangeWidget.prototype.getValue = function() {
	var tiddler = this.wiki.getTiddler(this.tiddlerTitle),
		value   = this.defaultValue;
	if(tiddler) {
		if($tw.utils.hop(tiddler.fields,this.tiddlerField)) {
			value = tiddler.fields[this.tiddlerField] || "";
		} else {
			value = this.defaultValue || "";
		}
	}
	return value;
};

RangeWidget.prototype.handleChangeEvent = function(event) {
	this.wiki.setText(this.tiddlerTitle ,this.tiddlerField, null,this.inputDomNode.value);
};

/*
Compute the internal state of the widget
*/
RangeWidget.prototype.execute = function() {
	// Get the parameters from the attributes
	this.tiddlerTitle = this.getAttribute("tiddler",this.getVariable("currentTiddler"));
	this.tiddlerField = this.getAttribute("field");
	this.minValue = this.getAttribute("min");
	this.maxValue = this.getAttribute("max");
	this.increment = this.getAttribute("increment");
	this.defaultValue = this.getAttribute("default");
	this.elementClass = this.getAttribute("class","");
	// Make the child widgets
	this.makeChildWidgets();
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
RangeWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.tiddler || changedAttributes.field || changedAttributes['min'] || changedAttributes['max'] || changedAttributes['increment'] || changedAttributes["default"] || changedAttributes["class"]) {
		this.refreshSelf();
		return true;
	} else {
		var refreshed = false;
		if(changedTiddlers[this.tiddlerTitle]) {
			this.inputDomNode.checked = this.getValue();
			refreshed = true;
		}
		return this.refreshChildren(changedTiddlers) || refreshed;
	}
};

exports.range = RangeWidget;

})();
