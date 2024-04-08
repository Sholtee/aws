#
# Create-Cert.ps1
#
# Author: Denes Solti
#
# Usage: Create-Cert.ps1 -commonName www.example.com -region region-name -profile profile-name
#

param(
  [Parameter(Position=0, Mandatory=$true)]
  [string]$commonName,

  [Parameter(Position=1, Mandatory=$true)]
  [string]$region,

  [Parameter(Position=2, Mandatory=$true)]
  [string]$profile
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path cert)) {
  New-Item -Path . -Name cert -ItemType directory | Out-Null
}

function Combine-Path([Parameter(Position = 0)][string[]]$path) {
  return [System.IO.Path]::Combine($path)
}

function OpenSSL([Parameter(Position=0, Mandatory=$true)][string]$args) {
  Start-Process `
    -FilePath (Combine-Path $Env:Programfiles, 'Git', 'usr', 'bin', 'openssl.exe') `
    -ArgumentList ${args} `
    -NoNewWindow `
    -Wait
}

OpenSSL "genrsa -out $(Combine-Path 'cert', 'private.key') 2048"
OpenSSL "req -new -x509 -nodes -sha1 -days 365 -extensions v3_ca -subj ""/C=US/ST=Denial/L=Springfield/O=Dis/CN=${commonName}"" -key $(Combine-Path 'cert', 'private.key') -out $(Combine-Path 'cert', 'certificate.crt')"

Write-Host (
  aws acm import-certificate `
    --certificate fileb://cert/certificate.crt `
    --private-key fileb://cert/private.key `
    --region ${region} `
    --profile ${profile} `
    --query CertificateArn `
    --output text
).Trim()