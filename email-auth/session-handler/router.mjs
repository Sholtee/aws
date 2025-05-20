/****************************************************
 * File: router.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import createRouter from 'router';

import RESOURCES from './resources.json' with {type: 'json'};
import {VIEWS} from './views.mjs';
import createLoggerCore from './logger.mjs';

export default class Router {
  #router;
  #exposeExcInfo;

  constructor({appName, services = {}, exposeExcInfo = false}) {
    this.#router = createRouter();
    this.#router.use((req, res, next) => {
      req.createLogger('ROUT').log(400, `Request available: ${JSON.stringify({...req, body: !!req.body})}`)

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
    const createLogger = createLoggerCore.bind(null, requestId);

    return new Promise(writeResponse => {
      this.#router({url, method, headers, body, isBase64Encoded, requestId, createLogger}, writeResponse, err => {
        const logger = createLogger('ROUT');

        if (err) {
          logger.error(200, err.toString());

          writeResponse(createResponse(500, RESOURCES.INTERNAL_ERROR, {
            requestId,
            error: this.#exposeExcInfo ? err.toString() : RESOURCES.INTERNAL_ERROR
          }));
        } else {
          logger.error(401, `Handler not found for "${url}"`);

          writeResponse(createResponse(404, RESOURCES.NOT_FOUND,{
            requestId,
            reason: RESOURCES.NOT_FOUND_LONG
          }));
        }
      });
    });

    function createResponse(statusCode, statusMessage, body) {
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
  }
};