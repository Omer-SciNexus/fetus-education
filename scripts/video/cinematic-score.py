"""Original score with generic Windows speech synthesis for the hearing edition."""
import wave
from pathlib import Path
import numpy as np

RATE=44100
DURATION=86
audio=np.zeros((RATE*DURATION,2),dtype=np.float64)

def note(start,duration,freq,volume=.07,pan=0,attack=.9,decay=.6,harmonics=(1,.2,.06)):
    start_idx=int(start*RATE)
    count=min(int(duration*RATE),len(audio)-start_idx)
    if count<=0:return
    t=np.arange(count)/RATE
    env=(1-np.exp(-t/attack))*np.exp(-t/(duration*decay))*np.minimum(1,(duration-t)/.8)
    sound=sum(a*np.sin(2*np.pi*freq*(k+1)*t+.002*np.sin(t*3)) for k,a in enumerate(harmonics))*env*volume
    audio[start_idx:start_idx+count,0]+=sound*np.sqrt((1-pan)/2)
    audio[start_idx:start_idx+count,1]+=sound*np.sqrt((1+pan)/2)

chords=[[146.832,220,293.665,369.994],[123.471,184.997,246.942,293.665],[97.999,146.832,195.998,246.942],[110,164.814,220,293.665]]
for bar,start in enumerate(range(0,80,8)):
    for j,f in enumerate(chords[bar%4]):note(start,12,f,.075,(j-1.5)*.23)
# The early internal soundscape is subdued, with a slow, non-diagnostic pulse.
for start in np.arange(10,26,1.7):note(float(start),.65,58,.035,0,.04,.22,(1,.12))
for i,f in enumerate([587.33,739.99,880,739.99,493.88,587.33,739.99,587.33]):
    note(26+i*1.8,5,f,.045,np.sin(i*1.2)*.5,.18)
for i,f in enumerate([587.33,739.99,880,1174.66,880]):
    note(48.3+i*.85,3,f,.05,np.sin(i)*.5,.025)
# A rounded, humming-like musical motif is repeated during the familiarity scene.
for base in [53,65,73]:
    for i,f in enumerate([293.665,329.628,369.994,293.665]):
        note(base+i*.7,1.9,f,.075,np.sin(i*.7)*.2,.15,.8,(1,.05,.025))
for i,f in enumerate([392,493.88,587.33,783.99,587.33,493.88,392,587.33]):
    note(58+i*1.2,4,f,.04,np.sin(i)*.5,.035)
for j,f in enumerate([146.832,220,293.665,369.994,587.33]):note(78+j*.18,8-j*.18,f,.085,(j-2)*.18)
for delay,gain in [(.23,.13),(.47,.08),(.81,.05)]:
    n=int(delay*RATE);audio[n:]+=audio[:-n].copy()*gain

def speech(filename,start):
    with wave.open(str(Path('.video-render')/filename),'rb') as wav:
        rate=wav.getframerate();channels=wav.getnchannels()
        assert wav.getsampwidth()==2
        samples=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(np.float64)/32768
        if channels>1:samples=samples.reshape(-1,channels).mean(axis=1)
    samples=np.interp(np.arange(int(len(samples)*RATE/rate))*rate/RATE,np.arange(len(samples)),samples)
    # Warm, softly filtered speech, rather than unnaturally clear sound in the womb.
    samples=np.convolve(samples,np.ones(9)/9,mode='same')
    peak=np.max(np.abs(samples))
    if peak>0:samples=samples/peak*.24
    n=int(start*RATE);length=min(len(samples),len(audio)-n)
    audio[n:n+length]*=.5
    audio[n:n+length,0]+=samples[:length]*.95
    audio[n:n+length,1]+=samples[:length]
    delay=int(.16*RATE);length=min(length,len(audio)-n-delay)
    audio[n+delay:n+delay+length,0]+=samples[:length]*.075
    audio[n+delay:n+delay+length,1]+=samples[:length]*.075

for start in [42.5,59.0,69.0]:speech('maternal-voice.wav',start)
speech('maternal-story.wav',48.0)
t=np.arange(len(audio))/RATE
audio*=np.minimum(t/2,1)[:,None]*np.minimum((DURATION-t)/2,1)[:,None]
peak=float(np.max(np.abs(audio)))
audio*=min(1.7,.8/max(peak,1e-6))
target=Path('.video-render/a-little-sun-hearing-soundtrack.wav')
with wave.open(str(target),'wb') as out:
    out.setnchannels(2);out.setsampwidth(2);out.setframerate(RATE)
    out.writeframes((audio*32767).astype('<i2').tobytes())
print(f'Created {DURATION}-second score with repeated synthetic maternal speech; peak {np.max(np.abs(audio)):.3f}.')
