#
# Deploy-Service.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Service.ps1 -action [create|update] -app appName -service serviceName -profile profileName -region region
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$action,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$app,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$service,

  [Parameter(Position=3, Mandatory=$true)]
  [string]$profile,

  [Parameter(Position=4, Mandatory=$true)]
  [string]$region
)

$ErrorActionPreference = "Stop"

aws cloudformation ${action}-stack `
  --profile ${profile} `
  --stack-name "${app}-${service}" `
  --region ${region} `
  --template-body "file://./${service}.yml" `
  --parameters "ParameterKey=app,ParameterValue=${app}" `
  --capabilities CAPABILITY_NAMED_IAM
