# Women: the measured motion forced to exactly zero where the figure is locked (torso, waist, hips, head - identical in all 40
# poses by construction), fading in over the arm's and hair's zone. Without it, the flow's smoothing leaks the arm's motion into
# the still body and makes it shimmer.
import numpy as np
from scipy import ndimage as nd
from skimage.transform import resize
Z=dict(np.load("flows.npz")); M=np.load("motionmask.npy").astype(float); tor=np.load("torso.npy").astype(float); headf=np.load("headf.npy")
wgt=nd.gaussian_filter(M,8)*(1-nd.gaussian_filter(tor,4))*(1-headf)
k0=next(iter(Z)); hh,ww=Z[k0].shape[:2]; wl=resize(wgt,(hh,ww))
for k in Z: Z[k]=Z[k]*wl[...,None]
np.savez("flows.npz",**Z); print("masked",len(Z))
