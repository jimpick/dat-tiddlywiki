const rai = require('random-access-idb')
const hyperdrive = require('hyperdrive')
const Automerge = require('automerge')
const equal = require('deep-equal')

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
  this.archive.ready(() => {
    this.ready = true
    this.actorKey = this.archive.db.local.key.toString('hex')
  })
  this.tiddlerDocs = {}
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
  const {actorKey} = this
  const {title} = tiddler.fields
  const filepath = this.generateTiddlerBaseFilepath(title)
  this.archive.ready(() => {
    if (!this.tiddlerDocs[title]) {
      const metadataDoc = Automerge.init(actorKey)
      const contentDoc = Automerge.init(actorKey)
      this.tiddlerDocs[title] = {
        metadataDoc,
        metadataLast: {[actorKey]: 0},
        contentDoc,
        contentLast: {[actorKey]: 0}
      }
    }

    function saveMetadata (tiddlerDoc, archive, cb) {
      console.log('Save metadata')
      const oldMetadataDoc = tiddlerDoc.metadataDoc
      const newMetadataDoc = Automerge.change(oldMetadataDoc, doc => {
        if (!doc.fields) {
          doc.fields = {}
        }
        for (const fieldName in tiddler.fields) {
          if (fieldName === 'text') continue
          if (!equal(doc.fields[fieldName], tiddler.fields[fieldName])) {
            // FIXME: Should be smarter with fields that are arrays
            doc.fields[fieldName] = tiddler.fields[fieldName]
          }
        }
      })
      tiddlerDoc.metadataDoc = newMetadataDoc
      const changes = Automerge.getChanges(oldMetadataDoc, newMetadataDoc)
        .filter(change => (
          change.actor === actorKey &&
          change.seq > tiddlerDoc.metadataLast[actorKey]
        ))

      const base = `tiddlers/${filepath}/metadata/${actorKey}`
      const save = changes.reverse().reduce(
        (cb, change) => {
          return err => {
            if (err) return cb(err)
            const {actor, seq, ...rest} = change
            tiddlerDoc.metadataLast[actorKey] = seq
            const fullPath = `${base}.${seq}.json`
            const json = JSON.stringify(rest)
            console.log('Jim change', change, fullPath, json)
            archive.writeFile(fullPath, json, cb)
          }
        },
        cb
      )
      save()
    }

    function saveContent (tiddlerDoc, archive, cb) {
      console.log('Save content')
      const oldContentDoc = tiddlerDoc.contentDoc
      const newContentDoc = Automerge.change(oldContentDoc, doc => {
        if (!doc.text) {
          doc.text = new Automerge.Text()
          doc.text.insertAt(0, tiddler.fields.text.split(''))
        }
        // FIXME: diff
      })
      tiddlerDoc.contentDoc = newContentDoc
      const changes = Automerge.getChanges(oldContentDoc, newContentDoc)
        .filter(change => (
          change.actor === actorKey &&
          change.seq > tiddlerDoc.contentLast[actorKey]
        ))

      const base = `tiddlers/${filepath}/content/${actorKey}`
      const save = changes.reverse().reduce(
        (cb, change) => {
          return err => {
            if (err) return cb(err)
            const {actor, seq, ...rest} = change
            tiddlerDoc.contentLast[actorKey] = seq
            const fullPath = `${base}.${seq}.json`
            const json = JSON.stringify(rest)
            console.log('Jim change', change, fullPath, json)
            archive.writeFile(fullPath, json, cb)
          }
        },
        cb
      )
      save()
      cb()
    }

    const tiddlerDoc = this.tiddlerDocs[title]
    const {archive} = this
    saveMetadata(tiddlerDoc, archive, err => {
      if (err) return cb(err)
      saveContent(tiddlerDoc, archive, cb)
    })
    /*
    const filename = `tiddlers/${filepath}.${this.actorKey}.${change}.meta.json`
    this.archive.writeFile(filename, data, cb)
    */
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


