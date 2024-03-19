#
# Deploy-Foundation.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Foundation.ps1 -action [create|update] -app app-name -region region-name -profile profile-name
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
$stackName = "${app}-foundation"

aws cloudformation ${action}-stack `
  --profile ${profile} `
  --stack-name ${stackName} `
  --region ${region} `
  --template-body file://./foundation.yml `
  --parameters "ParameterKey=app,ParameterValue=${app}" "ParameterKey=clientIP,ParameterValue=$((Invoke-WebRequest -uri "https://api.ipify.org/").Content.Trim())"`
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-${action}-complete `
  --stack-name ${stackName} `
  --region ${region}

function Get-Output([Parameter(Mandatory=$true)][string]$name) {
  return (aws cloudformation describe-stacks `
    --stack-name ${stackName} `
    --region ${region} `
    --query "Stacks[0].Outputs[?OutputKey=='${name}'].OutputValue" `
    --output text
  ).Trim()
}

aws ssm get-parameter `
  --name $(Get-Output -name 'BastionPrivateKeyPath') `
  --with-decryption `
  --region ${region} `
  --query "Parameter.Value" `
  --output text `
  > ./bastion-private.pem

aws secretsmanager get-secret-value `
  --secret-id $(Get-Output -name 'MySqlSecret') `
  --region ${region} `
  --query SecretString `
  --output text `
  > ./mysql.secret

Write-Host "Bastion endpoint: $(Get-Output -name 'BastionEndpoint')"
Write-Host "MySql endpoint: $(Get-Output -name 'MySqlEndpoint')"
Write-Host "Redis endpoint: $(Get-Output -name 'RedisEndpoint')"