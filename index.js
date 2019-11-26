require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const md5 = require('js-md5');              // md5 function needed for the Marvel API
const qs = require('qs');                   // used to serialize request query strings

const app = express();
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

function doRequest(path, params, callback) {
  let p = params || {};
  p.ts = p.ts || getTimestamp();
  p.apikey = p.apikey || process.env.MARVEL_PUBLIC_KEY;
  p.hash = p.hash || getHash();
  p.limit = p.limit || 10;

  console.log(p);

  let queryString = qs.stringify(p);

  let options = {
    host: process.env.MARVEL_ENDPOINT,
    path: `${path}?${queryString}`
  };

  https.get(options, function (res) {
    var body = '';
    res.on('data', (chunk) => body += chunk)
      .on('end', () => {
        let json = JSON.parse(body);
        callback(json);
      });
  }).on('error', function (e) {
    console.log('ERROR: ' + e.message);
  });
}

app.get('/search/:query', (req, res) => {
  let p = req.query || {};
  if (req.params.query) {
    p.titleStartsWith = req.params.query;
  }
  doRequest('/v1/public/comics', p, (body) => {
    res.setHeader('Content-Type', 'application/json');

    // Be lenient in dev, but in production restrict access
    res.setHeader('Access-Control-Allow-Origin', dev ? '*' : process.env.FRONTEND_URL);

    // Mirror the response from the Marvel API
    // This lets us handle everything from the frontend without having to handle
    // every use case here

    // A missing param sends a string instead of an integer code
    // Interpreting as 'Bad Request' seems logical
    if (body.code == 'MissingParameter') {
      res.statusCode = 400;
    }
    else {
      res.statusCode = body.code;
    }
    res.send(body)
  });
});

app.get('/detail/:id', (req, res) => {
  let p = req.query || {};

  doRequest(`/v1/public/comics/${req.params.id}`, p, (body) => {
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