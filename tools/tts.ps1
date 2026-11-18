# Offline text-to-speech with the Windows built-in voices (System.Speech). No network, no paid service.
# Usage: powershell -File tools/tts.ps1 -TextFile in.txt -Out out.wav [-Rate 0] [-Voice "Microsoft Zira Desktop"]
param([string]$TextFile, [string]$Out, [int]$Rate = 0, [string]$Voice = 'Microsoft Zira Desktop')
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice($Voice)
$s.Rate = $Rate
$s.Volume = 100
$s.SetOutputToWaveFile($Out)
$s.Speak((Get-Content -LiteralPath $TextFile -Raw -Encoding UTF8).Trim())
$s.Dispose()
