/*\
title: $:/core/modules/utils/dom.js
type: application/javascript
module-type: utils

Various static DOM-related utility functions.

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Determines whether element 'a' contains element 'b'
Code thanks to John Resig, http://ejohn.org/blog/comparing-document-position/
*/
exports.domContains = function(a,b) {
	return a.contains ?
		a !== b && a.contains(b) :
		!!(a.compareDocumentPosition(b) & 16);
};

exports.removeChildren = function(node) {
	while(node.hasChildNodes()) {
		node.removeChild(node.firstChild);
	}
};

exports.hasClass = function(el,className) {
	return el && el.className && el.className.toString().split(" ").indexOf(className) !== -1;
};

exports.addClass = function(el,className) {
	var c = el.className.split(" ");
	if(c.indexOf(className) === -1) {
		c.push(className);
	}
	el.className = c.join(" ");
};

exports.removeClass = function(el,className) {
	var c = el.className.split(" "),
		p = c.indexOf(className);
	if(p !== -1) {
		c.splice(p,1);
		el.className = c.join(" ");
	}
};

exports.toggleClass = function(el,className,status) {
	if(status === undefined) {
		status = !exports.hasClass(el,className);
	}
	if(status) {
		exports.addClass(el,className);
	} else {
		exports.removeClass(el,className);
	}
};

/*
Get the first parent element that has scrollbars or use the body as fallback.
*/
exports.getScrollContainer = function(el) {
	var doc = el.ownerDocument;
	while(el.parentNode) {	
		el = el.parentNode;
		if(el.scrollTop) {
			return el;
		}
	}
	return doc.body;
};

/*
Get the scroll position of the viewport
Returns:
	{
		x: horizontal scroll position in pixels,
		y: vertical scroll position in pixels
	}
*/
exports.getScrollPosition = function() {
	if("scrollX" in window) {
		return {x: window.scrollX, y: window.scrollY};
	} else {
		return {x: document.documentElement.scrollLeft, y: document.documentElement.scrollTop};
	}
};

/*
Adjust the height of a textarea to fit its content, preserving scroll position, and return the height
*/
exports.resizeTextAreaToFit = function(domNode,minHeight) {
	// Get the scroll container and register the current scroll position
	var container = $tw.utils.getScrollContainer(domNode),
		scrollTop = container.scrollTop;
    // Measure the specified minimum height
	domNode.style.height = minHeight;
	var measuredHeight = domNode.offsetHeight || parseInt(minHeight,10);
	// Set its height to auto so that it snaps to the correct height
	domNode.style.height = "auto";
	// Calculate the revised height
	var newHeight = Math.max(domNode.scrollHeight + domNode.offsetHeight - domNode.clientHeight,measuredHeight);
	// Only try to change the height if it has changed
	if(newHeight !== domNode.offsetHeight) {
		domNode.style.height = newHeight + "px";
		// Make sure that the dimensions of the textarea are recalculated
		$tw.utils.forceLayout(domNode);
		// Set the container to the position we registered at the beginning
		container.scrollTop = scrollTop;
	}
	return newHeight;
};

/*
Gets the bounding rectangle of an element in absolute page coordinates
*/
exports.getBoundingPageRect = function(element) {
	var scrollPos = $tw.utils.getScrollPosition(),
		clientRect = element.getBoundingClientRect();
	return {
		left: clientRect.left + scrollPos.x,
		width: clientRect.width,
		right: clientRect.right + scrollPos.x,
		top: clientRect.top + scrollPos.y,
		height: clientRect.height,
		bottom: clientRect.bottom + scrollPos.y
	};
};

/*
Saves a named password in the browser
*/
exports.savePassword = function(name,password) {
	try {
		if(window.localStorage) {
			localStorage.setItem("tw5-password-" + name,password);
		}
	} catch(e) {
	}
};

/*
Retrieve a named password from the browser
*/
exports.getPassword = function(name) {
	try {
		return window.localStorage ? localStorage.getItem("tw5-password-" + name) : "";
	} catch(e) {
		return "";
	}
};

/*
Force layout of a dom node and its descendents
*/
exports.forceLayout = function(element) {
	var dummy = element.offsetWidth;
};

/*
Pulse an element for debugging purposes
*/
exports.pulseElement = function(element) {
	// Event handler to remove the class at the end
	element.addEventListener($tw.browser.animationEnd,function handler(event) {
		element.removeEventListener($tw.browser.animationEnd,handler,false);
		$tw.utils.removeClass(element,"pulse");
	},false);
	// Apply the pulse class
	$tw.utils.removeClass(element,"pulse");
	$tw.utils.forceLayout(element);
	$tw.utils.addClass(element,"pulse");
};

/*
Attach specified event handlers to a DOM node
domNode: where to attach the event handlers
events: array of event handlers to be added (see below)
Each entry in the events array is an object with these properties:
handlerFunction: optional event handler function
handlerObject: optional event handler object
handlerMethod: optionally specifies object handler method name (defaults to `handleEvent`)
*/
exports.addEventListeners = function(domNode,events) {
	$tw.utils.each(events,function(eventInfo) {
		var handler;
		if(eventInfo.handlerFunction) {
			handler = eventInfo.handlerFunction;
		} else if(eventInfo.handlerObject) {
			if(eventInfo.handlerMethod) {
				handler = function(event) {
					eventInfo.handlerObject[eventInfo.handlerMethod].call(eventInfo.handlerObject,event);
				};	
			} else {
				handler = eventInfo.handlerObject;
			}
		}
		domNode.addEventListener(eventInfo.name,handler,false);
	});
};

/*
Get the computed styles applied to an element as an array of strings of individual CSS properties
*/
exports.getComputedStyles = function(domNode) {
	var textAreaStyles = window.getComputedStyle(domNode,null),
		styleDefs = [],
		name;
	for(var t=0; t<textAreaStyles.length; t++) {
		name = textAreaStyles[t];
		styleDefs.push(name + ": " + textAreaStyles.getPropertyValue(name) + ";");
	}
	return styleDefs;
};

/*
Apply a set of styles passed as an array of strings of individual CSS properties
*/
exports.setStyles = function(domNode,styleDefs) {
	domNode.style.cssText = styleDefs.join("");
};

/*
Copy the computed styles from a source element to a destination element
*/
exports.copyStyles = function(srcDomNode,dstDomNode) {
	$tw.utils.setStyles(dstDomNode,$tw.utils.getComputedStyles(srcDomNode));
};

/*
Copy plain text to the clipboard on browsers that support it
*/
exports.copyToClipboard = function(text,options) {
	options = options || {};
	var textArea = document.createElement("textarea");
	textArea.style.position = "fixed";
	textArea.style.top = 0;
	textArea.style.left = 0;
	textArea.style.fontSize = "12pt";
	textArea.style.width = "2em";
	textArea.style.height = "2em";
	textArea.style.padding = 0;
	textArea.style.border = "none";
	textArea.style.outline = "none";
	textArea.style.boxShadow = "none";
	textArea.style.background = "transparent";
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.select();
	textArea.setSelectionRange(0,text.length);
	var succeeded = false;
	try {
		succeeded = document.execCommand("copy");
	} catch (err) {
	}
	if(!options.doNotNotify) {
		$tw.notifier.display(succeeded ? "$:/language/Notifications/CopiedToClipboard/Succeeded" : "$:/language/Notifications/CopiedToClipboard/Failed");
	}
	document.body.removeChild(textArea);
};

})();
