/*\
title: $:/core/modules/startup/windows.js
type: application/javascript
module-type: startup

Setup root widget handlers for the messages concerned with opening external browser windows

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "windows";
exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = true;

// Global to keep track of open windows (hashmap by title)
var windows = {};

exports.startup = function() {
	// Handle open window message
	$tw.rootWidget.addEventListener("tm-open-window",function(event) {
		// Get the parameters
		var refreshHandler,
			title = event.param || event.tiddlerTitle,
			paramObject = event.paramObject || {},
			template = paramObject.template || "$:/core/templates/single.tiddler.window",
			print = paramObject.print === "yes",
			width = paramObject.width || "700",
			height = paramObject.height || "600",
			variables = $tw.utils.extend({},paramObject,{currentTiddler: title});
		// Open the window
		var srcWindow = window.open("","external-" + title,"scrollbars,width=" + width + ",height=" + height),
			srcDocument = srcWindow.document;
		windows[title] = srcWindow;
		// Check for reopening the same window
		if(srcWindow.haveInitialisedWindow) {
			return;
		}
		// Initialise the document
		srcDocument.write("<html><head></head><body class='tc-body tc-single-tiddler-window'></body></html>");
		srcDocument.close();
		srcDocument.title = title;
		srcWindow.addEventListener("beforeunload",function(event) {
			delete windows[title];
			$tw.wiki.removeEventListener("change",refreshHandler);
		},false);
		// Set up the styles
		var styleWidgetNode = $tw.wiki.makeTranscludeWidget("$:/core/ui/PageStylesheet",{
				document: $tw.fakeDocument,
				variables: variables,
				importPageMacros: true}),
			styleContainer = $tw.fakeDocument.createElement("style");
		styleWidgetNode.render(styleContainer,null);
		var styleElement = srcDocument.createElement("style");
		styleElement.innerHTML = styleContainer.textContent;
		srcDocument.head.insertBefore(styleElement,srcDocument.head.firstChild);
		// Render the text of the tiddler
		var parser = $tw.wiki.parseTiddler(template),
			widgetNode = $tw.wiki.makeWidget(parser,{document: srcDocument, parentWidget: $tw.rootWidget, variables: variables});
		widgetNode.render(srcDocument.body,srcDocument.body.firstChild);
		// Print the window if required
		if(print) {
				srcWindow.print();
		}
		// Function to handle refreshes
		refreshHandler = function(changes) {
			if(styleWidgetNode.refresh(changes,styleContainer,null)) {
				styleElement.innerHTML = styleContainer.textContent;
			}
			widgetNode.refresh(changes);
		};
		$tw.wiki.addEventListener("change",refreshHandler);
		srcWindow.haveInitialisedWindow = true;
	});
	// Close open windows when unloading main window
	$tw.addUnloadTask(function() {
		$tw.utils.each(windows,function(win) {
			win.close();
		});
	});

};

})();
