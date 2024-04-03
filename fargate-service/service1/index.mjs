/****************************************************
 * index.mjs
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';
import express from 'express';
import {createServer} from 'https';
import {readFileSync} from 'fs';
import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager';
import {createPool} from 'mysql2/promise';

const
  dbConnectionPool = await createDbConnectionPool(),
  app = express(),
  opts = {
    key: readFileSync('./cert/private.key'),
    cert: readFileSync('./cert/certificate.crt')
  };

app.get('/', (req, res) => {
  console.log('Requesting hello');
  res.setHeader('content-type', 'application/json');
  res.status(200);
  res.send(JSON.stringify('Hello world!'));
});

app.get('/healthcheck', async (req, res) => {
  console.log('Healthcheck initiated');
  res.setHeader('content-type', 'application/json');
  try {
    console.log('Echo "Hello World" via HTTP POST');
    const httpResp = await fetch('https://postman-echo.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'Hello World From postman-echo'
    });
    if (!httpResp.ok)
      throw 'Failed to fetch';

    console.log('Echo "Hello World" via MySQL');
    const queryResult = await dbConnectionPool.query('SELECT "Hello World From MySQL" as hello');

    console.log('Healthcheck complete');
    res.status(200);
    res.send(
      JSON.stringify({
        hello1: JSON.parse(await httpResp.text()).data,
        hello2: queryResult[0][0].hello
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500);
    res.send(JSON.stringify('Internal server error'));
  }
});

createServer(opts, app).listen(parseInt(process.env.SERVICE_PORT));

async function createDbConnectionPool() {
  const
    {SecretString} = await new SecretsManagerClient().send(new GetSecretValueCommand({SecretId: process.env.DB_SECRET_ARN})),
    {username: user, password} = JSON.parse(SecretString);

  return createPool({
    host: process.env.DB_ENDPOINT,
    user,
    password,
    database: process.env.DB_NAME
  });
}