param(
  [string]$Source = (Join-Path $PSScriptRoot '..\favicon_portfolio\favicon.png'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\favicon_portfolio')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourcePath = [System.IO.Path]::GetFullPath($Source)
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null

function Write-SquarePng {
  param([System.Drawing.Image]$Image, [int]$Size, [string]$Name)

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bitmap.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($Image, 0, 0, $Size, $Size)
    $bitmap.Save((Join-Path $outputPath $Name), [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$image = [System.Drawing.Image]::FromFile($sourcePath)
try {
  Write-SquarePng $image 16 'favicon-16x16.png'
  Write-SquarePng $image 32 'favicon-32x32.png'
  Write-SquarePng $image 48 'favicon-48x48.png'
  Write-SquarePng $image 180 'apple-touch-icon.png'
  Write-SquarePng $image 192 'android-chrome-192x192.png'
  Write-SquarePng $image 512 'android-chrome-512x512.png'
}
finally {
  $image.Dispose()
}

# Modern ICO files may embed PNG payloads. Bundle the common 16, 32, and 48 px sizes.
$iconFiles = @('favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png')
$payloads = New-Object 'System.Collections.Generic.List[byte[]]'
foreach ($iconFile in $iconFiles) {
  $payloads.Add([System.IO.File]::ReadAllBytes((Join-Path $outputPath $iconFile)))
}
$icoPath = Join-Path $outputPath 'favicon.ico'
$stream = [System.IO.File]::Create($icoPath)
$writer = New-Object System.IO.BinaryWriter($stream)
try {
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]$payloads.Count)
  $offset = 6 + (16 * $payloads.Count)
  for ($index = 0; $index -lt $payloads.Count; $index++) {
    $size = @(16, 32, 48)[$index]
    $writer.Write([Byte]$size)
    $writer.Write([Byte]$size)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$payloads[$index].Length)
    $writer.Write([UInt32]$offset)
    $offset += $payloads[$index].Length
  }
  foreach ($payload in $payloads) { $writer.Write($payload) }
}
finally {
  $writer.Dispose()
  $stream.Dispose()
}
