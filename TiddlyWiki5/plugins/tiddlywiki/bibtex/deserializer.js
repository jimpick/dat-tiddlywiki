/*\
title: $:/plugins/tiddlywiki/excel-utils/deserializer.js
type: application/javascript
module-type: tiddlerdeserializer

XLSX file deserializer

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var bibtexParse = require("$:/plugins/tiddlywiki/bibtex/bibtexParse.js");

/*
Parse an XLSX file into tiddlers
*/
exports["application/x-bibtex"] = function(text,fields) {
	var data,
		results = [];
	// Parse the text
	try {
		data = bibtexParse.toJSON(text)
	} catch(ex) {
		data = ex.toString();
	}
	if(typeof data === "string") {
		return [{
			title: "BibTeX import error: " + data,
		}];
	}
	// Convert each entry
	$tw.utils.each(data,function(entry) {
		var fields = {
			title: entry.citationKey,
			"bibtex-entry-type": entry.entryType
		};
		$tw.utils.each(entry.entryTags,function(value,name) {
			fields["bibtex-" + name] = value;
		});
		results.push(fields);
	});
	// Return the output tiddlers
	return results;
};

})();
