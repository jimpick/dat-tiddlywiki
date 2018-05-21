const path = require('path')
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
        (cb, filepath) => {
          return (err, result) => {
            if (err) return cb(err)
            this.loadTiddlerDocMetadata(filepath, (err, metadata) => {
              if (err) return cb(err)
              if (!metadata) return cb(null, result)
              cb(null, [...result, metadata])
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

HyperdriveAdaptor.prototype.loadTiddlerDocMetadata = function (filepath, cb) {
  const tiddlerDoc = this.getTiddlerDoc(filepath)
  console.log('Jim loadTiddlerDocMetadata', filepath)
  const metadataDir = path.join('tiddlers', filepath, 'metadata')
  this.archive.readdir(metadataDir, (err, list) => {
    if (err) return cb(err)
    const changes = list
      .map(filename => {
        const match = filename.match(/^([0-9a-f]+)\.(\d+)\.json$/)
        if (!match) return {}
        return {
          filename,
          actorKey: match[1],
          seq: Number(match[2])
        }
      })
      .filter(({actorKey, seq}) => {
        if (!actorKey) return false
        if (seq < tiddlerDoc.metadataLast[actorKey]) return false
        return true
      })
      .sort((a, b) => a.seq - b.seq || a.actorKey < b.actorKey)
    console.log('Jim list', list)
    console.log('Jim2', JSON.stringify(changes))
    const loadMetadata = changes.reverse().reduce(
      (cb, change) => {
        return (err, result) => {
          if (err) return cb(err)
          const {actorKey, seq, filename} = change
          if (tiddlerDoc.metadataLast[actorKey] != seq - 1) {
            // Skip if there are holes in the sequence
            console.log('Skipping', actorKey, seq)
            return cb(null, result)
          }
          const fullPath = path.join(metadataDir, filename)
          console.log('Jim fullPath', fullPath)
          this.archive.readFile(fullPath, 'utf-8', (err, data) => {
            if (err) return cb(err)
            try {
              const changeRecord = JSON.parse(data)
              changeRecord.actor = actorKey
              changeRecord.seq = seq
              tiddlerDoc.metadataLast[actorKey]++
              cb(null, [...result, changeRecord])
            } catch (e) {
              console.error('JSON parse error', e)
              return cb(new Error('JSON parse error'))
            }
          })
        }
      },
      (err, result) => {
        if (err) return cb(err)
        console.log('Result', JSON.stringify(result, null, 2))
        tiddlerDoc.metadataDoc = Automerge.applyChanges(
          tiddlerDoc.metadataDoc,
          result
        )
        const fields = {...tiddlerDoc.metadataDoc.fields}
        for (let propName in fields) {
          if (propName === '_conflicts' || propName === '_objectId') {
            delete fields[propName]
          }
        }
        for (let propName in fields.list) {
          if (propName === '_conflicts' || propName === '_objectId') {
            delete fields.list[propName]
          }
        }
        console.log('Fields', JSON.stringify(fields, null, 2))
        cb(null, fields)
      }
    )
    loadMetadata(null, [])
  })
}

HyperdriveAdaptor.prototype.getTiddlerDoc = function (filepath) {
  if (!this.tiddlerDocs[filepath]) {
    const {actorKey} = this
    const metadataDoc = Automerge.init(actorKey)
    const contentDoc = Automerge.init(actorKey)
    this.tiddlerDocs[filepath] = {
      metadataDoc,
      metadataLast: {[actorKey]: 0},
      contentDoc,
      contentLast: {[actorKey]: 0}
    }
  }
  return this.tiddlerDocs[filepath]
}

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
HyperdriveAdaptor.prototype.saveTiddler = function (tiddler, cb) {
  const {title} = tiddler.fields
  this.archive.ready(() => {
    this.saveMetadata(tiddler, err => {
      if (err) return cb(err)
      this.saveContent(tiddler, cb)
    })
  })
}

HyperdriveAdaptor.prototype.saveMetadata = function (tiddler, cb) {
  console.log('Save metadata')
  const {actorKey, archive} = this
  const {title} = tiddler.fields
  const filepath = this.generateTiddlerBaseFilepath(title) 
  const tiddlerDoc = this.getTiddlerDoc(filepath)
  const oldMetadataDoc = tiddlerDoc.metadataDoc
  const newMetadataDoc = Automerge.change(oldMetadataDoc, doc => {
    if (!doc.fields) {
      doc.fields = {}
    }
    const fields = tiddler.getFieldStrings()
    for (const fieldName in fields) {
      if (fieldName === 'text') continue
      if (!equal(doc.fields[fieldName], fields[fieldName])) {
        // FIXME: Should be smarter with fields that are arrays
        doc.fields[fieldName] = fields[fieldName]
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

HyperdriveAdaptor.prototype.saveContent = function (tiddler, cb) {
  console.log('Save content')
  const {actorKey, archive} = this
  const {title} = tiddler.fields
  const filepath = this.generateTiddlerBaseFilepath(title) 
  const tiddlerDoc = this.getTiddlerDoc(filepath)
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


