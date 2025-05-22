/****************************************************
 * File: request-signer.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import {createHash, createHmac} from 'crypto';
import {parse} from 'querystring';

import {fromNodeProviderChain} from '@aws-sdk/credential-providers';
import {SignatureV4} from '@aws-sdk/signature-v4';
import {HttpRequest} from '@smithy/protocol-http';

import {Middleware} from '../middleware.mjs';

export default class RequestSigner extends Middleware {
  #sigV4

  async run(request, {createLogger, config: {excludedHeaders}, requestId}) {
    const logger = createLogger('SIGN');

    logger.log(400, `Signing request: ${JSON.stringify({...request, body: !!request.body})}`);

    if (request.body?.inputTruncated) {
      logger.warn(300, `Request too large: ${request.headers['content-length'][0]['value']}`);
      return this.createJsonResponse(
        '400',
        'Bad request',
        {requestId, message: 'Request too large'},
      );
    }

    const {signingRegion} = /(?<urlid>\w+)\.lambda-url\.(?<signingRegion>[\w-]+)\.on\.aws/i
      .exec(request.headers.host[0].value)
      .groups;
    logger.log(401, `Signing region: ${signingRegion}`);

    const {headers: signedHeaders} = await this.#sigV4.sign(
      new HttpRequest({
        hostname: request.headers.host[0].value,
        method: request.method,
        protocol: 'https:',
        path: request.uri,
        query: request.querystring
          ? parse(request.querystring)
          : undefined,
        headers: Object
          .entries(request.headers)
          .filter(([key]) => !excludedHeaders?.includes(key.toLowerCase()))
          .map(([, header]) => ({[header[0].key]: header[0].value}))
          .reduce((accu, curr) => ({...accu, ...curr}), {}),
        body: request.body?.data
          ? Buffer.from(request.body.data, request.body.encoding)
          : undefined
      }),
      {signingRegion}
    );

    request.headers = Object
      .entries(signedHeaders)
      .map(([key, value]) => ({[key.toLowerCase()]: [{key: key, value}]}))
      .reduce((accu, curr) => ({...accu, ...curr}), {});

    logger.log(402, `Headers modified successfully: ${JSON.stringify(request.headers)}`);
    return request;
  }

  async init() {
    this.#sigV4 = new SignatureV4({
      service: 'lambda',
      region: 'us-east-1',
      credentials: await fromNodeProviderChain()(),
      sha256
    });

    await super.init();
  }
}

function sha256(secret) {
  return secret ? createHmac('sha256', secret) : createHash('sha256');
}