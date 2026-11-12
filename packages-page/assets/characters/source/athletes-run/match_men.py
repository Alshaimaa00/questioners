# Match the Athletes runner's dot finish to the Men character (Nov 2026): each pose tile's brightness levels are remapped
# (quantile matching) so that, sampled at the card's dot size, its dots have the same distribution of light - hence the same dot
# sizes and glow - as Men's (men-tone.webp). Shapes, poses and motion are untouched. Usage: python3 match_men.py <poses.webp in> <out>
import sys, numpy as np
from PIL import Image
men = np.asarray(Image.open("men-tone.webp").convert("L").resize((69, 125), Image.LANCZOS)).astype(float)/255
ref = np.sort(men[men >= .07])
A = np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)/255; out = A.copy(); TW, TH = 312, 288
for k in range(30):
    c, r = k % 6, k//6; t = A[r*TH:(r+1)*TH, c*TW:(c+1)*TW]
    small = np.asarray(Image.fromarray((t*255).astype(np.uint8)).resize((123, 114), Image.LANCZOS)).astype(float)/255
    src = np.sort(small[small >= .07]); q = np.linspace(0, 1, 256)
    sq = np.quantile(src, q); rq = np.quantile(ref, q)
    m = t >= .07
    t2 = t.copy(); t2[m] = np.interp(t[m], sq, rq); t2[~m] = t[~m]*np.clip(t[~m]/.07, 0, 1)*.0
    out[r*TH:(r+1)*TH, c*TW:(c+1)*TW] = t2
Image.fromarray((np.clip(out, 0, 1)*255).astype(np.uint8)).save(sys.argv[2], quality=90, method=6)
