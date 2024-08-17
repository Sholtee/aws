/****************************************************
 * index.mjs
 *
 * Author: Denes Solti
 *****************************************************/
'use strict';

export async function handler(event) {
  switch (event.parameters.someParameter) {
    case 'echo':
      return event;
    case 'error':
      throw Error('[500] Something went wrong');
    default:
      throw new Error('[400] Unknown value');
  }
}