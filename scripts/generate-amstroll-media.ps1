param(
    [string]$RepositoryRoot = (Join-Path $PSScriptRoot '..')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$taskRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
$inputDirectory = Join-Path $taskRoot 'assets/amstroll/screenshots'
$outputDirectory = Join-Path $taskRoot 'assets/img'

# The supplied cover is a separate, user-authored asset. Validate it without
# rewriting it; only the six individual phone captures are generated below.
$coverPath = Join-Path $outputDirectory 'amstroll.png'
$coverHashBefore = (Get-FileHash -LiteralPath $coverPath -Algorithm SHA256).Hash
$cover = [System.Drawing.Bitmap]::new($coverPath)
try {
    if ($cover.Width -ne 2200 -or $cover.Height -ne 900) { throw 'Expected the supplied 2200x900 Amstroll cover.' }
}
finally { $cover.Dispose() }

# Capture pixels are the source of truth. This script only crops, uniformly
# resizes the narrow capture, and clips the existing phone perimeter.
$screens = @(
    @{ Name = 'explore-393.png'; X = 7; Y = 25; Width = 378; Height = 802 },
    @{ Name = 'twenty-idea-collection.png'; X = 345; Y = 65; Width = 410; Height = 870 },
    @{ Name = 'amstroll-detail.png'; X = 345; Y = 65; Width = 410; Height = 870 },
    @{ Name = 'amstroll-in-progress.png'; X = 345; Y = 65; Width = 410; Height = 870 },
    @{ Name = 'memory-completion.png'; X = 345; Y = 65; Width = 410; Height = 870 },
    @{ Name = 'journal-memory.png'; X = 345; Y = 65; Width = 410; Height = 870 }
)

$canvasWidth = 460
$canvasHeight = 930
$phoneX = 25
$phoneY = 30
$phoneWidth = 410
$phoneRadius = 56

function New-RoundedPath([single]$X, [single]$Y, [single]$Width, [single]$Height, [single]$Radius) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = 2 * $Radius
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc(($X + $Width - $diameter), $Y, $diameter, $diameter, 270, 90)
    $path.AddArc(($X + $Width - $diameter), ($Y + $Height - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($X, ($Y + $Height - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-TransparentBitmap([int]$Width, [int]$Height) {
    $bitmap = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bitmap.SetResolution(96, 96)
    return $bitmap
}

function Assert-Png([string]$Path, [int]$Width, [int]$Height, [bool]$CheckPhone) {
    $bitmap = [System.Drawing.Bitmap]::new($Path)
    try {
        if ($bitmap.Width -ne $Width -or $bitmap.Height -ne $Height) { throw "Unexpected PNG dimensions: $Path" }
        foreach ($point in @(@(0, 0), @(($Width - 1), 0), @(0, ($Height - 1)), @(($Width - 1), ($Height - 1)))) {
            if ($bitmap.GetPixel($point[0], $point[1]).A -ne 0) { throw "PNG corner is not transparent: $Path" }
        }
        if ($bitmap.GetPixel([int]($Width / 2), [int]($Height / 2)).A -ne 255) { throw "PNG centre is not opaque: $Path" }
        if ($CheckPhone) {
            $occupiedX = @(0..($Width - 1) | Where-Object { $bitmap.GetPixel($_, 465).A -gt 0 })
            $occupiedY = @(0..($Height - 1) | Where-Object { $bitmap.GetPixel(230, $_).A -gt 0 })
            if ($occupiedX[0] -ne 25 -or $occupiedX[-1] -ne 434 -or $occupiedY[0] -ne 30 -or $occupiedY[-1] -ne 899) {
                throw "Phone extent must be 410x870 at (25,30): $Path"
            }
        }
    }
    finally { $bitmap.Dispose() }
    $file = Get-Item -LiteralPath $Path
    Write-Output ('PASS {0}: {1}x{2}, corners alpha=0, centre alpha=255, {3} bytes' -f $file.Name, $Width, $Height, $file.Length)
}

for ($index = 0; $index -lt $screens.Count; $index++) {
    $screen = $screens[$index]
    $sourcePath = Join-Path $inputDirectory $screen.Name
    $source = [System.Drawing.Bitmap]::new($sourcePath)
    $canvas = New-TransparentBitmap $canvasWidth $canvasHeight
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $crop = $null
    $clip = $null
    try {
        $rectangle = [System.Drawing.Rectangle]::new($screen.X, $screen.Y, $screen.Width, $screen.Height)
        $crop = $source.Clone($rectangle, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $scale = $phoneWidth / [double]$screen.Width
        $drawHeight = [single]($screen.Height * $scale)
        $clip = New-RoundedPath $phoneX $phoneY $phoneWidth $drawHeight $phoneRadius
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.SetClip($clip)
        if ($screen.Width -eq $phoneWidth) {
            $graphics.DrawImageUnscaled($crop, $phoneX, $phoneY)
            # Verify original screenshot pixels survive the unscaled crop exactly.
            foreach ($sample in @(@(100, 200), @(205, 435), @(300, 500))) {
                $original = $source.GetPixel(($screen.X + $sample[0]), ($screen.Y + $sample[1])).ToArgb()
                $result = $canvas.GetPixel(($phoneX + $sample[0]), ($phoneY + $sample[1])).ToArgb()
                if ($original -ne $result) { throw "Source pixel changed: $sourcePath" }
            }
        }
        else {
            # The 393px capture is uniformly scaled; no UI elements are redrawn.
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $destination = [System.Drawing.RectangleF]::new($phoneX, $phoneY, $phoneWidth, $drawHeight)
            $graphics.DrawImage($crop, $destination)
        }
        $outputPath = Join-Path $outputDirectory ('am{0}.png' -f ($index + 1))
        $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        if ($clip) { $clip.Dispose() }
        if ($crop) { $crop.Dispose() }
        $graphics.Dispose()
        $canvas.Dispose()
        $source.Dispose()
    }
    Assert-Png $outputPath $canvasWidth $canvasHeight $true
}

$coverHashAfter = (Get-FileHash -LiteralPath $coverPath -Algorithm SHA256).Hash
if ($coverHashAfter -ne $coverHashBefore) { throw 'The supplied Amstroll cover must remain unchanged.' }
Write-Output ('PASS amstroll.png: supplied 2200x900 cover preserved byte for byte, SHA256 {0}' -f $coverHashAfter)
