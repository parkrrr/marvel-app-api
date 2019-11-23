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
  let ts = getTimestamp();
  return md5(ts + priv + pub);
}

function doRequest(path, param, callback) {
  var options = {
    host: process.env.MARVEL_ENDPOINT,
    path: path + '?limit=10&ts=' + getTimestamp() + '&apikey=' + process.env.MARVEL_PUBLIC_KEY + '&hash=' + getHash()
  };

  if (param) {
    options.path += '&' + param;
  }

  var req = https.get(options, function (res) {
    var body = '';
    res.on('data', (chunk) => body += chunk)
      .on('end', () => {
        let json = JSON.parse(body);
        callback(json);
      });
  });

  req.on('error', function (e) {
    console.log('ERROR: ' + e.message);
  });
}

app.get('/search/:query', (req, res) => {
  let p;
  if (req.params.query) {
    p = 'titleStartsWith=' + req.params.query;
  }
  doRequest('/v1/public/comics', p, (body) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = body.code;
    res.send(body)
  });
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log('listening on port ' + port);
});