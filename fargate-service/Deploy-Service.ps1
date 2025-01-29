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
  [string]$region,

  [switch]$skipImageUpdate = $false
)

$ErrorActionPreference = "Stop"

$stackName = "${app}-${service}"

if (!$skipImageUpdate) {
  docker build --file ${service}/Dockerfile --platform linux/amd64 --force-rm --tag ${stackName} .

  $ecrHost = "$(aws sts get-caller-identity --profile ${profile} --region ${region} --query Account --output text).dkr.ecr.${region}.amazonaws.com"

  aws ecr get-login-password --profile $profile --region $region | docker login --username AWS --password-stdin $ecrHost
  try {
    $image = "${ecrHost}/${app}-repository:${app}-${service}-$((New-Guid).ToString('N'))"

    docker tag $(docker images --filter=reference=$app-$service --format "{{.ID}}") $image
    docker push $image
  } finally {
    docker logout $ecrHost
  }

  $imageParam = "ParameterValue=${image}"
} else {
  $imageParam = "UsePreviousValue=true"
}

aws cloudformation ${action}-stack `
  --profile $profile `
  --stack-name $stackName `
  --region $region `
  --template-body file://./$service.yml `
  --parameters "ParameterKey=app,ParameterValue=${app}" "ParameterKey=image,${imageParam}" `
  --capabilities CAPABILITY_NAMED_IAM