/****************************************************
 * File: request-signer.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';

import {createHash, createHmac} from 'crypto';
import {parse} from 'querystring';

import {fromNodeProviderChain} from '@aws-sdk/credential-providers';
import {SignatureV4} from '@aws-sdk/signature-v4';
import {HttpRequest} from '@smithy/protocol-http';

const credentials = await fromNodeProviderChain()()

export default class RequestSigner {
  static #sigV4 = new SignatureV4({
    service: 'lambda',
    region: 'us-east-1',
    credentials,
    sha256
  });

  #initialized;
  #config;

  constructor(...initParams) {
    this.#initialized = this.init(...initParams);
  }

  async sign({Records: [{cf: {request}}]}) {
    await this.#initialized;
    return await this.transformRequest(request);
  }

  async transformRequest(request) {
    console.log(`[SIGN-401] Signing request: ${JSON.stringify({...request, body: !!request.body})}`);

    if (request.body?.inputTruncated) {
      console.warn(`[SIGN-300] Request too large: ${request.headers['content-length'][0]['value']}`);
      return RequestSigner.createResponse(
        '400',
        'Bad request',
        JSON.stringify({message: 'Request too large'}),
        {'Content-Type': 'application/json'}
      );
    }

    const {signingRegion} = /(?<urlid>\w+)\.lambda-url\.(?<signingRegion>[\w-]+)\.on\.aws/i
      .exec(request.headers.host[0].value)
      .groups;
    console.log(`[SIGN-401] Signing region: ${signingRegion}`);

    const {headers: signedHeaders} = await RequestSigner.#sigV4.sign(
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
          .filter(([key]) => !this.#config.excludedHeaders?.includes(key.toLowerCase()))
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

    console.log(`[SIGN-403] Headers modified successfully: ${JSON.stringify(request.headers)}`);
    return request;
  }

  get config() {
    return this.#config;
  }

  get initialized() {
    return this.#initialized;
  }

  async init() {
    // we cannot set env vars for Lambda@Edge so grab the config from json
    const {default: config} = await import('./config.json', {
      with: { type: 'json' }
    });

    this.#config = config;

    console.log('[SIGN-400] Init complete');
  }

  static createResponse(status, statusDescription, body, headers) {
    return {
      status,
      statusDescription,
      headers: Object
        .entries(headers)
        .reduce((headers, [key, value]) => RequestSigner.createHeaderEntry(headers, key, value), {}),
      body
    };
  }

  static createHeaderEntry(cookies, key, value) {
    cookies[key.toLowerCase()] = [{key, value}];
    return cookies;
  }
}

function sha256(secret) {
  return secret ? createHmac('sha256', secret) : createHash('sha256');
}