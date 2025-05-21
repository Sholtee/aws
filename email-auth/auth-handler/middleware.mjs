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

  async init() {
    this.#initialized = true;
  }

  async run(request, context, next) {
    throw 'Not implemented';
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

  get initialized() {
    return this.#initialized;
  }
}

export class RequestHandler {
  #middlewares;
  #config = {...config}; // copy the original config for each instance (due to testing)
  #services = {};

  constructor(...middlewares) {
    this.#middlewares = middlewares.map(cls => new cls());
  }

  handle({Records: [{cf: {request}}]}, {awsRequestId: requestId}) {
    const context = {
      config: this.#config,
      services: this.#services,
      createLogger: createLogger.bind(null, requestId),
      requestId
    };

    return invokeNext(this.#middlewares);

    async function invokeNext(remaining) {
      const [middleware] = remaining;
      if (!middleware)
        throw 'Request could not be processed';

      if (!middleware.initialized)
        await middleware.init(context.config, context.services);

      return await middleware.run(request, context, invokeNext.bind(null, remaining.slice(1)));
    }
  }

  get config() {
    return this.#config;
  }

  get services() {
    return this.#services;
  }
}