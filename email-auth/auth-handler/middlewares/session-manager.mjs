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
  #secretsManagerClient

  constructor(secretsManagerClient /*can be mocked*/) {
    super();
    this.#secretsManagerClient = secretsManagerClient;
  }

  async runCore(request, {createLogger, config: {appName}}, next) {
    const logger = createLogger('SEMA');

    // extract the username and roles (fields like "exp" can be disregarded)
    const {username = null, roles = ['anonymous']} = this.#getSession(request, logger, appName) || {};

    logger.log(400, 'Attaching the session header');

    // attach the session header
    this.createHeaderEntry(
      request.headers,
      `x-${appName}-session`,
      JSON.stringify({username, roles})
    );

    // sign the request
    return await next();
  }

  async init() {
    const {SecretString} = await this.#secretsManagerClient.send(new GetSecretValueCommand({
      SecretId: `${appName}-authenticator-secret`
    }));

    this.#privateKey = JSON.parse(SecretString).privateKey;
  }

  #getSession({headers: {cookie: cookieHeader}}, logger, appName) {
    try {
      const sessionCookie = cookieHeader?.reduce(
        (acc, {value}) => ({...acc, ...cookie.parse(value)}),
        {}
      )[`${appName}-session`];
      if (!sessionCookie)
        throw 'No session cookie provided';

      const session = jwt.verify(sessionCookie, this.#privateKey);
      logger.log(401, `Session verified: ${JSON.stringify(session)}`);

      return session;
    } catch (err) {
      logger.log(402, `Failed to verify the session: ${err}`);
    }
  }
};