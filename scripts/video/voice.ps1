$ErrorActionPreference = 'Stop'
$videoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$voiceOutput = Join-Path $videoRoot '.video-render'
$speaker = New-Object -ComObject SAPI.SpVoice
$chosenVoice = $speaker.GetVoices() | Where-Object { $_.GetDescription() -like '*Zira*' } | Select-Object -First 1
if (-not $chosenVoice) { throw 'The installed Zira voice is required for this film.' }
$speaker.Voice = $chosenVoice
$speaker.Rate = -2
$speaker.Volume = 85
$phrases = @(
    @{ Name = 'maternal-voice'; Text = "Hello, little one. I'm here with you." },
    @{ Name = 'maternal-story'; Text = 'Once upon a time, a little star was waiting for the sunrise.' }
)
foreach ($phrase in $phrases) {
    $stream = New-Object -ComObject SAPI.SpFileStream
    $stream.Format.Type = 22
    $stream.Open((Join-Path $voiceOutput ($phrase.Name + '.wav')), 3, $false)
    try {
        $speaker.AudioOutputStream = $stream
        [void]$speaker.Speak($phrase.Text)
    } finally { $stream.Close() }
}
Write-Output 'Created two original lines with the installed synthetic female voice.'
