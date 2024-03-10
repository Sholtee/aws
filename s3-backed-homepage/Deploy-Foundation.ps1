#
# Deploy-Foundation.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Foundation.ps1 -action [create|update] -app appName -region regionName -profile profileName
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$action,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$app,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$region,

  [Parameter(Position=3, Mandatory=$true)]
  [string]$profile
)

$ErrorActionPreference = "Stop"

aws cloudformation ${action}-stack `
  --profile ${profile} `
  --stack-name ${app}-foundation `
  --region ${region} `
  --template-body file://./foundation.yml `
  --parameters "ParameterKey=app,ParameterValue=${app}" "ParameterKey=deploymentId,ParameterValue=$(New-Guid)" `
  --capabilities CAPABILITY_NAMED_IAM
