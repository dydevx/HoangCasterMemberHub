param(
  [string]$User = "root",
  [string]$HostName = "localhost",
  [int]$Port = 3306,
  [string]$Database = "memberhub",
  [switch]$WriteEnv
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sqlFile = Join-Path $root "database\memberhub_mariadb_import.sql"

if (-not (Test-Path $sqlFile)) {
  throw "Khong tim thay file import: $sqlFile"
}

$mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
if (-not $mysql) {
  $candidates = @(
    "C:\Program Files\MariaDB 12.3\bin\mysql.exe",
    "C:\Program Files\MariaDB*\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\laragon\bin\mysql\*\bin\mysql.exe",
    "C:\laragon\bin\mariadb\*\bin\mysql.exe"
  )

  foreach ($candidate in $candidates) {
    $match = Get-ChildItem -Path $candidate -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($match) {
      $mysql = $match.FullName
      break
    }
  }
}

if (-not $mysql) {
  throw "Khong tim thay mysql.exe. Hay them MariaDB bin vao PATH hoac sua script nay."
}

$securePassword = Read-Host "Nhap mat khau MariaDB cho user '$User' (de trong neu khong co)" -AsSecureString
$password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
)

$args = @("--host=$HostName", "--port=$Port", "--user=$User", "--default-character-set=utf8mb4")
if ($password) {
  $args += "--password=$password"
}

Write-Host "Dang import $sqlFile vao MariaDB..." -ForegroundColor Cyan
Get-Content -Raw -LiteralPath $sqlFile | & $mysql @args

if ($LASTEXITCODE -ne 0) {
  throw "Import that bai. Kiem tra user/password MariaDB."
}

if ($WriteEnv) {
  $envFile = Join-Path $root ".env"
  @"
DB_CLIENT=mariadb
DB_HOST=$HostName
DB_PORT=$Port
DB_USER=$User
DB_PASSWORD=$password
DB_NAME=$Database
DB_AUTO_CREATE=true
PORT=3000
"@ | Set-Content -LiteralPath $envFile -Encoding UTF8
  Write-Host "Da ghi cau hinh MariaDB vao .env" -ForegroundColor Green
}

Write-Host "Import MariaDB thanh cong." -ForegroundColor Green
