/****************************************************
 * File: views.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {glob} from 'glob';
import * as pug from 'pug';
import * as sass from 'sass';

export const VIEWS = Object.freeze(
  glob
    .sync('views/!(_)*.pug', {
      cwd: path.dirname(fileURLToPath(import.meta.url)),
      absolute: true
    })
    .reduce((accu, file) => {
      const {name, dir} = path.parse(file);
      return {
        ...accu,
        [name]: pug.compileFile(file, {
          pretty: false,
          filters: {
            style(sassFile) {
              if (!path.isAbsolute(sassFile))
                sassFile = path.join(dir, sassFile);

              return `<style>${sass.compile(sassFile, {style: 'compressed'}).css}</style>`;
            }
          }
        })
      };
    }, {})
);