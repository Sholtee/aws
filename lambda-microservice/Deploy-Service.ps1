#
# Deploy-Service.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Service.ps1 -action [create|update] -service service-name -config "./service1.json" -profile profile-name -region region-name
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
$functionName = "$($configJson.app)-${service}-lambda"
$stackName = "$($configJson.app)-${service}"

$configJson.PSObject.Properties | ForEach-Object `
  -Begin {$params="`"ParameterKey=functionName,ParameterValue=${functionName}`" "} `
  -Process {$params += " `"ParameterKey=$($_.Name),ParameterValue=$($_.Value)`""}

$stackId = Invoke-Expression ("aws cloudformation ${action}-stack " +
  "--profile ${profile} "                                           +
  "--stack-name ${stackName} "                                      +
  "--region ${region} "                                             +
  "--template-body `"file://./${service}.yml`" "                    +
  "--parameters ${params} "                                         +
  "--capabilities CAPABILITY_NAMED_IAM "                            +
  "--output text "                                                  +
  "--query 'StackId'"
)
if ($stackId) {
  Write-Host "Updating the stack..."
  aws cloudformation wait stack-${action}-complete --region ${region} --stack-name ${stackName}
}

Write-Host "Deploying function code..."

Start-Process -FilePath npm -ArgumentList install -WorkingDirectory .\${service} -NoNewWindow -Wait

Compress-Archive -Path .\${service}\* -DestinationPath .\${service}.zip
try {
  aws lambda update-function-code `
    --profile ${profile} `
    --function-name ${functionName} `
    --zip-file "fileb://./${service}.zip" `
    --no-cli-pager
} finally {
  Remove-Item -Path .\${service}.zip -Force
}

aws lambda wait function-updated --profile ${profile} --function-name ${functionName}

$versions = (
  $(aws lambda list-versions-by-function --profile ${profile} --function-name ${functionName}) | ConvertFrom-Json
).Versions
if ($versions.Length -gt 1) {
  Write-Host "Arming a new version..."
  $newVersion = $(aws lambda publish-version `
    --profile ${profile} `
    --function-name ${functionName} `
    --output text `
    --query 'Version'`
  )
  Write-Host $newVersion

  aws lambda update-alias `
    --profile ${profile} `
    --function-name ${functionName} `
    --function-version ${newVersion} `
    --name armed-version

  aws lambda wait function-updated --profile ${profile} --function-name ${functionName}
}

Write-Host "All ok"