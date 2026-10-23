"""Deterministic original demo artwork; no downloaded footage."""
import math, random, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public'/'demo'
root.mkdir(exist_ok=True)
W,H=960,540
for name,variant in [('dusk',0),('coast',1)]:
    random.seed(8)
    pixels=bytearray()
    for y in range(H):
        v=y/H
        for x in range(W):
            u=x/W
            if not variant:
                stops=[(0,(35,40,60)),(.48,(194,133,108)),(.7,(232,182,127)),(1,(59,70,83))]
                for k in range(len(stops)-1):
                    a,ca=stops[k];b,cb=stops[k+1]
                    if a<=v<=b: f=(v-a)/(b-a);rgb=[ca[c]*(1-f)+cb[c]*f for c in range(3)];break
                d=math.hypot((u-.68)*W,(v-.36)*H)
                if d<42:rgb=[249,219,163]
                ridge=.7+.065*math.sin(u*8+1)+.028*math.sin(u*21)
                if v>ridge: rgb=[37+(v-ridge)*30,47+(v-ridge)*25,58+(v-ridge)*20]
                if v>.86+.04*math.sin(u*7-2):rgb=[25,34,45]
            else:
                f=min(1,v/.65);rgb=[40+f*128,68+f*118,98+f*95]
                if v>.56:
                    wave=math.sin(v*180+u*15)*2
                    rgb=[38+wave,83+wave,107+wave]
                ridge=.5+.22*math.exp(-((u-.22)/.27)**2)+.1*math.sin(u*7)
                if v>ridge and u<.48:rgb=[38,55,57]
                if v>.88+.08*math.sin(u*9):rgb=[26,42,45]
            noise=random.uniform(-1.7,1.7)
            pixels.extend(max(0,min(255,int(c+noise))) for c in rgb)
    ppm=Path('/private/tmp')/(name+'-sequence.ppm');ppm.write_bytes(f'P6\n{W} {H}\n255\n'.encode()+pixels)
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(ppm),'-frames:v','1',str(root/(name+'.jpg'))],check=True)
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-i',str(ppm),'-vf',"zoompan=z='min(zoom+0.0003,1.08)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=180:s=960x540:fps=30",'-t','6','-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',str(root/(name+'.mp4'))],check=True)
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','lavfi','-i','aevalsrc=0.05*sin(2*PI*220*t)+0.035*sin(2*PI*277.18*t)+0.025*sin(2*PI*329.63*t):s=48000:d=12','-af','afade=t=in:d=1,afade=t=out:st=10:d=2','-c:a','pcm_s16le',str(root/'ambient.wav')],check=True)
