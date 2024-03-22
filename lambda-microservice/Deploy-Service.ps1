#
# Deploy-Service.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Service.ps1 -action [create|update] -app app-name -service service-name -profile profile-name -region region-name [-concurrent-executions 10]
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
  [string]$region,

  [Parameter(Position=5, Mandatory=$false)]
  [int]$concurrentExecutions=0
)

$ErrorActionPreference = "Stop"

$functionName = "${app}-${service}-lambda"

$stackId = $(aws cloudformation ${action}-stack `
  --profile ${profile} `
  --stack-name "${app}-${service}" `
  --region ${region} `
  --template-body "file://./${service}.yml" `
  --parameters `
    "ParameterKey=app,ParameterValue=${app}" `
    "ParameterKey=functionName,ParameterValue=${functionName}" `
    "ParameterKey=concurrentExecutions,ParameterValue=${concurrentExecutions}" `
  --capabilities CAPABILITY_NAMED_IAM `
  --output text `
  --query 'StackId'`
)
if ($stackId) {
  Write-Host "Updating the stack..."
  aws cloudformation wait stack-${action}-complete --region ${region} --stack-name "${app}-${service}"
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