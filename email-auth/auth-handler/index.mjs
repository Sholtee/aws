/****************************************************
 * File: index.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';

import {SecretsManagerClient} from '@aws-sdk/client-secrets-manager';
import SessionManagerSafe from './session-manager.mjs';

const handler = new SessionManagerSafe(new SecretsManagerClient({
  // Lambda@Edge might be replicated into different regions so we need to set the correct region
  // in which we have the secret
  region: 'us-east-1'
}));

export const main = event => handler.sign(event);