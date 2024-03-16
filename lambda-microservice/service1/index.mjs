'use strict';
import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager';
import {createConnection} from 'mysql2/promise';

const smClient = new SecretsManagerClient();

export async function handler(event, context, callback) {
  try {
    const
      {username: user, password} = JSON.parse(
        (
          await smClient.send(new GetSecretValueCommand({SecretId: process.env.DB_SECRET_ARN}))
        ).SecretString
      ),
      connection = await createConnection({
        host: process.env.DB_ENDPOINT,
        user,
        password,
        database: process.env.DB_NAME,
      }),
      [results] = await connection.query('SELECT "Hello World From MySQL" as hello');

    callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(results[0].hello)
    });
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