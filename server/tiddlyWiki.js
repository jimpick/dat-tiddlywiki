const tiddlywikiBoot = require('tiddlywiki/boot/boot')

// See: https://gist.github.com/Arlen22/bbd852f68e328165e49f

$tw = tiddlywikiBoot.TiddlyWiki()
$tw.boot.argv = ['tiddlywikiBase']
$tw.boot.boot()
$tw.wiki.addTiddler({
  "text": "$protocol$//$host$/doc/20949bc4db2ac0ed80ebb20bbb2b79114c9dee65f511657a87678a865f39617f/tw/",
	"title": "$:/config/tiddlyweb/host"
})
const serverCommand = $tw.modules.execute('tiddlywiki/core/modules/commands/server.js').Command
const command = new serverCommand([], {wiki: $tw.wiki})
const server = command.server
const requestHandler = server.requestHandler.bind(server)

function tiddlyWikiRequest (req, res) {
  console.log('Jim tiddlyWikiRequest', req.url)
  server.set({
    rootTiddler: "$:/core/save/all",
		renderType: "text/plain",
		serveType: "text/html",
		username: "",
		password: "",
    pathPrefix: req.url.replace(/\/tw.*$/, '')
  })
  req.url = req.url.replace(/^.*\/tw\/?/, '/')
  requestHandler(req, res, next)

  function next () {
    console.log('Jim next', req.url)
  }
}

module.exports = tiddlyWikiRequest
