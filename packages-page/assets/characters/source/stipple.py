# One particle language for the four package characters, taken from the Enterprise artwork: separate luminous
# dots of varied size and brightness on darkness - dense where the figure is lit, sparse in its shadows, loose
# sparkles where it dissolves - and crisp light on its contours, with no smooth milky fill.
# Each figure is re-made FROM ITS OWN cut-out, at the same size and place (so its motion masks still fit):
#  - what the artwork already draws as fine dots and lines (its high-pass: eyes, hair strands, outlines, the
#    dotted texture of Men and Women) is kept as it is, crisp;
#  - where the artwork is a smooth glowing fill (Athletes, Children, the ribbons), the fill is replaced by dots
#    whose number, size and light follow its shading;
#  - a faint haze keeps the body's volume.
# Usage: python3 stipple.py <cutout.webp> <out.webp> [dot spacing, px at 1000 px tall] [density]
# As used: athletes 5 1.5, children 5 1.5, men 6, women 6
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC, OUT = sys.argv[1], sys.argv[2]; G = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0
DENS = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0             # more dots inside a filled figure
im = np.asarray(Image.open(SRC).convert("RGBA")).astype(np.float32)/255
H, W = im.shape[:2]
al = im[..., 3]; lum = im[..., :3] @ np.array([.3, .59, .11], np.float32)
lo, hi = np.percentile(lum[al > .1], [2, 98]); ln = np.clip((lum - lo)/(hi - lo + 1e-6), 0, 1)
L = al*(.5 + .5*ln)                                               # the artwork's light
hp = L - nd.gaussian_filter(L, 2.2)                               # its fine light: dots, strands, outlines
smooth = nd.gaussian_filter(L, 4)
dotted = np.clip((nd.gaussian_filter(np.abs(hp), 4)/(smooth + .03) - .18)/.3, 0, 1)   # 1 = already dotted
T = nd.gaussian_filter(L, 2.5); T = np.clip(T/np.percentile(T[T > .02], 96), 0, 1)    # its shading
det = np.clip(T + 1.1*(T - nd.gaussian_filter(T, 5)), 0, 1)
fillw = np.clip(1 - dotted, 0, 1)                                 # how much of a smooth fill there is to replace
SS = 3                                                            # dots drawn 3x larger, then reduced (round, soft)
acc = np.zeros((H*SS, W*SS), np.float32)
rng = np.random.default_rng(7)
def layer(g, keep, rad, lit):
    ys, xs = np.mgrid[0:H:g, 0:W:g].astype(np.float32)
    xs = xs + (np.arange(xs.shape[0])[:, None] % 2)*g*.5           # hexagonal rows: an even spread
    xs = (xs + rng.uniform(-.38, .38, xs.shape)*g).ravel(); ys = (ys + rng.uniform(-.38, .38, ys.shape)*g).ravel()
    ok = (xs >= 0) & (xs < W - 1) & (ys >= 0) & (ys < H - 1); xs, ys = xs[ok], ys[ok]
    xi, yi = xs.astype(int), ys.astype(int)
    sel = rng.random(len(xs)) < keep(xi, yi); xs, ys, xi, yi = xs[sel], ys[sel], xi[sel], yi[sel]
    r = rad(xi, yi)*rng.uniform(.8, 1.2, len(xs)); b = lit(xi, yi)*rng.uniform(.75, 1.15, len(xs))
    spark = rng.random(len(xs)) < .03; b[spark] *= 1.45; r[spark] *= 1.3   # a few brighter sparkles
    for x, y, rr, bb in zip(xs*SS, ys*SS, r*SS, b):
        R = int(rr*2.2) + 1; x0, y0 = int(x) - R, int(y) - R
        yy, xx = np.mgrid[y0:y0 + 2*R + 1, x0:x0 + 2*R + 1]
        v = bb*np.exp(-((xx - x)**2 + (yy - y)**2)/(rr*rr)*1.6)
        ya, yb, xa, xb = max(0, y0), min(H*SS, y0 + 2*R + 1), max(0, x0), min(W*SS, x0 + 2*R + 1)
        acc[ya:yb, xa:xb] = np.maximum(acc[ya:yb, xa:xb], v[ya - y0:yb - y0, xa - x0:xb - x0])
# dots in place of the smooth fill: their number, size and light follow the shading
layer(G, lambda x, y: (np.clip(det[y, x]*2.2*DENS, 0, 1)**.75)*(.25 + .75*fillw[y, x]),
      lambda x, y: G*(.13 + .2*det[y, x]**.7), lambda x, y: .45 + .8*det[y, x])
A = np.asarray(Image.fromarray(np.clip(acc, 0, 1.4)).resize((W, H), Image.BOX))
fine = np.clip(hp*2.8, 0, 1)*(.8 + .4*dotted)                      # the artwork's own fine light, kept crisp
A = np.maximum(A, fine)
A = np.clip(np.maximum(A, T*.07*(1 + fillw)), 0, 1)                # a faint haze: the body's volume
MINT = np.array([220, 253, 237], np.float32)
c = MINT*(.72 + .28*np.clip(A*1.2, 0, 1))[..., None]                 # brighter dots are whiter
Image.fromarray(np.dstack([c, A*255]).astype(np.uint8), "RGBA").save(OUT, quality=92, method=6, alpha_quality=100)
print(OUT, (W, H), "mean alpha", round(float(A.mean()), 4), "dotted share", round(float((dotted*(al > .1)).sum()/(al > .1).sum()), 2))
