(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

if ($tw.node) return // Client-side only for now

function HyperdriveAdaptor(options) {
  var self = this;
  this.wiki = options.wiki;
  this.logger = new $tw.utils.Logger("hyperdrive",{colour: "blue"});
}

HyperdriveAdaptor.prototype.name = "hyperdrive";

HyperdriveAdaptor.prototype.isReady = function() {
  // FIXME
  return true;
}

HyperdriveAdaptor.prototype.getTiddlerInfo = function(tiddler) {
  return {};
}

/*
Get an array of skinny tiddler fields from the archive
*/

const tiddlers = [
]

HyperdriveAdaptor.prototype.getSkinnyTiddlers = function(callback) {
  var self = this;
  if (tiddlers.length === 0) {
    tiddlers.push({
      title: "Banana Ham Loaf",
      created: "20180514211415972",
      modified: "20180514211617113",
      tags: "",
      type: "text/vnd.tiddlywiki",
      revision: 0
    })
  }
  console.log('Jim getSkinnyTiddlers', tiddlers)
  callback(null,tiddlers);
}

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
HyperdriveAdaptor.prototype.saveTiddler = function(tiddler,callback) {
  var self = this;
  // FIXME
  callback(null, {}, "0");
}

const bananaHamLoaf = `created: 20180514211415972
modified: 20180514211617113
tags:
title: Banana Ham Loaf
type: text/vnd.tiddlywiki

This makes a nice luncheon dish served cold.

* 1 egg
* 1/2 cup apple cider
* 1 teaspoon coriander
* 3 tablespoons green tomato piccalilli relish or dill pickle relish
* 1 pound coarsely ground lean ham
* 1 cup cornbread stuffing mix
* 2 large bananas
* 1/4 cup honey mustard

Preheat oven to 325° F. Lightly oil a 9 x 5 inch loaf pan.

In a large mixing bowl and using a fork, beat egg, cider, coriander, and relish until blended.

Add ham and cornbread mix. Stir with fork to mix completely. Divide in half.

Pack one half into prepared loaf pan. Place whole peeled bananas gently. Spread with honey mustard.

Bake approximately 45 minutes or until ham is bubbly and slightly browned. Remove pan from oven and allow to cool slightly before slicing.

''Yield: 6 to 8 servings''
`

/*
Load a tiddler and invoke the callback with (err,tiddlerFields)
*/
HyperdriveAdaptor.prototype.loadTiddler = function(title,callback) {
  console.log('Jim loadTiddler', title)
  var self = this;
  // FIXME
  // callback(null,self.convertTiddlerFromTiddlyWebFormat(JSON.parse(data)));
  // callback(null,tiddler);
  if (title === 'Banana Ham Loaf') {
    const tiddlers = $tw.wiki.deserializeTiddlers(
      '.tid',
      bananaHamLoaf,
      {title}
    )
    callback(null, tiddlers[0])
    return
  }
  console.error("Not implemented");
  callback(new Error('Not implemented'));
};

/*
Delete a tiddler and invoke the callback with (err)
options include:
tiddlerInfo: the syncer's tiddlerInfo for this tiddler
*/
HyperdriveAdaptor.prototype.deleteTiddler = function(title,callback,options) {
  var self = this
  // FIXME
  callback(null);
};

exports.adaptorClass = HyperdriveAdaptor;

})();
