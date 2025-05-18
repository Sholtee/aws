/****************************************************
 * File: session-handler.spec.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import Router from '../../session-handler/router.mjs';


describe('Router', () => {
  let router, request;

  beforeEach(() => {
    router = new Router('my-app');
    request = {
      "path": "/",
      "httpMethod": "GET",
      "headers": {
        "header1": "value1",
        "header2": "value1,value2",
        "x-my-app-session": '{"username": "test_user", "roles": ["admin"]}'
      },
      "multiValueHeaders": {
        "header1": [
          "value1"
        ],
        "header2": [
          "value1",
          "value2"
        ]
      },
      "queryStringParameters": {
        "parameter1": "value1,value2",
        "parameter2": "value"
      },
      "multiValueQueryStringParameters": {
        "parameter1": [
          "value1",
          "value2"
        ],
        "parameter2": [
          "value"
        ]
      },
      "requestContext": {
        "requestId": "request_id"
      },
      "pathParameters": null,
      "stageVariables": null,
      "body": "Hello from Lambda!",
      "isBase64Encoded": false
    };
  })

  it('should route', async () => {
    const callback = (req, writeResponse) => {
      expect(req.url).toBe('/pet/spikey');
      expect(req.params.id).toBe('spikey');
      expect(req.user.username).toBe('test_user');
      writeResponse({status: 200});
    };
    callback.method = 'GET';
    callback.path = '/pet/:id';

    router.register(callback);

    request.path = '/pet/spikey';

    const response = await router.route(request);
    expect(response.status).toBe(200);
  });

  it('should return 404 on no match', async () => {
    const response = await router.route(request);
    expect(response.status).toBe(404);
  });

  Object.entries({'Some error': true, 'Internal server error': false}).forEach(([ error, exposeExcInfo]) => {
    it(`should return HTTP 500 on internal error with message: "${error}"`,  async () => {
      const callback = () => {
        throw 'Some error'
      };
      callback.method = 'GET';

      request.path =callback.path = '/error';
      router.register(callback);
      router.exposeExcInfo = exposeExcInfo;

      const response = await router.route(request);
      expect(response.status).toBe(500);
      expect(JSON.parse(response.body).error).toEqual(error)
    });
  });
});