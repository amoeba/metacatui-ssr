// TODO: Verify I properly made the server non-blocking

const express = require('express')
const app = express();
app.use(express.static(__dirname + "/src"));

// Config & globals
const helpers = require('./helpers');
const port = process.env.PORT || 3000;

app.get('*', (req, res) => {
  const start = new Date();
  const path = req._parsedOriginalUrl.path;

  helpers.generateResponse(path)
    .then(response => res.send(response))
    .then(() => {
      const elapsed = Number.parseFloat((new Date() - start) / 1000).toPrecision(4)
      console.log('[' + new Date().toISOString() + '] [' + res.statusCode + '] ' + req.url + ' (' + elapsed + 's)');
    });
});

app.listen(port, () => console.log('MetacatUI SSR app listening on port ' + port + '!'))
