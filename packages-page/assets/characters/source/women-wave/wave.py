# Women (Meeting 4, 9 Nov 2026; meeting 5: the wave line REMOVED - only (2) and (3) remain): (1) the GLOWING WAVE the other three figures have (the rope, the ground line, the dumbbell's arc) -
# one soft wave of light under her, drawn in her own dots (the tone map: bright like the Children's rope, so it gets the same dots
# and glow); (2) her lower body carried fuller down to that wave - the empty and faint cells of the last band filled at the hips'
# density, ending cleanly on the wave instead of thinning into nothing; (3) the outline of her arms and hips carried down to the
# wave as the same fine bright edge she has above. Everything above y 860 is unchanged, pixel for pixel.
# In: source/women-wave/women-tone-before-wave.webp, women-before-wave.webp  Out: women-tone.webp, women.webp (the still)
import numpy as np
from PIL import Image
from scipy import ndimage as nd
D="source/women-wave/"
T=np.asarray(Image.open(D+"women-tone-before-wave.webp").convert("L")).astype(float)/255
RGBA=np.asarray(Image.open(D+"women-before-wave.webp")).astype(float)
A=RGBA[...,3]/255; H,W=T.shape
y=np.arange(H)[:,None].astype(float); x=np.arange(W)[None,:].astype(float)
ss=lambda a,b,v: np.clip((v-a)/(b-a),0,1)**2*(3-2*np.clip((v-a)/(b-a),0,1))
rng=np.random.default_rng(21)
# the wave: centre line y = Y0 + amp*sin(...), across nearly the full width, brightest in the middle, fading to both ends
Y0,AMP=968.,6.
wy=Y0-30*((x-W/2)/(W/2))**2+AMP*np.sin(2*np.pi*(x/W)*1.15+.6)   # a soft smile-shaped wave: its ends rise a little round her
d=np.abs(y-wy)
prof=ss(0,70,x)*ss(0,70,W-x)                                     # fades in from both ends
core=np.exp(-(d/5.)**2)                                         # ~10 px bright core (1.5 dots on the card)
halo=.45*np.exp(-(d/12.)**2)                                     # a soft light round it
wave=np.clip((core*.98+halo)*prof,0,1)
# her body in the last band: the outline at y 860 carried down (her two arms and her hips, as drawn there)
col=nd.gaussian_filter((T>=.07).astype(float),3)[845:875].mean(0)>.3; cx=np.nonzero(col)[0]; row=(np.arange(W)>=cx.min())&(np.arange(W)<=cx.max()); body=np.repeat(row[None,:],H,0)&(y>=860)   # her dots' coverage there
body&=(y<wy-17)                                                 # she ends just above the wave (a clear gap)
lvl=float(np.median(T[800:860][(A[800:860]>.1)&(T[800:860]>=.07)]))
band=ss(880,935,y)                                              # 0 above (unchanged) -> 1 near the wave
# the fill as round dots like hers (soft discs ~4 px), not pixel noise: dot centres scattered at the hips' spacing
cen=np.zeros((H,W)); k=rng.random((H,W))<.075; cen[k]=rng.uniform(.55*lvl,1.1*lvl,k.sum())
disk=np.hypot(*np.mgrid[-2:3,-2:3])<=1.6
fill=np.clip(nd.gaussian_filter(nd.grey_dilation(cen,footprint=disk),.5),0,1)*body
endfade=np.clip((wy-17-y)/14.,0,1)                              # the last ~14 px above the gap soften
lower=np.maximum(T*(1+.6*band),fill*band)*endfade*body
out=np.where(y<880,T,np.clip(lower,0,1))
# the edges: a fine bright line on each side of her arms and hips in the band, as above
edge=body&~nd.binary_erosion(body,np.ones((1,5)),border_value=1)
out=np.maximum(out,edge*(rng.random((H,W))<.7)*.8*band*endfade)
# meeting 5: NO wave line - the client did not want a line under her (her light now sweeps over her body, see CHR_ART women.sweep)
# out=np.maximum(out,wave)
out[:860]=T[:860]
g=(np.clip(out,0,1)*255).round().astype(np.uint8); Image.fromarray(np.dstack([g,g,g])).save("women-tone.webp",lossless=True)
# the still (reduced motion): the same wave and lower body in its alpha (its colour is already her dots' colour)
a2=np.where(y<860,A,np.clip(np.where(body,np.maximum(A,.55*band)*endfade,0),0,1))
o=RGBA.copy(); o[...,3]=a2*255
Image.fromarray(o.round().astype(np.uint8)).save("women.webp",lossless=True)
print("hips level",round(lvl,3));
for y0 in range(860,1000,20): m=body[y0:y0+20]; print(y0,"dots in body %.2f -> %.2f"%(((T[y0:y0+20]>=.07)&m).sum()/max(1,m.sum()),((out[y0:y0+20]>=.07)&m).sum()/max(1,m.sum())))
print("upper unchanged:",np.array_equal(g[:860],(T[:860]*255).round().astype(np.uint8)))
