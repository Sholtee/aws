#
# Deploy-Frontend.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Frontend.ps1 -action -app appName -profile profileName
#

param(
  [Parameter(Position=1, Mandatory=$true)]
  [string]$app,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$profile
)

$ErrorActionPreference = "Stop"

Set-Location -Path .\frontend
try {
  Get-ChildItem -Path . -Attributes Archive -Recurse | ForEach-Object {
    $remote = (Resolve-Path -Relative $_.FullName).SubString(1).Replace('\','/')
    aws s3 cp $_.FullName s3://${app}-frontend${remote} --profile ${profile}
  }
} finally {
  Set-Location -Path .\..
}

foreach ($distro in (aws cloudfront list-distributions --profile ${profile} | ConvertFrom-Json).DistributionList.Items) {
  if ($distro.Origins.Items | Where {$_.DomainName -Contains "${app}-frontend.s3.amazonaws.com" | Select -First 1 }) {
    Write-Host Invalidating: $distro.Id
    aws cloudfront create-invalidation --distribution-id $distro.Id --paths "/*" --profile ${profile} | Out-Null
  }
}