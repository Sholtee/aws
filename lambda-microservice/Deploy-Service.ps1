#
# Deploy-Service.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Service.ps1 -action [create|update] -app app-name -service service-name -profile profile-name -region region-name
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

$functionName = "${app}-${service}-lambda"

aws cloudformation ${action}-stack `
  --profile ${profile} `
  --stack-name "${app}-${service}" `
  --region ${region} `
  --template-body "file://./${service}.yml" `
  --parameters "ParameterKey=app,ParameterValue=${app}" "ParameterKey=functionName,ParameterValue=${functionName}" `
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --region ${region} --stack-name "${app}-${service}"

Start-Process -FilePath npm -ArgumentList install -WorkingDirectory .\${service} -NoNewWindow -Wait

Compress-Archive -Path .\${service}\* -DestinationPath .\${service}.zip
try
{
  aws lambda update-function-code `
    --profile ${profile} `
    --function-name ${functionName} `
    --zip-file "fileb://./${service}.zip" `
    --no-cli-pager
}
finally
{
  Remove-Item -Path .\${service}.zip -Force
}

aws lambda wait function-updated --profile ${profile} --function-name ${functionName}
