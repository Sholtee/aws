/****************************************************
 * File: router.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import createRouter from 'router';

export default class Router {
  #router;
  #sessionHeaderName;

  exposeExcInfo = false;

  constructor(appName) {
    this.#router = createRouter();
    this.#router.use((req, res, next) => {
      console.log(`[ROUT-400] [${req.id}] Request available: ${JSON.stringify({...req, body: !!req.body})}`);

      req.user = JSON.parse(req.headers[this.#sessionHeaderName]);
      next();
    });
    this.#sessionHeaderName = `x-${appName}-session`;
  }

  register(callback) {
    const {method, path} = callback;

    this.#router[method.toLowerCase()](
      path,
      (req, writeResponse) => callback(req, writeResponse)  // do not pass the next() callback
    );
  }

  async route({path: url, httpMethod: method, headers, body, isBase64Encoded, requestContext: {requestId: id}}) {
    return new Promise(writeResponse => {
      this.#router({url, method, headers, body, isBase64Encoded, id}, writeResponse, err => {
        if (err) {
          console.error(`[ROUT-200] [${id}] ${err}`);

          writeResponse(Router.#createResponse(500, {
            error: this.exposeExcInfo ? err.toString() : 'Internal server error'
          }));
        } else {
          console.log(`[ROUT-401] [${id}] Handler not found for "${url}"`);

          writeResponse(Router.#createResponse(404, {
            reason: 'Not Found'
          }));
        }
      });
    });
  }

  static #createResponse(status, body) {
    return {
      status,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    };
  }
};