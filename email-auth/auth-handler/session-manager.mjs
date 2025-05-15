/****************************************************
 * File: session-manager.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';

import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import RequestSigner  from './request-signer.mjs';

const INTERNAL_ERROR = 'Internal server error';

class SessionManager extends RequestSigner {
  async transformRequest(request) {
    // extract the username and roles (fields like "exp" can be disregarded)
    const {username = null, roles = ['anonymous']} = this.#getSession(request.headers.cookie) || {};

    console.log('[SEMA-402] Attaching the session header');

    // attach the session header
    RequestSigner.createHeaderEntry(
      request.headers,
      `x-${this.config.appName}-session`,
      JSON.stringify({username, roles})
    );

    // sign the request
    return await super.transformRequest(request);
  }

  async init(configOverride) {
    await super.init(configOverride);
    this.config.privateKey ||= await this.#readSecret();

    console.log('[SEMA-400] Init complete');
  }

  #getSession(cookieHeader) {
    try {
      const sessionCookie = cookieHeader?.reduce(
        (acc, {value}) => ({...acc, ...cookie.parse(value)}),
        {}
      )[`${this.config.appName}-session`];
      if (!sessionCookie)
        throw 'No session cookie provided';

      const session = jwt.verify(sessionCookie, this.config.privateKey);
      console.log(`[SEMA-401] Session verified: ${JSON.stringify(session)}`);

      return session;
    } catch (err) {
      console.log(`[SEMA-402] Failed to verify the session: ${err}`);
    }
  }

  async #readSecret() {
    const
      client = new SecretsManagerClient({
        // Lambda@Edge might be replicated into different regions so we need to set the correct region
        // in which we have the secret
        region: 'us-east-1'
      }),
      {SecretString} = await client.send(new GetSecretValueCommand({
        SecretId: `${this.config.appName}-authenticator-secret`
      }));

    return JSON.parse(SecretString).privateKey;
  }
};

export default class SessionManagerSafe extends SessionManager {
  async sign(request) {
    try {
      return await super.sign(request);
    } catch (ex) {
      console.error(`[SEMA-200] Unhandled exception occurred: ${ex}`);

      return RequestSigner.createResponse(
        '500',
        INTERNAL_ERROR,
        JSON.stringify({error: this.config.exposeExcInfo ? ex.toString() : INTERNAL_ERROR}),
        {'Content-Type': 'application/json'}
      );
    }
  }
};