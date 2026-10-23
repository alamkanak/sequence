"""Independent verification: python3 scripts/verify-export.py FILE --seconds 10.5 --frames 315."""
import argparse,json,subprocess
p=argparse.ArgumentParser();p.add_argument('file');p.add_argument('--seconds',type=float,required=True);p.add_argument('--frames',type=int,required=True);a=p.parse_args()
result=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',a.file]))
v=next(s for s in result['streams'] if s['codec_type']=='video')
assert int(v['nb_frames'])==a.frames,(v.get('nb_frames'),a.frames)
assert abs(float(result['format']['duration'])-a.seconds)<.022,result['format']['duration']
assert abs(float(v['duration'])-a.seconds)<.001,v['duration']
print(json.dumps({'videoCodec':v['codec_name'],'frames':int(v['nb_frames']),'duration':float(result['format']['duration']),'dimensions':[v['width'],v['height']],'audioCodecs':[s['codec_name'] for s in result['streams'] if s['codec_type']=='audio']},indent=2))
