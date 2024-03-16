'use strict';
import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager';
import {createPool} from 'mysql2/promise';

const dbConnectionPool = await createDbConnectionPool();

export async function handler(event, context, callback) {
  try {
    context.callbackWaitsForEmptyEventLoop = false;

    console.log('Echo "Hello World" via MySQL');
    const queryResult = await dbConnectionPool.query('SELECT "Hello World From MySQL" as hello');
    console.log(`Done: ${JSON.stringify(queryResult)}`);

    console.log('Echo "Hello World" via HTTP POST');
    const httpBody = await (await fetch('https://postman-echo.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'Hello World From postman-echo'
    })).text();
    console.log(`Done: ${httpBody}`);

    callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hello1: queryResult[0][0].hello,
        hello2: JSON.parse(httpBody).data
      })
    });
    console.log('Bye');
  } catch (err) {
    console.error(err);
    callback(null, {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html'
      },
      body: 'Internal server error'
    });
  }
}

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