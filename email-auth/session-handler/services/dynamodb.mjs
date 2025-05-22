/****************************************************
 * File: dynamodb.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import * as lowLevelBackend from '@aws-sdk/client-dynamodb';
import * as highLevelBackend from '@aws-sdk/lib-dynamodb';

export default function DynamoDb(tableName, options = {}, {DynamoDBClient, DynamoDBDocumentClient, DescribeTableCommand, GetCommand, QueryCommand, PutCommand} = {...lowLevelBackend, ...highLevelBackend}) {
  const
    lowLevelClient = new DynamoDBClient(options),
    client = DynamoDBDocumentClient.from(lowLevelClient);

  let
    partitionKey = null,
    sortKey = null,
    initialized = false;

  this.getItem = key => send(GetCommand, () => ({
    Key: {[partitionKey]: key},
  }));

  this.putItem = item => send(PutCommand, {
    Item: item,
  });

  this.listItems = async (key, [operator, value] = [], limit = 10) => {
    const {Items} = await send(QueryCommand, () => {
      let
        query = `${partitionKey} = :key`,
        substitutions = {
          ':key': key
        };

      if (operator) {
        query += ` AND ${sortKey} ${operator} :value`;
        substitutions[':value'] = value;
      }

      return {
        KeyConditionExpression: query,
        ExpressionAttributeValues: substitutions,
        Limit: limit
      };
    });
    return Items;
  }

  async function send(command, config) {
    if (!initialized)
      await initialize();

    if (typeof config === 'function')
      config = config();

    return await client.send(new command({
      TableName: tableName,
      ...config
    })) ;
  }

  async function initialize() {
    const {Table: {KeySchema} } = await lowLevelClient.send(new DescribeTableCommand({TableName: tableName}));

    partitionKey = getAttributeByType('HASH');
    sortKey = getAttributeByType('RANGE');

    initialized = true;

    function getAttributeByType(type) {
      return KeySchema.find(({KeyType}) => KeyType === type).AttributeName;
    }
  }
}