/*\
title: $:/core/modules/widgets/element.js
type: application/javascript
module-type: widget

Element widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var ElementWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
ElementWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
ElementWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	// Neuter blacklisted elements
	var tag = this.parseTreeNode.tag;
	if($tw.config.htmlUnsafeElements.indexOf(tag) !== -1) {
		tag = "safe-" + tag;
	}
	var domNode = this.document.createElementNS(this.namespace,tag);
	this.assignAttributes(domNode,{excludeEventAttributes: true});
	parent.insertBefore(domNode,nextSibling);
	this.renderChildren(domNode,null);
	this.domNodes.push(domNode);
};

/*
Compute the internal state of the widget
*/
ElementWidget.prototype.execute = function() {
	// Select the namespace for the tag
	var tagNamespaces = {
			svg: "http://www.w3.org/2000/svg",
			math: "http://www.w3.org/1998/Math/MathML",
			body: "http://www.w3.org/1999/xhtml"
		};
	this.namespace = tagNamespaces[this.parseTreeNode.tag];
	if(this.namespace) {
		this.setVariable("namespace",this.namespace);
	} else {
		this.namespace = this.getVariable("namespace",{defaultValue: "http://www.w3.org/1999/xhtml"});
	}
	// Make the child widgets
	this.makeChildWidgets();
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
ElementWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes(),
		hasChangedAttributes = $tw.utils.count(changedAttributes) > 0;
	if(hasChangedAttributes) {
		// Update our attributes
		this.assignAttributes(this.domNodes[0],{excludeEventAttributes: true});
	}
	return this.refreshChildren(changedTiddlers) || hasChangedAttributes;
};

exports.element = ElementWidget;

})();
