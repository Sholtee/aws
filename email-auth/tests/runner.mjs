/****************************************************
 * File: runner.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

// Import Jasmine using require
const
  Jasmine = require('jasmine'),
  jasmineConfig = require('./jasmine.json');

// Initialize Jasmine
const jasmine = new Jasmine();
jasmine.loadConfig(jasmineConfig);
jasmine.execute();