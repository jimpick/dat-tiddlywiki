const rai = require('random-access-idb')
const hyperdrive = require('hyperdrive')

if ($tw.node) return // Client-side only for now

exports.adaptorClass = HyperdriveAdaptor

function HyperdriveAdaptor (options) {
  this.wiki = options.wiki
  this.logger = new $tw.utils.Logger("hyperdrive", {colour: "blue"})
  const match = document.location.pathname.match(/^\/doc\/([0-9a-f]+)\/tw/)
  if (!match) {
    throw new Error('Could not match key in url')
  }
  const keyHex = match[1]
  const storage = rai(`doc-${keyHex}`)
  this.archive = hyperdrive(storage, keyHex)
  this.ready = false
  this.archive.ready(() => { this.ready = true })
}

HyperdriveAdaptor.prototype.name = "hyperdrive"

HyperdriveAdaptor.prototype.isReady = function() {
  return this.ready
}

HyperdriveAdaptor.prototype.getTiddlerInfo = function (tiddler) {
  return {}
}

/*
Get an array of skinny tiddler fields from the archive
*/

HyperdriveAdaptor.prototype.getSkinnyTiddlers = function (cb) {
  this.archive.ready(() => {
    this.archive.readdir('tiddlers', (err, list) => {
      if (err) return cb(err)
      const loadTiddlers = list.reverse().reduce(
        (cb, filename) => {
          return (err, result) => {
            if (err) return cb(err)
            const fullPath = `tiddlers/${filename}`
            this.archive.readFile(fullPath, 'utf-8', (err, data) => {
              if (err) return cb(err)
              const tiddlers = $tw.wiki.deserializeTiddlers(
                '.tid',
                data
              )
              const {text, ...rest} = tiddlers[0]
              const newResult = [...result, rest]
              cb(null, newResult)
            })
          }
        },
        (err, result) => {
          if (err) return cb(err)
          cb(null, result)
        }
      )
      loadTiddlers(null, [])
    })
  })
}

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
HyperdriveAdaptor.prototype.saveTiddler = function (tiddler, cb) {
  const {title} = tiddler.fields
  const filepath = this.generateTiddlerBaseFilepath(title)
  this.archive.ready(() => {
    const filename = `tiddlers/${filepath}.tid`
    const data = this.wiki.renderTiddler(
      'text/plain',
      '$:/core/templates/tid-tiddler',
      {variables: {currentTiddler: title}}
    )
    this.archive.writeFile(filename, data, cb)
  })
}

/*
Load a tiddler and invoke the callback with (err,tiddlerFields)
*/
HyperdriveAdaptor.prototype.loadTiddler = function (title, cb) {
  const filepath = this.generateTiddlerBaseFilepath(title)
  this.archive.ready(() => {
    const fullPath = `tiddlers/${filepath}.tid`
    this.archive.readFile(fullPath, 'utf-8', (err, data) => {
      if (err) return cb(err)
      const tiddlers = $tw.wiki.deserializeTiddlers(
        '.tid',
        data
      )
      cb(null, tiddlers[0])
    })
  })
}

/*
Delete a tiddler and invoke the callback with (err)
options include:
tiddlerInfo: the syncer's tiddlerInfo for this tiddler
*/
HyperdriveAdaptor.prototype.deleteTiddler = function (title, cb, options) {
  const filepath = this.generateTiddlerBaseFilepath(title)
  this.archive.ready(() => {
    const filename = `tiddlers/${filepath}.tid`
    this.archive.unlink(filename, cb)
  })
}

// From filesystemadaptor.js

/*
Given a tiddler title and an array of existing filenames, generate a new
legal filename for the title, case insensitively avoiding the array of
existing filenames
*/
HyperdriveAdaptor.prototype.generateTiddlerBaseFilepath = function (title) {
	let baseFilename
	// Check whether the user has configured a tiddler -> pathname mapping
	const pathNameFilters = this.wiki.getTiddlerText("$:/config/FileSystemPaths")
	if (pathNameFilters) {
		const source = this.wiki.makeTiddlerIterator([title])
		baseFilename = this.findFirstFilter(pathNameFilters.split("\n"), source)
		if (baseFilename) {
			// Interpret "/" and "\" as path separator
			baseFilename = baseFilename.replace(/\/|\\/g, path.sep)
		}
	}
	if (!baseFilename) {
		// No mappings provided, or failed to match this tiddler so we use title as filename
		baseFilename = title.replace(/\/|\\/g, "_")
	}
	// Remove any of the characters that are illegal in Windows filenames
	baseFilename = $tw.utils.transliterate(
    baseFilename.replace(/<|>|\:|\"|\||\?|\*|\^/g, "_")
  )
	// Truncate the filename if it is too long
	if (baseFilename.length > 200) {
		baseFilename = baseFilename.substr(0, 200)
	}
	return baseFilename
}


