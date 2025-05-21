/****************************************************
 * File: session-manager.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import {GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

import {Middleware} from "../middleware.mjs";

export default class SessionManager extends Middleware {
  #privateKey;

  async run({headers}, {createLogger, config: {appName}}, next) {
    const
      logger = createLogger('SEMA'),
      // extract the username and roles (fields like "exp" can be disregarded)
      {username = null, roles = ['anonymous']} = getSession(this.#privateKey);

    logger.log(400, 'Attaching the session header');

    // attach the session header
    this.createHeaderEntry(
      headers,
      `x-${appName}-session`,
      JSON.stringify({username, roles})
    );

    // sign the request
    return await next();

    function getSession(pk) {
      try {
        const sessionCookie = headers.cookie?.reduce(
          (acc, {value}) => ({...acc, ...cookie.parse(value)}),
          {}
        )[`${appName}-session`];
        if (!sessionCookie)
          throw 'No session cookie provided';

        const session = jwt.verify(sessionCookie, pk);
        logger.log(401, `Session verified: ${JSON.stringify(session)}`);

        return session;
      } catch (err) {
        logger.log(402, `Failed to verify the session: ${err}`);
      }
      return {};
    }
  }

  async init({appName}, {secretsManagerClient}) {
    const {SecretString} = await secretsManagerClient.send(new GetSecretValueCommand({
      SecretId: `${appName}-authenticator-secret`
    }));

    this.#privateKey = JSON.parse(SecretString).privateKey;

    await super.init();
  }
};