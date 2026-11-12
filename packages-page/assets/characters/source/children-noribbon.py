# Children (Nov 2026): the soft swirling ribbons around the girl removed (they were added by source/ribbons.py); only the girl and her
# rope remain. The ribbons' strokes are traced (in % of the artwork), widened, and: outside her body set to empty; where they cross her
# shirt, refilled with the shirt's own surrounding light (normalised blur of the image with the ribbon left out), so the shirt is whole.
import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
STROKES = [  # (points in % of the artwork, stroke width in % of its width) - read off the artwork, Nov 2026
  ([(60,17.8),(64,18),(68,17.8),(72.9,17.5),(73.6,21),(71.4,24),(67,26),(58.6,28),(50,29.5),(42.9,31),(38.6,32),(35,33)], 3.0),  # over the shoulder, across the chest
  ([(70,15),(72.5,16.5),(74.5,18.5)], 2.4),                                                  # its tail beside the neck
  ([(63,31),(57,33.5),(48.6,37),(42.9,40),(39.3,42.5),(34.3,46),(28.6,50),(27.9,53),(31.4,55.5),(37,57)], 3.0),  # down across the shirt, round her hip
  ([(31.4,31),(24.3,32.5),(20.7,34.5),(20,37.5),(22,38.5)], 2.6),                           # the crescent beside her left arm
  ([(66,61),(70.5,62.5),(73,64.5),(71.5,67.5),(67,70),(63,71)], 3.4),                       # beside her knee
]
def mask(W, H):
    m = Image.new("L", (W, H), 0); d = ImageDraw.Draw(m)
    for pts, wd in STROKES:
        P = [(x/100*W, y/100*H) for x, y in pts]; r = wd/100*W/2
        d.line(P, fill=255, width=int(2*r))
        for x, y in P: d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    return np.asarray(m) > 0
def clean(src, dst, rgba=False):
    # outside her body the ribbons lay over the background: cleared. Inside her body (her silhouette, bridged across the ribbons) the
    # gap is refilled with her own smooth light around it (the bright shirt seams left out, so they are not smeared across) plus the
    # shirt's real fine texture, taken from just below - so the shirt reads as one piece of fabric
    im = Image.open(src); A = np.asarray(im.convert("RGBA" if rgba else "L")).astype(np.float32)/255
    H, W = A.shape[:2]; M = nd.binary_dilation(mask(W, H), iterations=int(.008*W))
    yy, xx = np.mgrid[0:H, 0:W]; M &= ~((xx < .615*W) & (yy > .58*H) & (yy < .92*H))     # her legs are never touched
    tone = np.asarray(Image.open("source/children-with-ribbons/children-tone.webp").convert("L").resize((W, H))).astype(np.float32)/255
    rope = np.asarray(Image.open("children-groups.png").convert("L").resize((W, H), Image.NEAREST)) == 40
    fig = (nd.gaussian_filter(tone, 1.5) > .15) & ~M & ~nd.binary_dilation(rope, iterations=3)
    # every substantial piece of her (the ribbons cut her outline into pieces), bridged across the ribbon gaps
    lab, nl = nd.label(nd.binary_closing(fig, iterations=3)); szs = nd.sum(fig, lab, range(1, nl + 1))
    fig = np.isin(lab, 1 + np.nonzero(szs >= .02*szs.max())[0])
    sil = nd.binary_fill_holes(nd.binary_closing(fig, iterations=int(.035*W)))
    sil = nd.binary_erosion(sil, iterations=2)
    IN = M & sil
    # inside her body a ribbon is a glow laid OVER her shirt and arm (their folds show through it): it is not cut out but its extra light
    # is taken away - every pixel brighter than the shirt's own light around it is brought down to it (90% of the excess removed), so
    # the fabric and folds underneath stay and nothing is erased or patched. Outside her body the ribbon lay over the background: cleared
    MW = nd.binary_dilation(M, iterations=int(.012*W))
    def one(ch):
        keep = (sil & ~nd.binary_dilation(M, iterations=int(.025*W))).astype(np.float32); sg = .03*W
        lvl = nd.gaussian_filter(ch*keep, sg)/(nd.gaussian_filter(keep, sg) + 1e-4)
        lvl = lvl + .6*(nd.gaussian_filter(ch, 1.2) - nd.gaussian_filter(ch, 6)).clip(-1, 0)   # keep the dark gaps between folds
        tg = .85*lvl; dim = np.where(ch > tg, tg + (ch - tg)*.1, ch)
        hp = ch - nd.gaussian_filter(ch, 2); tex = np.zeros_like(ch); done = np.zeros(ch.shape, bool); cl = sil & ~MW
        for dy, dx in ((.05, 0), (-.05, 0), (.08, .02), (-.08, -.02), (.12, 0)):          # the fabric's own fine texture laid back
            shf = (int(dy*H), int(dx*W)); src = np.roll(hp, shf, (0, 1)); ok = np.roll(cl, shf, (0, 1)) & ~done; tex[ok] = src[ok]; done |= ok
        dim = np.clip(dim + .8*tex*(ch > tg), 0, 1)
        o = np.where(MW & sil, dim, np.where(M, 0, ch))
        sm = nd.gaussian_filter((MW & sil | M).astype(np.float32), 1.5); return ch*(1 - sm) + o*sm
    out = np.stack([one(A[..., c]) for c in range(4)], -1) if rgba else one(A)
    Lc = out[..., 3] if rgba else out
    lit = nd.binary_dilation(Lc > .06, iterations=2); lab, nl = nd.label(lit)
    if nl > 1:
        sz = nd.sum(lit, lab, range(1, nl + 1)); keepc = np.isin(lab, 1 + np.nonzero(sz >= .15*sz.max())[0])
        if rgba: out[..., 3] *= keepc
        else: out *= keepc
    Image.fromarray((np.clip(out, 0, 1)*255).astype(np.uint8), "RGBA" if rgba else "L").save(dst, quality=92, method=6)
if __name__ == "__main__":
    clean(sys.argv[1], sys.argv[2], len(sys.argv) > 3)
