"""Original ambient score. No samples, external recordings or voiceover."""
import wave
import sys
from pathlib import Path
import numpy as np

RATE=44100
BONDING='--bonding' in sys.argv
DURATION=86 if BONDING else 68
NAME='a-little-sun-bonding' if BONDING else 'a-little-sun'
audio=np.zeros((RATE*DURATION,2),dtype=np.float64)

def note(start,duration,freq,volume=.1,pan=0,attack=1.2):
    count=min(int(duration*RATE),len(audio)-int(start*RATE))
    t=np.arange(count)/RATE
    envelope=(1-np.exp(-t/attack))*np.exp(-t/(duration*.52))*np.minimum(1,(duration-t)/1.2)
    sound=(np.sin(2*np.pi*freq*t)+.24*np.sin(2*np.pi*freq*2*t)+.08*np.sin(2*np.pi*freq*3*t))*envelope*volume
    idx=int(start*RATE)
    audio[idx:idx+count,0]+=sound*np.sqrt((1-pan)/2)
    audio[idx:idx+count,1]+=sound*np.sqrt((1+pan)/2)

# D major, B minor, G major, A suspended, returning gently to D.
chords=[[146.832,220,293.665,369.994],[123.471,184.997,246.942,293.665],[97.999,146.832,195.998,246.942],[110,164.814,220,293.665]]
def film_time(start):
    return start+18 if BONDING and start>=45 else start

for bar,start in enumerate(range(0,64,8)):
    for j,f in enumerate(chords[bar%4]):note(film_time(start),12,f,.085,(j-1.5)*.24)
for i,f in enumerate([587.33,739.99,880,739.99,493.88,587.33,739.99,587.33,392,493.88,587.33,739.99,440,587.33,659.25,880]):
    note(film_time(5+i*3.6),5.5,f,.055,np.sin(i*1.3)*.6)
for j,f in enumerate([146.832,220,293.665,369.994,587.33]):note(film_time(59+j*.25),9-j*.25,f,.09,(j-2)*.2)
if BONDING:
    # A soft sustained phrase, star-like chimes, then a flowing harp-like motif.
    # These are musical metaphors, with no simulated parent voice or heartbeat.
    for k,start in enumerate([45,51,57]):
        for j,f in enumerate(chords[k]):note(start,10,f,.07,(j-1.5)*.24)
    for i,f in enumerate([293.665,369.994,329.628,293.665]):
        note(45.3+i*1.3,2.8,f,.065,-.25+i*.15,.35)
    for i,f in enumerate([587.33,739.99,880,1174.66,880]):
        note(51.3+i*.95,3.3,f,.065,np.sin(i*1.2)*.5,.035)
    for i,f in enumerate([392,493.88,587.33,783.99,587.33,493.88,392,587.33]):
        note(57.1+i*.7,3.5,f,.065,np.sin(i*.7)*.6,.045)
for delay,gain in [(.23,.15),(.47,.09),(.81,.06)]:
    n=int(delay*RATE);audio[n:]+=audio[:-n].copy()*gain
t=np.arange(len(audio))/RATE
fade=np.minimum(t/2.5,1)*np.minimum((DURATION-t)/3,1)
audio*=fade[:,None]
audio=audio/max(np.max(np.abs(audio)),1)*.7
target=Path('.video-render')/f'{NAME}-soundtrack.wav'
target.parent.mkdir(exist_ok=True)
with wave.open(str(target),'wb') as output:
    output.setnchannels(2);output.setsampwidth(2);output.setframerate(RATE)
    output.writeframes((audio*32767).astype('<i2').tobytes())
print('Created original ambient score.')
