/****************************************************
 * File: session-handler.spec.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import {decode} from 'html-entities';
import {mockClient} from 'aws-sdk-client-mock';
import {DynamoDBClient, DescribeTableCommand} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand} from '@aws-sdk/lib-dynamodb';

import DynamoDb from '../../session-handler/services/dynamodb.mjs';
import Router from '../../session-handler/router.mjs';
import ServiceContainer from '../../session-handler/service-container.mjs';

describe('Router', () => {
  let router, request;

  beforeEach(() => {
    router = new Router({appName: 'my-app'});
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
  });

  it('should route', async () => {
    router.register({
      method: 'GET',
      path: '/pet/:id',
      handler(req, writeResponse)  {
        expect(req.url).toBe('/pet/spikey');
        expect(req.params.id).toBe('spikey');
        expect(req.user.username).toBe('test_user');
        writeResponse({statusCode: 200});
      }
    });

    request.path = '/pet/spikey';

    const response = await router.route(request);
    expect(response.statusCode).toBe(200);
  });

  it('should not chain handlers', async () => {
    router.register({
      method: 'GET',
      path: '/pet/',
      handler(req, writeResponse)  {
        writeResponse({statusCode: 304});
      }
    });

    router.register({
      method: 'GET',
      path: '/pet/spikey',
      handler(req, writeResponse)  {
        expect(req.url).toBe('/pet/spikey');
        writeResponse({statusCode: 200});
      }
    });

    request.path = '/pet/spikey';

    const response = await router.route(request);
    expect(response.statusCode).toBe(200);
  });

  it('should return 404 on no match', async () => {
    const response = await router.route(request);
    expect(response.statusCode).toBe(404);
  });

  it('should return 404 on unhandled match', async () => {
    let handlerCalled = false;

    router.register({
      method: 'GET',
      path: '/',
      handler(req, writeResponse, notFound)  {
        handlerCalled = true;
        notFound();
      }
    });

    const response = await router.route(request);

    expect(handlerCalled).toBeTrue();
    expect(response.statusCode).toBe(404);
  });

  Object.entries({'Some error': true, 'Internal server error': false}).forEach(([ error, exposeExcInfo]) => {
    it(`should return HTTP 500 on internal error with message: "${error}"`,  async () => {
      router = new Router({appName: 'my-app', exposeExcInfo});

      router.register({
        method: 'GET',
        path: request.path = '/error',
        async handler()  {
          throw 'Some error'
        }
      });

      const response = await router.route(request);
      expect(response.statusCode).toBe(500);

      const match = decode(/<div class="content">(.*?)<\/div>/i.exec(response.body)[1]);
      expect(JSON.parse(match).error).toEqual(error)
    });
  });
});

describe('ServiceContainer', () => {
  class ServiceA {}

  class ServiceB {
    constructor(serviceA) {
      this.serviceA = serviceA;
    }
  }

  let container;

  beforeEach(() => container = new ServiceContainer());

  it('should resolve the dependency graph', () => {
    container
      .configure('serviceA', () => new ServiceA())
      .configure('serviceB', container => new ServiceB(container.serviceA));

    const {serviceB} = container;
    expect(serviceB).toBeInstanceOf(ServiceB);
    expect(serviceB.serviceA).toBeInstanceOf(ServiceA);
  });

  it('should return undefined on missing dependency', () => {
    expect(container.service).not.toBeDefined();
  });

  it('should instantiate lazily', () => {
    let factoryCalled = false;

    container
      .configure('serviceA', () => {
        factoryCalled = true;
        return new ServiceA();
      })
      .configure('serviceB', container => new ServiceB(container.serviceA));

    expect(factoryCalled).toBeFalse();
    const _ = container.serviceB;
    expect(factoryCalled).toBeTrue();
  });

  it('should instantiate only once', () => {
    let callCount = 0;

    container.configure('serviceA', () => {
      callCount++;
      return new ServiceA();
    });

    expect(container.serviceA).toBe(container.serviceA);
    expect(callCount).toBe(1);
  });
});

describe('DynamoDb', () => {
  let
    mockDocumentClient = mockClient(DynamoDBDocumentClient),
    mockLowLevelClient = mockClient(DynamoDBClient).on(DescribeTableCommand).resolves({
      Table: {
        KeySchema: [
          {
            AttributeName: 'primaryKey',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'sortKey',
            KeyType: 'RANGE'
          }
        ]
      }
    });

  afterEach(() => mockDocumentClient.reset());

  it('should query the keys', async () => {
    const client = new DynamoDb('my-table', null, {
      DynamoDBClient,
      DynamoDBDocumentClient,
      DescribeTableCommand
    });

    expect(await client.partitionKey).toBe('primaryKey');
    expect(await client.sortKey).toBe('sortKey');
  });

  it('should query single item', async () => {
    mockDocumentClient.on(GetCommand).resolves('result');

    const client = new DynamoDb('my-table', null, {
      DynamoDBClient,
      DynamoDBDocumentClient,
      DescribeTableCommand,
      GetCommand
    });

    expect(await client.getItem('cica')).toBe('result');

    const [{args: [{input}]}] = mockDocumentClient.commandCalls(GetCommand);
    expect(input.TableName).toBe('my-table');
    expect(input.Key).toEqual({primaryKey: 'cica'});
  });

  it('should query item list', async () => {
    mockDocumentClient.on(QueryCommand).resolves({
      Items: ['result']
    });

    const client = new DynamoDb('my-table', null, {
      DynamoDBClient,
      DynamoDBDocumentClient,
      DescribeTableCommand,
      QueryCommand
    });

    expect(await client.listItems('cica', ['>', 1990], 20)).toEqual(['result']);

    const [{args: [{input}]}] = mockDocumentClient.commandCalls(QueryCommand);
    expect(input.TableName).toBe('my-table');
    expect(input.KeyConditionExpression).toBe('primaryKey = :key AND sortKey > :value');
    expect(input.ExpressionAttributeValues).toEqual({
      ":key": "cica",
      ":value": 1990
    });
    expect(input.Limit).toBe(20);
  });

  it('should store item', async () => {
    mockDocumentClient.on(PutCommand);

    const client = new DynamoDb('my-table', null, {
      DynamoDBClient,
      DynamoDBDocumentClient,
      DescribeTableCommand,
      PutCommand
    });

    await client.putItem({primaryKey: 'cica', sortKey: 1000});

    const [{args: [{input}]}] = mockDocumentClient.commandCalls(PutCommand);
    expect(input.TableName).toBe('my-table');
    expect(input.Item).toEqual({
      primaryKey: "cica",
      sortKey: 1000
    });
  });
});