/****************************************************
 * update-cf-test.mjs
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';
import {execSync} from 'child_process';
import {rmSync, writeFileSync} from 'fs';

class CloudFrontConfig {
  constructor(distroId) {
    const { ETag, Distribution: {DistributionConfig: config} } = JSON.parse(
      execSync(`aws cloudfront get-distribution --id ${distroId}`).toString()
    );
    this.ETag = ETag;
    this.id = distroId;
    this.config = config;
  }

  addOrigin(id, domainName) {
    const {Origins} = this.config;
    Origins.Items.push({
      ...Origins.Items.filter(origin => origin.Id === '404HandlerLambdaOrigin')[0],
      Id: id,
      DomainName: domainName
    });
    Origins.Quantity++;
  }

  removeOrigin(id) {
    const {Origins} = this.config;
    Origins.Items = Origins.Items.filter(origin => origin.Id !== id);
    Origins.Quantity = Origins.Items.length;
  }

  addCacheBehavior(path, originId, allowedMethods) {
    const
      {CacheBehaviors, DefaultCacheBehavior} = this.config,
      cachedMethods = allowedMethods.filter(m => ['HEAD', 'GET', 'OPTIONS'].indexOf(m) >= 0);
    CacheBehaviors.Items = CacheBehaviors.Items || [];
    CacheBehaviors.Items.push({
      ...DefaultCacheBehavior,
      PathPattern: path,
      TargetOriginId: originId,
      AllowedMethods: {
        Quantity: allowedMethods.length,
        Items: allowedMethods,
        CachedMethods: {
          Quantity: cachedMethods.length,
          Items: cachedMethods
        }
      }
    });
    CacheBehaviors.Quantity++;
  }

  removeCacheBehavior(path) {
    const {CacheBehaviors} = this.config;
    CacheBehaviors.Items = CacheBehaviors.Items.filter(cb => cb.PathPattern !== path);
    CacheBehaviors.Quantity = CacheBehaviors.Items.length;
  }

  update() {
    writeFileSync('./config.json', JSON.stringify(this.config));
    try {
      execSync(`aws cloudfront update-distribution --id ${this.id} --distribution-config "file://config.json" --if-match ${this.ETag}`);
    } finally {
      rmSync('./config.json', {force: true});
    }
    execSync(`aws cloudfront wait distribution-deployed --id ${this.id}`);
  }
}

const config = new CloudFrontConfig('TESTEST');

config.addOrigin('TestOrigin', 'testest.lambda-url.eu-central-1.on.aws');
config.addCacheBehavior('/', 'TestOrigin', ['GET', 'HEAD']);
//config.removeOrigin('TestOrigin');
//config.removeCacheBehavior('/');

config.update();
