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

export default function Router({appName, services = {}, exposeExcInfo = false}) {
  const router = createRouter();
  router.use((req, res, next) => {
    req.createLogger('ROUT').log(400, `Request available: ${JSON.stringify({...req, body: !!req.body})}`)

    req.services = services;
    req.user = JSON.parse(req.headers[`x-${appName}-session`]);

    next();
  });

  this.register = ({method, path, handler}) => router[method.toLowerCase()](path, handler);

  this.route = ({path: url, httpMethod: method, headers, body, isBase64Encoded, requestContext: {requestId}}) => {
    const createLogger = createLoggerCore.bind(null, requestId);

    return new Promise(writeResponse => {
      router({url, method, headers, body, isBase64Encoded, requestId, createLogger}, writeResponse, err => {
        const logger = createLogger('ROUT');

        if (err) {
          logger.error(200, err.toString());

          respond(500, RESOURCES.INTERNAL_ERROR, {
            requestId,
            error: exposeExcInfo ? err.toString() : RESOURCES.INTERNAL_ERROR
          });
        } else {
          logger.error(401, `Handler not found for "${url}"`);

          respond(404, RESOURCES.NOT_FOUND,{
            requestId,
            reason: RESOURCES.NOT_FOUND_LONG
          });
        }

        function respond(statusCode, statusMessage, body) {
          writeResponse({
            statusCode,
            headers: {'content-type': 'text/html'},
            body: VIEWS.status({
              statusCode,
              statusMessage,
              details: JSON.stringify(body)
            })
          });
        }
      });
    });
  }
};