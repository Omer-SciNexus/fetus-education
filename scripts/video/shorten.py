"""Create a 43-second edition of the hearing film without altering the source."""
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.video-tools'))
import imageio_ffmpeg

VIDEOS = ROOT / 'public' / 'videos'
SOURCE = 'a-little-sun-hearing'
TARGET = f'{SOURCE}-43s'

subprocess.run([
    imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-hide_banner', '-loglevel', 'warning',
    '-i', str(VIDEOS / f'{SOURCE}.mp4'),
    '-map', '0:v:0', '-map', '0:a:0',
    '-vf', 'setpts=0.5*(PTS-STARTPTS)',
    '-af', 'atempo=2.0,apad',
    '-r', '24', '-t', '43',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
    str(VIDEOS / f'{TARGET}.mp4'),
], check=True)

def halve_timestamp(match):
    parts = match.group().split(':')
    seconds = 0
    for part in parts:
        seconds = seconds * 60 + float(part)
    milliseconds = round(seconds * 500)
    hours, milliseconds = divmod(milliseconds, 3600000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    seconds, milliseconds = divmod(milliseconds, 1000)
    return f'{hours:02}:{minutes:02}:{seconds:02}.{milliseconds:03}'

captions = (VIDEOS / f'{SOURCE}.en.vtt').read_text(encoding='utf-8')
captions = re.sub(r'(?:\d{2}:)?\d{2}:\d{2}\.\d{3}', halve_timestamp, captions)
(VIDEOS / f'{TARGET}.en.vtt').write_text(captions, encoding='utf-8')
shutil.copyfile(VIDEOS / f'{SOURCE}-poster.jpg', VIDEOS / f'{TARGET}-poster.jpg')
print(f'Created {TARGET}.mp4: 43 seconds, with pitch-preserving audio and retimed captions.')
