require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const app = express();
const md5 = require('js-md5');

const dev = process.env.DEVELOPMENT || false;

// This is a simple middleware to avoid having to publish the API keys
// It is intended to do as little mutation as possible, so the results
// flow through it and straight to the frontend

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
  // This is pretty use-case specific and isn't very flexible but it gets the job done.
  var options = {
    host: process.env.MARVEL_ENDPOINT,
    path: `${path}?limit=10&ts=${getTimestamp()}&apikey=${process.env.MARVEL_PUBLIC_KEY}&hash=${getHash()}`
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
    p = `titleStartsWith=${req.params.query}`;
  }
  doRequest('/v1/public/comics', p, (body) => {
    res.setHeader('Content-Type', 'application/json');

    // Be lenient in dev, but in production restrict access
    res.setHeader('Access-Control-Allow-Origin', dev ? '*' : process.env.FRONTEND_URL);

     // Mirror the response from the Marvel API
     // This lets us handle everything from the frontend without having to handle
     // every use case here
    res.statusCode = body.code;
    res.send(body)
  });
});

app.get('/detail/:id', (req, res) => {
  doRequest(`/v1/public/comics/${req.params.id}`, null, (body) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', dev ? '*' : process.env.FRONTEND_URL);
    res.statusCode = body.code;
    res.send(body)
  });
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log('listening on port ' + port);
});