/*\
title: $:/core/modules/widgets/action-navigate.js
type: application/javascript
module-type: widget

Action widget to navigate to a tiddler

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var NavigateWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
NavigateWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
NavigateWidget.prototype.render = function(parent,nextSibling) {
	this.computeAttributes();
	this.execute();
};

/*
Compute the internal state of the widget
*/
NavigateWidget.prototype.execute = function() {
	this.actionTo = this.getAttribute("$to");
	this.actionScroll = this.getAttribute("$scroll");
};

/*
Refresh the widget by ensuring our attributes are up to date
*/
NavigateWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if(changedAttributes["$to"] || changedAttributes["$scroll"]) {
		this.refreshSelf();
		return true;
	}
	return this.refreshChildren(changedTiddlers);
};

/*
Invoke the action associated with this widget
*/
NavigateWidget.prototype.invokeAction = function(triggeringWidget,event) {
	var bounds = triggeringWidget && triggeringWidget.getBoundingClientRect && triggeringWidget.getBoundingClientRect(),
		suppressNavigation = event.metaKey || event.ctrlKey || (event.button === 1);
	if(this.actionScroll === "yes") {
		suppressNavigation = false;
	} else if(this.actionScroll === "no") {
		suppressNavigation = true;
	}
	this.dispatchEvent({
		type: "tm-navigate",
		navigateTo: this.actionTo === undefined ? this.getVariable("currentTiddler") : this.actionTo,
		navigateFromTitle: this.getVariable("storyTiddler"),
		navigateFromNode: triggeringWidget,
		navigateFromClientRect: bounds && { top: bounds.top, left: bounds.left, width: bounds.width, right: bounds.right, bottom: bounds.bottom, height: bounds.height
		},
		navigateSuppressNavigation: suppressNavigation
	});
	return true; // Action was invoked
};

exports["action-navigate"] = NavigateWidget;

})();
