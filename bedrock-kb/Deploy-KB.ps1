#
# Deploy-KB.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-KB.ps1 -action [create|update] -app app -profile profile-name
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$action,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$app,

  [Parameter(Position=3, Mandatory=$true)]
  [string]$profile,

  [Parameter(Position=4)]
  [string]$region = 'us-east-1'
)

$ErrorActionPreference = "Stop"

aws cloudformation ${action}-stack `
  --profile ${profile} `
  --stack-name ${app}-kb `
  --region ${region} `
  --template-body file://./kb.yml `
  --parameters "ParameterKey=app,ParameterValue=${app}" `
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND