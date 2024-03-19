/****************************************************
 * get-image.mjs
 *
 * Author: Denes Solti
 *****************************************************/
import { EC2Client, DescribeImagesCommand } from '@aws-sdk/client-ec2';

const
  client = new EC2Client({
    region: 'eu-central-1'
  }),
  resp = await client.send(new DescribeImagesCommand({
    Filters: [
      {
        Name: 'state',
        Values: ['available']
      },
      {
        Name: 'description',
        Values: ['Amazon Linux 2023*x86_64 HVM kernel-6.1']
      }
    ],
    Owners: ['amazon']
  })),
  latest = resp.Images.sort(({CreationDate: a}, {CreationDate: b}) => Date.parse(b) - Date.parse(a))[0];

console.log(latest.ImageId);