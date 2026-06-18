$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".env")) {
  throw "Chua co .env. Hay copy .env.example thanh .env hoac chay: .\scripts\import-mariadb.ps1 -WriteEnv"
}

node src\server.js
