/****************************************************
 * signer_test.mjs
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';
import {defaultProvider} from '@aws-sdk/credential-provider-node';
import {SignatureV4} from '@aws-sdk/signature-v4';
import {createHash, createHmac} from 'crypto';

class Sha256 {
  constructor(secret) {
    this.hash = secret
      ? createHmac('sha256', secret)
      : createHash('sha256');
  }
  update(array) {
    this.hash.update(array);
  }
  digest() {
    return Promise.resolve(new Uint8Array(this.hash.digest().buffer));
  }
}

const
  {accessKeyId, secretAccessKey, sessionToken} = await defaultProvider()(),
  sigV4 = new SignatureV4({
    service: 'lambda',
    region: 'us-east-1',
    credentials: {accessKeyId, secretAccessKey, sessionToken},
    sha256: Sha256
  });

(async function main() {
  try {
    const signed = await sigV4.sign(
      {
        method: 'POST',
        headers: {
          Host: 'test1234test4321.lambda-url.eu-west-2.on.aws'
        },
        path: '/',
        protocol: 'https',
        body: Buffer.from('SGVsbG8sIHdvcmxkIQ==', 'base64')
      },
      {
        signingRegion: 'eu-west-2'
      }
    );
    console.log(JSON.stringify(signed));
  } catch (err) {
    console.log(err);
  }
})();