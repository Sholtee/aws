/****************************************************
 * signer-test.mjs
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';
import {defaultProvider} from '@aws-sdk/credential-provider-node';
import {SignatureV4} from '@aws-sdk/signature-v4';
import {createHash, createHmac} from 'crypto';

const
  sigV4 = new SignatureV4({
    service: 'lambda',
    region: 'us-east-1',
    credentials: defaultProvider(),
    sha256: function Sha256(secret) {
      return secret ? createHmac('sha256', secret) : createHash('sha256')
    }
  });

(async function main(endpoint) {
  try {
    const signed = await sigV4.sign(
      {
        hostname: endpoint,
        path: '/',
        protocol: 'https:',
        method: 'POST',
        body: JSON.stringify('hello'),
        headers: {
            host: endpoint,
            'Content-Type': 'application/json',
        }
      },
      {
        signingRegion: 'eu-central-1'
      }
    );

    console.log(JSON.stringify(signed));

    const ret = await fetch(`https://${signed.hostname}${signed.path}`, signed);

    console.log(await ret.text());
  } catch (err) {
    console.log(err);
  }
})('testestest1234567890.lambda-url.eu-central-1.on.aws');