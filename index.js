// TODO: Verify I properly made the server non-blocking

const express = require('express')
const morgan = require('morgan');
require('express-yields');

const app = express();
app.use(morgan('combined'))
app.use(express.static(__dirname + "/src"));

// Config & globals
const helpers = require('./helpers');
const port = process.env.PORT || 3000;

  const start = new Date();
app.get('*', async (req, res) => {
  const path = req._parsedOriginalUrl.path;

  const response = await helpers.generateResponse(path);
  await res.send(response);
});

app.listen(port, () => console.log('MetacatUI SSR app listening on port ' + port + '!'))
