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
    this.#sessionHeaderName = `x-${appName}-session`;
  }

  register(callback) {
    const {method, path} = callback;

    this.#router[method.toLowerCase()](
      path,
      (req, writeResponse, next) => {
        console.log(`[ROUT-400] Matching request available: ${{...req, body: !!req.body}}`);

        req.user = JSON.parse(req.headers[this.#sessionHeaderName]);
        next();
      },
      (req, writeResponse) => callback(req, writeResponse),  // do not pass the next() callback
      (err, req, writeResponse, _) => {  // 4 parameters must be provided to act as an error handler
        console.error(`[ROUT-200] ${err}`);

        writeResponse(Router.#createResponse(500, {
          error: this.exposeExcInfo ? err.toString() : 'Internal server error'
        }));
      }
    );
  }

  async route({path: url, httpMethod: method, headers, body, isBase64Encoded}) {
    return new Promise(resolve => {
      this.#router({url, method, headers, body, isBase64Encoded}, resolve, () => {
        // TODO: log the url
        resolve(Router.#createResponse(404, {
          reason: 'Not Found'
        }));
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