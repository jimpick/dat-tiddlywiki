/*\
title: $:/core/modules/parsers/wikiparser/rules/prettylink.js
type: application/javascript
module-type: wikirule

Wiki text inline rule for pretty links. For example:

```
[[Introduction]]

[[Link description|TiddlerTitle]]
```

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.name = "prettylink";
exports.types = {inline: true};

exports.init = function(parser) {
	this.parser = parser;
	// Regexp to match
	this.matchRegExp = /\[\[(.*?)(?:\|(.*?))?\]\]/mg;
};

exports.parse = function() {
	// Move past the match
	this.parser.pos = this.matchRegExp.lastIndex;
	// Process the link
	var text = this.match[1],
		link = this.match[2] || text;
	if($tw.utils.isLinkExternal(link)) {
		return [{
			type: "element",
			tag: "a",
			attributes: {
				href: {type: "string", value: link},
				"class": {type: "string", value: "tc-tiddlylink-external"},
				target: {type: "string", value: "_blank"},
				rel: {type: "string", value: "noopener noreferrer"}
			},
			children: [{
				type: "text", text: text
			}]
		}];
	} else {
		return [{
			type: "link",
			attributes: {
				to: {type: "string", value: link}
			},
			children: [{
				type: "text", text: text
			}]
		}];
	}
};

})();
