/****************************************************
 * update_cf_test.mjs
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

  addOrigin(id) {
    this.config.Origins.Items.push({
      ...this.config.Origins.Items.filter(origin => origin.Id === '404HandlerLambdaOrigin')[0],
      Id: id
    });
    this.config.Origins.Quantity++;
  }

  removeOrigin(id) {
    this.config.Origins.Items = this.config.Origins.Items.filter(origin => origin.Id !== id);
    this.config.Origins.Quantity = this.config.Origins.Items.length;
  }

  update() {
    writeFileSync('./config.json', JSON.stringify(this.config));
    try {
      execSync(`aws cloudfront update-distribution --id ${this.id} --distribution-config "file://config.json" --if-match ${this.ETag}`);
    } finally {
      rmSync('./config.json', {force: true});
    }
  }
}

const config = new CloudFrontConfig('TESTTEST');

//config.addOrigin('TestOrigin');
config.removeOrigin('TestOrigin');
config.update();
