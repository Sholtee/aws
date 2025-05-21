/****************************************************
 * File: index.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import {SecretsManagerClient} from '@aws-sdk/client-secrets-manager';

import {RequestHandler} from './middleware.mjs';
import ExceptionHandler from "./middlewares/exception-handler.mjs";
import SessionManager from "./middlewares/session-manager.mjs";
import RequestSigner from "./middlewares/request-signer.mjs";

export const requestHandler = new RequestHandler(ExceptionHandler, SessionManager, RequestSigner);
requestHandler.services.secretsManagerClient = new SecretsManagerClient({
  // Lambda@Edge might be replicated into different regions so we need to set the correct region
  // in which we have the secret
  region: 'us-east-1'
});

export const main = (event, context) => requestHandler.handle(event, context);