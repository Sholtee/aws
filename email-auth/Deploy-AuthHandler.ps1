#
# Deploy-AuthHandler.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-AuthHandler.ps1 -action [create|update] -profile profile-name
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$action,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$profile
)

$ErrorActionPreference = "Stop"

$localName = "auth-handler"
$app = (Get-Content ".\$localName\config.json" -Raw | ConvertFrom-Json).appName
$stackName = "$app-authenticator"

$stackId = $(aws cloudformation $action-stack `
  --profile $profile `
  --region us-east-1 `
  --stack-name "$stackName" `
  --template-body "file://./$localName.yml" `
  --capabilities CAPABILITY_NAMED_IAM `
  --output text `
  --query StackId
)
if ($stackId) {
  Write-Host "Updating the stack..."
  aws cloudformation wait stack-${action}-complete --profile $profile --region us-east-1 --stack-name $stackName
}

Write-Host "Deploying function code..."

Start-Process `
  -FilePath npm.cmd `
  -WorkingDirectory .\$localName `
  -NoNewWindow `
  -Wait `
  -ArgumentList @('install', '--force', '--omit=optional')

Compress-Archive -Path .\$localName\* -DestinationPath .\$localName.zip
try {
  aws lambda update-function-code `
    --profile $profile `
    --region us-east-1 `
    --function-name $stackName `
    --zip-file "fileb://./$localName.zip" `
    --no-cli-pager | Out-Null
} finally {
  Remove-Item -Path .\$localName.zip -Force
}

aws lambda wait function-updated --profile $profile --region us-east-1 --function-name $stackName | Out-Null

$versions = $(aws lambda list-versions-by-function `
  --profile $profile `
  --region us-east-1 `
  --function-name $stackName `
  --output text `
  --query Versions
)
if ($versions.Length -gt 1) {
  Write-Host "Arming a new version..."
  aws lambda publish-version `
    --profile $profile `
    --region us-east-1 `
    --function-name $stackName `
    --output text `
    --query 'Version'

  aws lambda wait function-updated --profile $profile --region us-east-1 --function-name $stackName
}

Write-Host "All ok"