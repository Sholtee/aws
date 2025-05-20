/****************************************************
 * File: dynamodb.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import * as lowLevelBackend from '@aws-sdk/client-dynamodb';
import * as highLevelBackend from '@aws-sdk/lib-dynamodb';

export default class DynamoDb {
  #client;
  #tableName;
  #partitionKey;
  #sortKey;
  #initialized;
  #backend;

  constructor(tableName, options = {}, backend = {...lowLevelBackend, ...highLevelBackend}) {
    const lowLevelClient = new backend.DynamoDBClient(options)

    this.#client = backend.DynamoDBDocumentClient.from(lowLevelClient);
    this.#tableName = tableName;
    this.#backend = backend;
    this.#initialized = (async () => {
      const {Table: {KeySchema} } = await lowLevelClient.send(new backend.DescribeTableCommand({TableName: tableName}));

      this.#partitionKey = getAttributeByType('HASH');
      this.#sortKey = getAttributeByType('RANGE');

      function getAttributeByType(type) {
        return KeySchema.find(({KeyType}) => KeyType === type).AttributeName;
      }
    })();
  }

  async getItem(key) {
    await this.#initialized;

    return await this.#send('GetCommand', {
      Key: {[this.#partitionKey]: key},
    });
  }

  async listItems(key, [operator, value] = [], limit = 10) {
    await this.#initialized;

    let
      query = `${this.#partitionKey} = :key`,
      substitutions = {
        ':key': key
      };

    if (operator) {
      query += ` AND ${this.#sortKey} ${operator} :value`;
      substitutions[':value'] = value;
    }

    const {Items} = await this.#send('QueryCommand', {
      KeyConditionExpression: query,
      ExpressionAttributeValues: substitutions,
      Limit: limit
    });

    return Items;
  }

  async putItem(item) {
    await this.#initialized;

    return await this.#send('PutCommand', {
      Item: item,
    });
  }

  get partitionKey() {
    return this.#afterInit(async () => this.#partitionKey);
  }

  get sortKey() {
    return this.#afterInit(async () => this.#sortKey);
  }

  #send(command, config) {
    return this.#client.send(new this.#backend[command]({
      TableName: this.#tableName,
      ...config
    }));
  }

  async #afterInit(cb) {
    await this.#initialized;
    return await cb();
  }
}