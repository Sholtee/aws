import {randomUUID} from 'node:crypto'

import isEmail from 'validator/lib/isEmail.js';

import {VIEWS} from '../views.mjs';
import RESOURCES from '../resources.json' with {type: 'json'};

export const
  method = 'GET',
  path = '/login/:email';

export async function sendToken(request, writeResponse) {
  const {
    params: {email},
    services: {usersDb, attemptsDb, ses, config},
    createLogger
  } = request;

  const logger = createLogger('SETO');

  logger.log(500, 'Starting token request process');

  if (!isEmail(email)) {
    logger.log(501, `User provided bad email: ${email}`);

    respond(400, RESOURCES.BAD_REQUEST, RESOURCES.INVALID_EMAIL);
    return;
  }

  if (await usersDb.getItem(email)) {
    // check if the user has reached the max attempt count in the last Y minutes
    const attempts = await attemptsDb.listItems(
      email,
      ['>', new Date().getTime() - config.LOGIN_TIME_WINDOW_MINUTES * 60 * 100],
      config.MAX_ATTEMPTS
    );

    if (attempts.length < config.MAX_ATTEMPTS) {
      const token = randomUUID();

      // save the new attempt
      await attemptsDb.putItem({
        email,
        token,
        createdUtc: new Date().getTime()
      });

      // send the actual email
      const messageId = await ses.send(email, RESOURCES.LOGIN_TOKEN, 'mail-body', {token});
      logger.log(502, `Email successfully sent: ${messageId}`);
    }
  }

  // do not let the caller try to guess the allowed attempt count or the registered email
  // addresses
  respond(200, RESOURCES.OK, RESOURCES.TOKEN_SENT);

  function respond(statusCode, statusMessage, body) {
    writeResponse({
      statusCode,
      headers: {'content-type': 'text/html'},
      body: VIEWS.status({
        statusCode,
        statusMessage,
        details: body
      })
    });
  }
}