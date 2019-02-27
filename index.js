const express = require('express')
const morgan = require('morgan');
require('express-yields');

const app = express();
app.use(morgan('combined'))
app.use(express.static(__dirname + "/src"));

// Config & globals
const helpers = require('./helpers');
const port = process.env.PORT || 3000;

app.get('*', async (req, res) => {
  const path = req._parsedOriginalUrl.path;

  const response = await helpers.generateResponse(path);
  await res.send(response);
});

app.listen(port, () => {
  console.log('MetacatUI SSR app listening at http://localhost:' + port + '!')
});
