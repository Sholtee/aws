#
# Deploy-Foundation.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Foundation.ps1 -action [create|update] -app app-name -certificateArn certificate-arn -region region-name -profile profile-name
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$action,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$app,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$region,

  [Parameter(Position=3, Mandatory=$true)]
  [string]$profile,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$certificateArn
)

$ErrorActionPreference = 'Stop'

$stackName = "${app}-foundation"

aws cloudformation ${action}-stack `
  --profile ${profile} `
  --stack-name ${stackName} `
  --region ${region} `
  --template-body file://./foundation.yml `
  --parameters "ParameterKey=app,ParameterValue=${app}" "ParameterKey=certificateArn,ParameterValue=${certificateArn}" `
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND

aws cloudformation wait stack-${action}-complete --region ${region} --stack-name ${stackName}

aws cloudformation describe-stacks `
    --stack-name ${stackName} `
    --region ${region} `
    --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerEndpoint'].OutputValue" `
    --output text