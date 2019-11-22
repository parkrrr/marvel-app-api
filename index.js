require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const app = express();
const md5 = require('js-md5');

app.use(bodyParser.json());

function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function getHash() {
  let pub = process.env.MARVEL_PUBLIC_KEY;
  let priv = process.env.MARVEL_PRIVATE_KEY;
  let ts =  getTimestamp();
  return md5(ts + priv + pub);
}

function doRequest(path, callback) {
  var options = {
    host: process.env.MARVEL_ENDPOINT,
    path: path + '?limit=10&ts=' + getTimestamp() + '&apikey=' + process.env.MARVEL_PUBLIC_KEY + '&hash=' + getHash()
  };

  console.log('request: ' + process.env.MARVEL_ENDPOINT + options.path);

  var req = https.get(options, function (res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));

    // Buffer the body entirely for processing as a whole.
    var body = '';
    res.on('data', function (chunk) {
      // You can process streamed parts here...
      body += chunk
    }).on('end', function () {
      callback(body);
    })
  });

  req.on('error', function (e) {
    console.log('ERROR: ' + e.message);
  });
}

app.get('/', (req, res) => {
  doRequest('/v1/public/comics', (body) => { res.setHeader('Content-Type', 'application/json'); res.send(body) });
});

const port = process.env.PORT;

// starting the server
app.listen(port, () => {
  console.log('listening on port ' + port);
});