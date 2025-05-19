/****************************************************
 * File: router.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import createRouter from 'router';

import RESOURCES from './resources.json' with {type: 'json'};
import {VIEWS} from './views.mjs';

export default class Router {
  #router;
  #exposeExcInfo;

  constructor({appName, services = {}, exposeExcInfo = false}) {
    this.#router = createRouter();
    this.#router.use((req, res, next) => {
      console.log(`[ROUT-400] [${req.requestId}] Request available: ${JSON.stringify({...req, body: !!req.body})}`);

      req.services = services;
      req.user = JSON.parse(req.headers[`x-${appName}-session`]);

      next();
    });
    this.#exposeExcInfo = exposeExcInfo;
  }

  register({method, path, handler}) {
    this.#router[method.toLowerCase()](path, handler);
  }

  async route({path: url, httpMethod: method, headers, body, isBase64Encoded, requestContext: {requestId}}) {
    return new Promise(writeResponse => {
      this.#router({url, method, headers, body, isBase64Encoded, requestId}, writeResponse, err => {
        if (err) {
          console.error(`[ROUT-200] [${requestId}] ${err}`);

          writeResponse(Router.#createResponse(500, RESOURCES.INTERNAL_ERROR, {
            requestId,
            error: this.#exposeExcInfo ? err.toString() : RESOURCES.INTERNAL_ERROR
          }));
        } else {
          console.log(`[ROUT-401] [${requestId}] Handler not found for "${url}"`);

          writeResponse(Router.#createResponse(404, RESOURCES.NOT_FOUND,{
            requestId,
            reason: RESOURCES.NOT_FOUND_LONG
          }));
        }
      });
    });
  }

  static #createResponse(statusCode, statusMessage, body) {
    return {
      statusCode,
      headers: {'content-type': 'text/html'},
      body: VIEWS.status({
        statusCode,
        statusMessage,
        details: JSON.stringify(body)
      })
    };
  }
};