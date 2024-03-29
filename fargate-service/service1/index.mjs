/****************************************************
 * index.mjs
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';
import express from 'express'

const app = express();

app.get('/healthcheck', (req, res) => {
  res.setHeader('content-type', 'application/json');
  res.status(200);
  res.send(JSON.stringify('ok'));
});

app.listen(1986);