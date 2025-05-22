/****************************************************
 * File: ses.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
import * as backend from '@aws-sdk/client-ses';

import {VIEWS} from '../views.mjs';

export default function Ses(sender, options, {SESClient, SendEmailCommand} = backend) {
  const client = new SESClient(options);

  this.send = async function(to, subject, viewName, params) {
    const {MessageId} = await client.send(new SendEmailCommand({
      Source: sender,
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: subject,
        Body: {
          Html: {
            Data: VIEWS[viewName](params)
          }
        }
      }
    }));
    return MessageId;
  }
}