#
# Deploy-Foundation.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Foundation.ps1 -action [create|update] -config foundtation.json -region region-name -profile profile-name
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$action,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$config,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$region,

  [Parameter(Position=3, Mandatory=$true)]
  [string]$profile
)

$ErrorActionPreference = "Stop"

$configJson = Get-Content $config -Raw | ConvertFrom-Json | Select-Object *, @{
  Name = 'deploymentId'
  Expression = { New-Guid }
}

$configJson.PSObject.Properties | ForEach-Object -Begin {$params=''} -Process {
  $params += "`"ParameterKey=$($_.Name),ParameterValue=$($_.Value)`" "
}

Invoke-Expression "aws cloudformation ${action}-stack --profile ${profile} --stack-name $($configJson.app)-foundation --region ${region} --template-body file://./foundation.yml --parameters ${params} --capabilities CAPABILITY_NAMED_IAM"