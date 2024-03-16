#
# Deploy-Global.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Global.ps1 -action [create|update] -app app-name -profile profile-name
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$action,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$app,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$profile
)

$ErrorActionPreference = "Stop"

aws cloudformation ${action}-stack `
  --profile ${profile} `
  --stack-name ${app}-globals `
  --region us-east-1 `
  --template-body file://./global.yml `
  --parameters "ParameterKey=app,ParameterValue=${app}" `
  --capabilities CAPABILITY_NAMED_IAM
