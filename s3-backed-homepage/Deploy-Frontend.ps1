#
# Deploy-Frontend.ps1
#
# Author: Denes Solti
#
# Usage: Deploy-Frontend.ps1 -app app-name -profile profile-name
#

param(
  [Parameter(Position=1, Mandatory=$true)]
  [string]$app,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$profile
)

$ErrorActionPreference = "Stop"

Write-Host Removing old content:
aws s3 rm s3://${app}-frontend --recursive --profile ${profile}

Write-Host `nUploading new content:
Set-Location -Path .\frontend
try {
  Get-ChildItem -Path . -Attributes Archive -Recurse | ForEach-Object {
    $remote = (Resolve-Path -Relative $_.FullName).SubString(1).Replace('\','/')
    aws s3 cp $_.FullName s3://${app}-frontend${remote} --profile ${profile}
  }
} finally {
  Set-Location -Path .\..
}

Write-Host `nInvalidating CloudFront distribution:
(aws cloudfront list-distributions --profile ${profile} | ConvertFrom-Json).DistributionList.Items | ForEach-Object {
  if ($_.Origins.Items | Where {$_.DomainName -Eq "${app}-frontend.s3.amazonaws.com" | Select -First 1 }) {
    Write-Host $_.Id
    aws cloudfront create-invalidation --distribution-id $_.Id --paths "/*" --profile ${profile} | Out-Null
  }
}