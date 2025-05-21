/****************************************************
 * File: auth-handler.spec.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import jwt from 'jsonwebtoken';

import {requestHandler as handler} from '../../auth-handler/index.mjs';
import config from '../../auth-handler/config.json' with {type: 'json'};

describe('SessionManagerSafe', () => {
  let request, context;

  beforeEach(() => {
    context = {awsRequestId: 'request_id'};
    request = {
      "Records": [
        {
          "cf": {
            "config": {
              "distributionDomainName": "d111111abcdef8.cloudfront.net",
              "distributionId": "EDFDVBD6EXAMPLE",
              "eventType": "viewer-request",
              "requestId": "4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ=="
            },
            "request": {
              "clientIp": "203.0.113.178",
              "headers": {
                "host": [
                  {
                    "key": "Host",
                    "value": "kjh123kjhbrkj.lambda-url.eu-west-2.on.aws"
                  }
                ],
                "cookie": [
                  {
                    "key": "Cookie",
                    "value": "name=value;"
                  }
                ]
              },
              "method": "GET",
              "querystring": "",
              "uri": "/"
            }
          }
        }
      ]
    };

    const mockSmClient = jasmine.createSpyObj('SecretsManagerClient', ['send']);
    mockSmClient.send.and.callFake(async () => ({
      SecretString: JSON.stringify({privateKey: 'secret'})
    }));

    handler.services.secretsManagerClient = mockSmClient;
  });

  it('should set the session header on valid sessions', async () => {
    const cookie = jwt.sign({
      exp: Math.floor(Date.now() / 1000) + (60 * 60),  // one hour expiration
      username: 'test',
      roles: ['test-role']
    }, 'secret');

    request.Records[0].cf.request.headers.cookie = [{
      "key": "Cookie",
      "value": `name=value;${config.appName}-session=${cookie}`
    }];

    const response = await handler.handle(request, context);

    expect(response).toBe(request.Records[0].cf.request);
    expect(response.headers[`x-${config.appName}-session`][0].value).toBe(JSON.stringify({
      username: 'test',
      roles: ['test-role']
    }));
    checkSigned(response);
  });

  it('should prevent session forgery (valid session)', async () => {
    const cookie = jwt.sign({
      exp: Math.floor(Date.now() / 1000) + (60 * 60),  // one hour expiration
      username: 'test',
      roles: ['test-role']
    }, 'secret');

    request.Records[0].cf.request.headers.cookie = [{
      "key": "Cookie",
      "value": `name=value;${config.appName}-session=${cookie}`
    }];

    request.Records[0].cf.request.headers[`x-${config.appName}-session`] = [{
      "key": `x-${config.appName}-session`,
      "value": JSON.stringify({
        username: 'root',
        roles: ['admins']
      })
    }];

    const response = await handler.handle(request, context);

    expect(response).toBe(request.Records[0].cf.request);
    expect(response.headers[`x-${config.appName}-session`][0].value).toBe(JSON.stringify({
      username: 'test',
      roles: ['test-role']
    }));
    checkSigned(response);
  });

  it('should set the session header on expired sessions', async () => {
    const cookie = jwt.sign({
      exp: Math.floor(Date.now() / 1000) - (60 * 60),
      username: 'test',
      roles: ['test-role']
    }, 'secret');

    request.Records[0].cf.request.headers.cookie = [{
      "key": "Cookie",
      "value": `name=value;${config.appName}-session=${cookie}`
    }];

    const response = await handler.handle(request, context);

    expect(response).toBe(request.Records[0].cf.request);
    expect(response.headers[`x-${config.appName}-session`][0].value).toBe(JSON.stringify({
      username: null,
      roles: ['anonymous']
    }));
    checkSigned(response);
  });

  it('should return anon user on invalid session', async () => {
    request.Records[0].cf.request.headers.cookie = [{
      "key": "Cookie",
      "value": `name=value;${config.appName}-session=invalid`
    }];

    const response = await handler.handle(request, context);

    expect(response).toBe(request.Records[0].cf.request);
    expect(response.headers[`x-${config.appName}-session`][0].value).toBe(JSON.stringify({
      username: null,
      roles: ['anonymous']
    }));
    checkSigned(response);
  });

  [true, false].forEach(hasCookieHeader =>
    it(`should return anon user on missing session (has cookie header: ${hasCookieHeader})`, async () => {
      if (!hasCookieHeader)
        delete request.Records[0].cf.request.headers.cookie;

      const response = await handler.handle(request, context);

      expect(response).toBe(request.Records[0].cf.request);
      expect(response.headers[`x-${config.appName}-session`][0].value).toBe(JSON.stringify({
        username: null,
        roles: ['anonymous']
      }));
      checkSigned(response, hasCookieHeader);
  }));

  it('should prevent session forgery (no session)', async () => {
    request.Records[0].cf.request.headers[`x-${config.appName}-session`] = [{
      "key": `x-${config.appName}-session`,
      "value": JSON.stringify({
        username: 'root',
        roles: ['admins']
      })
    }];

    const response = await handler.handle(request, context);

    expect(response).toBe(request.Records[0].cf.request);
    expect(response.headers[`x-${config.appName}-session`][0].value).toBe(JSON.stringify({
      username: null,
      roles: ['anonymous']
    }));
    checkSigned(response);
  });

  Object.entries({'Some error': true, 'Internal server error': false}).forEach(([ error, exposeExcInfo]) => {
    it(`should return HTTP 500 on internal error with message: "${error}"`, async () => {
      Object.defineProperty(request.Records[0].cf.request, 'headers', {
        get() {
          throw 'Some error';
        }
      });

      handler.config.exposeExcInfo = exposeExcInfo;
      const response = await handler.handle(request, context);

      expect(response !== request.Records[0].cf.request).toBeTrue();
      expect(response.status).toBe('500');
      expect(response.body).toBe(JSON.stringify({requestId: context.awsRequestId, error}));
    });
  });
});

function checkSigned({headers}, hasCookieHeader = true) {
  expect('x-amz-date' in headers).toBeTrue();
  expect('x-amz-content-sha256' in headers).toBeTrue();

  const {value: authHeader} = headers['authorization'][0] || {};

  expect(authHeader).toBeDefined();
  expect(authHeader.startsWith('AWS4-HMAC-SHA256 ')).toBeTrue();
  expect(authHeader.includes(`SignedHeaders=${hasCookieHeader ? 'cookie;' : ''}host;x-amz-content-sha256;x-amz-date;x-my-app-session`)).toBeTrue();
  expect(authHeader.includes('Signature=')).toBeTrue();
}