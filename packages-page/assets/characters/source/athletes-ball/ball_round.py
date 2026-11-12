# Athletes ball (9 Nov 2026): the storyboard's ball image was not round (a flattened blob with a bite out of one side), so as it
# spun after the kick it read as an oval. Redrawn as an exact circle in the same tone language: a soft glowing rim, a lit body
# (light from the upper left like the figure), and the classic dark centre pentagon with five patches around it, all clipped
# to the circle. Same 56x56 size, so the ball's on-screen size (ball.r) is unchanged.
import numpy as np
from PIL import Image
N=56; R=26.0; c=(N-1)/2
Y,X=np.mgrid[0:N,0:N].astype(float); dx,dy=X-c,Y-c; r=np.hypot(dx,dy)
inside=np.clip(R+.5-r,0,1)
light=.36+.12*np.clip(-(dx+dy)/(R*1.4),-1,1)                  # body, lit from the upper left
rim=np.exp(-((r-(R-1.6))/1.6)**2)*.32                          # a soft luminous rim
def poly_mask(cx,cy,rad,rot):
    ang=rot+np.arange(5)*2*np.pi/5; px=cx+rad*np.cos(ang); py=cy+rad*np.sin(ang)
    m=np.ones((N,N),bool)
    for i in range(5):
        x1,y1,x2,y2=px[i],py[i],px[(i+1)%5],py[(i+1)%5]
        m&=((x2-x1)*(Y-y1)-(y2-y1)*(X-x1))>=0
    return m
pat=poly_mask(c,c,7.5,-np.pi/2)
for i in range(5):
    a=-np.pi/2+np.pi/5+i*2*np.pi/5; pat|=poly_mask(c+19*np.cos(a),c+19*np.sin(a),7.5,a+np.pi)
v=np.where(pat,.11,light)+rim
v=np.clip(v,0,1)*inside
g=(v*255).round().astype(np.uint8)
Image.fromarray(np.dstack([g,g,g])).save("athletes-kick-clean/ball.webp",lossless=True)
Image.fromarray(g).resize((280,280),Image.NEAREST).save("source/athletes-ball/ball-round-preview.png")
ys,xs=np.nonzero(v>=.07); print("ball extent w,h",xs.max()-xs.min()+1,ys.max()-ys.min()+1)
