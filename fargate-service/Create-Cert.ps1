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

function OpenSSL([Parameter(Position=0, Mandatory=$true)][string]$args) {
  Start-Process `
    -FilePath (Join-Path $Env:Programfiles 'Git\\usr\\bin\\openssl.exe') `
    -ArgumentList ${args} `
    -NoNewWindow `
    -Wait
}

try
{
  OpenSSL 'genrsa -out private.key 2048'
  OpenSSL "req -new -x509 -nodes -sha1 -days 365 -extensions v3_ca -subj ""/C=US/ST=Denial/L=Springfield/O=Dis/CN=${commonName}"" -key private.key -out certificate.crt"

  Write-Host (
    aws acm import-certificate `
      --certificate fileb://certificate.crt `
      --private-key fileb://private.key `
      --region ${region} `
      --profile ${profile} `
      --query CertificateArn `
      --output text
  ).Trim()
} finally {
  Remove-Item -Path .\private.key -Force
  Remove-Item -Path .\certificate.crt -Force
}