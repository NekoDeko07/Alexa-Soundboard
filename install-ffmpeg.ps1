$tmp = Join-Path $env:TEMP 'ffmpeg.zip'
$uri = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
$dest = Join-Path $env:USERPROFILE 'ffmpeg'

Write-Output "Downloading $uri to $tmp..."
Invoke-WebRequest -Uri $uri -OutFile $tmp -UseBasicParsing

Write-Output "Extracting to $dest..."
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
Expand-Archive -Path $tmp -DestinationPath $dest -Force

Write-Output "Searching for ffplay.exe..."
$bin = Get-ChildItem -Path $dest -Recurse -Filter 'ffplay.exe' | Select-Object -First 1
if ($bin) {
  $binDir = $bin.DirectoryName
  Write-Output "Found ffplay in: $binDir"
  $userPath = [Environment]::GetEnvironmentVariable('PATH','User')
  if ($userPath -notlike "*${binDir}*") {
    [Environment]::SetEnvironmentVariable('PATH', $userPath + ';' + $binDir, 'User')
    Write-Output "Added $binDir to User PATH. You may need to restart your terminal to pick up changes."
  } else {
    Write-Output "$binDir already in PATH"
  }
  Write-Output "INSTALLED:$binDir"
} else {
  Write-Error "ffplay not found in archive"
}
