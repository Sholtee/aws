/****************************************************
 * File: session-manager.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';

import {GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import RequestSigner  from './request-signer.mjs';

const INTERNAL_ERROR = 'Internal server error';

class SessionManager extends RequestSigner {
  #privateKey;

  constructor(secretsManagerClient) {
    super(secretsManagerClient);
  }

  async transformRequest(request, requestId) {
    // extract the username and roles (fields like "exp" can be disregarded)
    const {username = null, roles = ['anonymous']} = this.#getSession(request.headers.cookie, requestId) || {};

    console.log(`[SEMA-402] [${requestId}] Attaching the session header`);

    // attach the session header
    RequestSigner.createHeaderEntry(
      request.headers,
      `x-${this.config.appName}-session`,
      JSON.stringify({username, roles})
    );

    // sign the request
    return await super.transformRequest(request, requestId);
  }

  async init(secretsManagerClient) {
    await super.init();

    const {SecretString} = await secretsManagerClient.send(new GetSecretValueCommand({
      SecretId: `${this.config.appName}-authenticator-secret`
    }));

    this.#privateKey = JSON.parse(SecretString).privateKey;

    console.log('[SEMA-400] Init complete');
  }

  #getSession(cookieHeader, requestId) {
    try {
      const sessionCookie = cookieHeader?.reduce(
        (acc, {value}) => ({...acc, ...cookie.parse(value)}),
        {}
      )[`${this.config.appName}-session`];
      if (!sessionCookie)
        throw 'No session cookie provided';

      const session = jwt.verify(sessionCookie, this.#privateKey);
      console.log(`[SEMA-401] [${requestId}] Session verified: ${JSON.stringify(session)}`);

      return session;
    } catch (err) {
      console.log(`[SEMA-402] [${requestId}] Failed to verify the session: ${err}`);
    }
  }
};

export default class SessionManagerSafe extends SessionManager {
  async sign(request, context) {
    try {
      return await super.sign(request, context);
    } catch (ex) {
      const {awsRequestId: requestId} = context;

      console.error(`[SEMA-200] [${requestId}] Unhandled exception occurred: ${ex}`);

      return RequestSigner.createJsonResponse(
        '500',
        INTERNAL_ERROR,
        {
          requestId,
          error: this.config.exposeExcInfo ? ex.toString() : INTERNAL_ERROR
        }
      );
    }
  }
};