/****************************************************
 * File: middleware.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import config from './config.json' with {type: 'json'};
import createLogger from './logger.mjs';

export class Middleware {
  #initialized = false;

  async init() {}

  async runCore(request, context, next) {
    throw 'Not implemented';
  }

  async run(request, context, next) {
    if (!this.#initialized) {
      await this.init();
      this.#initialized = true;
    }

    return await this.runCore(request, context, next);
  }

  createJsonResponse(status, statusDescription, body, headers = {}) {
    headers = {
      ...headers,
      'Content-Type': 'application/json'
    }
    return {
      status,
      statusDescription,
      headers: Object
        .entries(headers)
        .reduce((headers, [key, value]) => this.createHeaderEntry(headers, key, value), {}),
      body: JSON.stringify(body)
    };
  }

  createHeaderEntry(cookies, key, value) {
    cookies[key.toLowerCase()] = [{key, value}];
    return cookies;
  }
}

export class RequestHandler {
  #chain;
  #context;

  constructor(...middlewares) {
    let chain = (req, ctx) => {
      throw 'Request could not be processed';
    };

    for (const middleware of middlewares) {
      const previous = chain;
      chain = (req, ctx) => middleware.run(req, ctx, previous);
    }

    this.#chain = chain;
    this.#context = {
      config: {...config} // copy the original config for each instance (due to testing)
    }
  }

  async handle({Records: [{cf: {request}}]}, {awsRequestId: requestId}) {
    return await this.#chain(request, {
      ...this.#context,
      createLogger: createLogger.bind(null, requestId),
      requestId
    });
  }

  get context() {
    return this.#context;
  }
}