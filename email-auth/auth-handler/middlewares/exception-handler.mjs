/****************************************************
 * File: exception-handler.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import {Middleware} from '../middleware.mjs';

const INTERNAL_ERROR = 'Internal server error';

export default class ExceptionHandler extends Middleware {
  async runCore(request, {createLogger, config, requestId}, next) {
    try {
      return await next();
    } catch (err) {
      createLogger('UNHA').error(200, `Unhandled exception occurred: ${err}`);

      return this.createJsonResponse('500', INTERNAL_ERROR, {
        requestId,
        error: config.exposeExcInfo ? err.toString() : INTERNAL_ERROR
      });
    }
  }
}