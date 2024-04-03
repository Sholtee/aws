/****************************************************
 * index.mjs
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';
import express from 'express';
import {createServer} from 'https';
import {readFileSync} from 'fs';

const
  app = express(),
  opts = {
    key: readFileSync('./cert/private.key'),
    cert: readFileSync('./cert/certificate.crt')
  };

app.get('/healthcheck', (req, res) => {
  console.log('Healthcheck initiated');
  res.setHeader('content-type', 'application/json');
  res.status(200);
  res.send(JSON.stringify('ok'));
});

createServer(opts, app).listen(parseInt(process.env.SERVICE_PORT));