module.exports = tiddlyWiki

function tiddlyWiki (req, res, next) {
  console.log('Jim tw', req.url)
  res.write('TiddlyWiki')
  res.end()
}
