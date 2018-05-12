const tiddlywikiBoot = require('tiddlywiki/boot/boot')

// See: https://gist.github.com/Arlen22/bbd852f68e328165e49f

$tw = tiddlywikiBoot.TiddlyWiki()
$tw.boot.argv = ['tiddlywikiBase']
$tw.boot.boot()
const serverCommand = $tw.modules.execute('tiddlywiki/core/modules/commands/server.js').Command
const command = new serverCommand([], {wiki: $tw.wiki})
const server = command.server
const requestHandler = server.requestHandler.bind(server)

function tiddlyWikiRequest (req, res, next) {
  console.log('Jim tiddlyWikiRequest', req.url)
  server.set({
    pathPrefix: req.url.replace(/\/tw.*$/, '')
  })
  req.url = '/'
  requestHandler(req, res, next)
}

module.exports = tiddlyWikiRequest
