#
# Deploy-Service.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Service.ps1 -action [create|update] -service service-name -config "./service-name.json" -profile profile-name -region region-name
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$action,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$service,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$config,

  [Parameter(Position=3, Mandatory=$true)]
  [string]$profile,

  [Parameter(Position=4, Mandatory=$true)]
  [string]$region
)

$ErrorActionPreference = "Stop"

$configJson = Get-Content $config -Raw | ConvertFrom-Json
$stackName = "$($configJson.app)-${service}"
$version = [DateTime]::UtcNow.Ticks
$zipFile = "${stackName}-lambda-${version}.zip"

Write-Host "Deploying function code..."

Start-Process -FilePath npm -ArgumentList install -WorkingDirectory .\${service} -NoNewWindow -Wait

Compress-Archive -Path .\${service}\* -DestinationPath .\${zipFile}
try {
  aws s3 cp --profile ${profile} --no-cli-pager .\${zipFile} s3://$($configJson.app)-lambda-bucket/lambda/
} finally {
  Remove-Item -Path .\${zipFile} -Force
}

Write-Host "Deploying infrastructure..."

$configJson.PSObject.Properties | ForEach-Object `
  -Begin {$params="`"ParameterKey=s3Key,ParameterValue=lambda/${zipFile}`" "} `
  -Process {$params += " `"ParameterKey=$($_.Name),ParameterValue=$($_.Value)`""}

Invoke-Expression ("aws cloudformation ${action}-stack "            +
  "--profile ${profile} "                                           +
  "--stack-name ${stackName} "                                      +
  "--region ${region} "                                             +
  "--template-body `"file://./${service}.yml`" "                    +
  "--parameters ${params} "                                         +
  "--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND "
)