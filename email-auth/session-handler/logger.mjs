/****************************************************
 * File: logger.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/

export default function createLogger(requestId, service) {
  return Object.freeze({
    log: dump.bind(null, console.log),
    error: dump.bind(null, console.error)
  });

  function dump(impl, logId, message) {
    impl(`${requestId} [${service}-${logId}] ${message}`);
  }
};