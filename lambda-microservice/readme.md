![Dependency Graph](architecture.png)

# Lambda microservice

## Prerequisites
- [PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-windows?view=powershell-7.4#install-powershell-using-winget-recommended)
- Node.js, version min. 18.x
- npm
- configured [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions)

## Installation
- `.\Deploy-Global.ps1 -action create -app lambda-microservice -profile default`
- `.\Deploy-Foundation.ps1 -action create -config "./foundation.json" -region eu-central-1 -profile default`
- `.\Deploy-Service.ps1 -action create -app lambda-microservice -region eu-central-1 -service service1 -profile default`

## Test
Visit `https://DISTRO_ID.cloudfront.net` or `https://DISTRO_ID.cloudfront.net/ANY_INVALID`