/****************************************************
 * File: index.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';

import SessionManagerSafe from './session-manager.mjs';

const handler = new SessionManagerSafe();

export const main = event => handler.sign(event);