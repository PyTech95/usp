from PIL import Image
import sys
def measure(f, thr=200, x0=0, x1=None):
    im=Image.open(f).convert('L'); w,h=im.size; x1=x1 or w
    px=im.load()
    bg=px[5,5]
    runs=[];start=None
    for y in range(h):
        d=any(abs(px[x,y]-bg)>40 for x in range(x0,x1,2))
        if d and start is None: start=y
        if not d and start is not None: runs.append((start,y)); start=None
    if start is not None: runs.append((start,h))
    out=[]
    for a,b in runs:
        xs=[x for x in range(x0,x1,2) if any(abs(px[x,yy]-bg)>40 for yy in range(a,b,max(1,(b-a)//4)))]
        out.append((a,b,b-a,min(xs),max(xs)))
    return w,h,bg,out
for f in sys.argv[1:]:
    w,h,bg,out=measure(f)
    print('==',f[-14:],w,h,'bg',bg)
    for o in out: print('  ',o)
