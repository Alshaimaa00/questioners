# Men - THE FINAL APPROVED IMAGE (9 Nov 2026, men-final-approved.webp, 1122 x 1402) made into the particle curl.
# The approved image IS pose 1 (the top of the curl, never higher): his figure is taken unchanged - its own stipple dots become the
# particles (tone = the light above the blue backdrop, the backdrop removed). Only his forearm, hand and dumbbell move, turning about
# his elbow (pivot E) down to 46 deg below the approved position (the approved range: 46 deg of travel) and back, on a cosine ease, no
# hold. Near the elbow the turn fades in along the forearm (a skinned bend), so elbow, forearm, wrist, hand and dumbbell stay one
# continuous limb. Behind the forearm and dumbbell (hidden in the image) his torso continues with his OWN dot texture (copied from the
# abdomen just below / the chest just beside, not invented grain), and his front contour is carried down behind them.
# The canvas is extended 200 px below the image for the dumbbell's lowest position.
# Output: ../../men-final/ poses.webp, flow-next.png, flow-prev.png, still.webp ; frames.png, contact.png (previews)
import numpy as np, os
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd
O=os.environ.get("MEN_OUT","../../men-final"); os.makedirs(O,exist_ok=True)
I=np.asarray(Image.open("men-final-approved.webp").convert("RGB")).astype(np.float32)/255
H0,W=I.shape[:2]; EXT=200; H=H0+EXT
L=I@np.array([.3,.59,.11],np.float32)
# the backdrop's own light (a smooth blue gradient), measured away from the figure
# (fitted as a smooth quadratic surface to the empty margins only - so his own lighter body tone is kept, not subtracted)
gy_,gx_=np.mgrid[0:H0,0:W0 if False else W].astype(np.float32)
mk=(gx_<170)|(gx_>1010)|((gy_<330)&((gx_<400)|(gx_>960)))|((gy_>1180)&(gx_>860))
A_=np.stack([np.ones(mk.sum()),gx_[mk],gy_[mk],gx_[mk]**2,gy_[mk]**2,gx_[mk]*gy_[mk]],1)
cf=np.linalg.lstsq(A_,L[mk],rcond=None)[0]
bgL=(cf[0]+cf[1]*gx_+cf[2]*gy_+cf[3]*gx_**2+cf[4]*gy_**2+cf[5]*gx_*gy_).astype(np.float32)
# (meeting 6) where the smooth fit runs brighter than the real ground (his abdomen), the local ground (a low percentile) is used
loc_bg=nd.gaussian_filter(nd.percentile_filter(L,15,size=25),12)
bgL=np.minimum(bgL,loc_bg+.005)
T0=np.clip((L-bgL-.03)/.55,0,1)**.85
T0raw=T0.copy()                                                       # his stipple before any lift (the fill's texture source)
# (meeting 6) his stipple, measured from his chest (dots per area, their brightness) - scattered evenly at a chosen density
_cz=T0raw[560:700,560:760]; _pk=(_cz==nd.maximum_filter(_cz,size=5))&(_cz>.15); dens_d=_pk.sum()/_cz.size; vals=_cz[_pk]
def STIP(dm,seed=17,shape=None):
    h,w=shape or (H0+200,W); r=np.random.default_rng(seed); n=int(dens_d*dm*h*w)
    sp=np.zeros((h,w),np.float32); sp[r.integers(0,h,n),r.integers(0,w,n)]=r.choice(vals,n)
    return np.clip(nd.gaussian_filter(sp,.7)*2*np.pi*.49,0,1)
# his fine stipple averages out to almost nothing at card size (the face, chest and abdomen read as empty): the tone is lifted by
# its local density inside his silhouette (his own dots, brighter where they are dense) - the bright edges stay the brightest
# his silhouette: his glowing outline and dots, closed; the image cuts him off at the bottom, so that edge is closed with a line
_e=nd.binary_closing(nd.gaussian_filter(T0,2.5)>.05,iterations=6)
_yb=int(np.nonzero(_e[:,360:770].sum(1)>80)[0].max()); _c=np.nonzero(_e[_yb])[0]; _e[_yb-2:_yb+1,_c.min():_c.max()+1]=True   # close his lowest row
sil0=nd.binary_fill_holes(_e); _l,_n=nd.label(sil0); sil0=_l==1+np.argmax(nd.sum(sil0,_l,range(1,_n+1)))
inner0=nd.gaussian_filter(nd.binary_erosion(sil0,iterations=7).astype(np.float32),2)       # inside his outline only: no halo outside
dens0=nd.gaussian_filter((T0>.12).astype(np.float32),2.2)                                     # how many of his dots are around
T0=np.maximum(T0,np.clip(.12+dens0*1.3,0,.62)*inner0*(T0>.04))
# (meeting 6) his torso and abdomen a little fuller: there the lift is a touch stronger and reaches a few more of his own faint dots
gy0,gx0=np.mgrid[0:H0,0:W].astype(np.float32)
trs=nd.gaussian_filter(((gx0>330)&(gx0<840)&(gy0>560)&(gy0<1400)).astype(np.float32),25)*inner0
T0=np.maximum(T0,np.clip(.2+dens0*1.6,0,.68)*trs*(T0>.025))                                   # his dots and glowing edges; the backdrop -> 0
# a light, even scatter of his dots over his torso and abdomen (below the chest, inside his outline, clear of the upper arm), so the
# middle of his body reads fuller; the same dots in every pose
_yy,_xx=np.mgrid[0:H0,0:W].astype(np.float32)
_left=np.interp(_yy[:,0],[760,950,1150,1400],[600,560,350,365])[:,None]
_tm=sil0&(_xx>_left)&(_yy>760); _tm=nd.gaussian_filter(nd.binary_erosion(_tm,iterations=6).astype(np.float32),5)*np.clip((_yy-760)/80,0,1)
TSC=STIP(1.3,seed=29)[:H0]*.85*_tm                                        # (applied after MOVE is known, off the forearm and dumbbell)
T=np.zeros((H,W),np.float32); T[:H0]=T0
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
def poly(pts,f=2):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(pts,fill=255); return np.asarray(m.filter(ImageFilter.GaussianBlur(f))).astype(np.float32)/255
def ell(cx,cy,rx,ry,f=2):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=255); return np.asarray(m.filter(ImageFilter.GaussianBlur(f))).astype(np.float32)/255
E=np.array([300.,1068.])                                              # the elbow pivot
# the moving part: forearm (from just past the elbow), hand, both dumbbell plates and handle
FORE=poly([(318,948),(430,940),(560,975),(700,992),(800,985),(905,975),(900,1060),(820,1110),(700,1125),(560,1135),(420,1150),(330,1150),(300,1110)],3)
DB=np.clip(ell(737,870,154,154,3)+ell(872,1043,150,150,3)+poly([(780,900),(880,960),(840,1010),(760,960)],3),0,1)
# (elbow fix) the lower upper arm and the elbow are part of the deforming arm layer, so there is no still/moving seam at the elbow
ARMU=poly([(222,870),(300,850),(420,858),(515,895),(560,955),(470,1000),(340,1165),(262,1160),(228,1110),(212,1000)],3)
MOVE=np.clip(FORE+DB+ARMU,0,1)   # (ARMU limited to the joint's outer half below, once its geometry is known)
DBO=np.clip(ell(737,870,136,136,2)+ell(872,1043,130,134,2),0,1)          # the plates' own size (the DB mask has a margin)
# (dumbbell edges) the two plates' OWN outlines, traced from the approved image (outer rim incl. its fine glow): only this travels
# with the hand - the chest dots and chest outline beside the plates stay where they are drawn
DBC=np.clip(poly([(623,867),(640,820),(690,790),(753,778),(812,786),(852,805),(878,845),(882,890),(868,935),(853,967),(815,995),(760,1012),(705,1005),(660,972),(632,925)],1.5)
           +poly([(840,927),(895,914),(948,936),(986,984),(1000,1040),(990,1098),(956,1146),(893,1166),(835,1160),(782,1140),(760,1100),(758,1053),(790,980)],1.5),0,1)
DBC=np.clip(nd.gaussian_filter(nd.binary_dilation(DBC>.5,iterations=9).astype(np.float32),1.),0,1)   # + the rim's own soft glow
# the skinned bend: 0 at the elbow -> 1 ~110 px along the forearm (the elbow cap stays still, the forearm bends out of it)
ax=np.array([np.cos(np.deg2rad(-5)),np.sin(np.deg2rad(-5))])
along=(xx-E[0])*ax[0]+(yy-E[1])*ax[1]
skin=np.clip((along-15)/110,0,1); skin=skin*skin*(3-2*skin)
# his torso behind the forearm and dumbbell: his own texture - the abdomen just below copied up, the chest just beside copied across
front=np.interp(yy[:,0],[690,760,840,920,1000,1080,1150,1402],[838,836,826,810,792,776,763,748])[:,None]   # his front contour (hidden part interpolated)
# (chest fix, 10 Nov 2026) the hidden front contour follows the chest's anatomy (as in the reference): the pec keeps its rounded
# bulge (x ~846 where the image shows it) down to its lower fold (y ~825), turns in under the pec, then runs down the ribs and
# abdomen to his visible waist line - instead of the straight slanted line that made the chest read as a box
front=np.interp(yy[:,0],[690,720,760,790,815,835,855,880,920,1000,1080,1150,1402],[846,847,845,841,835,828,822,816,808,793,778,763,748])[:,None]
# (chest round 2) under the pec the contour now eases in gently (no dent under the chest: that read as a caved-in torso)
T=np.maximum(T,np.pad(TSC,((0,EXT),(0,0)))*(1-np.clip(MOVE*1.5,0,1)))   # the torso scatter on his visible torso
SILP=np.pad(sil0,((0,EXT),(0,0)))
TORSO=(xx<front-2)&(yy>690)&(yy<1400)&nd.binary_erosion(SILP,iterations=3)
# his own stipple pattern (a patch of his abdomen, its light evened out) tiled across the hidden area, at the brightness of the torso
# around it (the visible torso's light carried in smoothly) - real dots of his, no boxes
til=STIP(3.0)
vis=(1-MOVE)*(T0p:=np.pad(T0,((0,EXT),(0,0))) ).astype(bool).astype(np.float32)*0+(1-MOVE)
torso_m=TORSO.astype(np.float32)
vt=(1-MOVE)*torso_m*(yy>660)                                           # his visible torso round the hidden area
lvl=float(np.mean(T[vt>.5]))
num=nd.gaussian_filter(T*vt,70); den=nd.gaussian_filter(vt,70)
Bt=np.where(den>.05,num/np.maximum(den,1e-3),lvl)*np.clip(den/.05,0,1)+lvl*(1-np.clip(den/.05,0,1))   # his torso's light, carried smoothly across
tlv=float(np.mean(T[(vt>.5)&(yy>1150)&(yy<1300)]))                     # his visible torso's light just below the arm
clv=float(np.mean(T[640:740,600:800]))                                   # his chest's light just above (the lower pecs)
lvy=np.interp(yy[:,0],[700,860,1100,1200],[clv*1.15,clv*1.05,max(tlv*1.6,clv*.8),max(tlv*1.5,clv*.75)])[:,None]   # (meeting 6) fuller   # chest light -> abdomen light, as in the image
den_=nd.gaussian_filter((1-MOVE)*torso_m*0+(1-MOVE)*np.pad(sil0,((0,EXT),(0,0))),60); num_=nd.gaussian_filter(T*(1-MOVE)*np.pad(sil0,((0,EXT),(0,0))),60)
loc=np.where(den_>.08,num_/np.maximum(den_,1e-3),0)                   # the light of his visible body nearby (the upper arm by the elbow)
lvy=np.maximum(lvy,loc*np.clip((den_-.08)/.1,0,1))
# his raw dots plus the same soft base light his visible body has (the lift on T0), toned from chest (above) to abdomen (below)
dF=nd.gaussian_filter((til>.12).astype(np.float32),2.2)
kz=np.clip(lvy/max(clv,1e-3),.55,1.)
fillT=np.maximum(T0p_:=np.pad(T0raw,((0,EXT),(0,0)))*0,STIP(2.2)*np.clip(kz,.6,1))
fillT=np.maximum(fillT,STIP(1.3,seed=29)*.85)*nd.gaussian_filter(torso_m,8)   # his dots at the chest's density, edges soft   # his dots, as dense as the chest (same scatter as the torso below)
rim=np.exp(-(np.abs(xx-front)/3.)**2)*(yy>690)*(yy<1190)
edge_ref=float(np.percentile(T0[(np.abs(xx[:H0]-np.interp(yy[:H0,0],[1160,1400],[758,748])[:,None])<4)&(yy[:H0]>1160)],85))
fillT=np.maximum(fillT,rim*.75*edge_ref*(np.random.default_rng(3).random((H,W))<.75))
# (meeting 6) the forearm reads solid, not see-through: the same density lift as his body, a little stronger inside the forearm
_fo=nd.gaussian_filter(nd.binary_erosion(FORE>.5,iterations=10).astype(np.float32),3)
_dfo=nd.gaussian_filter((T>.12).astype(np.float32),2.2)
T=np.maximum(T,np.clip(.2+_dfo*1.5,0,.66)*_fo*(T>.03))
# (chest fix, 10 Nov 2026) THE CHEST behind the forearm and dumbbell, and the dark side of the chest between biceps and dumbbell:
# the old fill was one flat even patch (a box with a straight front, no pec shape, no shading), and the side stayed a black hole.
# Now: his own chest dots (the visible pec's texture, its light evened out, tiled) shaded as a chest - the rounded pec down to its
# lower fold (a soft lit lower edge, a soft shadow under it), then the ribs and abdomen, a little darker toward the arm
# his dots, made the way his own are: round dots of his dot size and brightness (measured on his chest), scattered with the density
# his chest has, then the same density light his torso gets (the lift on T0) - so the hidden chest reads exactly like his visible one
def DOTS(dmap,seed):
    r=np.random.default_rng(seed); p=np.clip(dens_d*dmap,0,1); m=r.random((H,W))<p
    sp=np.zeros((H,W),np.float32); sp[m]=r.choice(vals,int(m.sum()))
    raw=np.clip(nd.gaussian_filter(sp,.72)*2*np.pi*.72**2,0,1)
    dn=nd.gaussian_filter((raw>.12).astype(np.float32),2.2)
    return np.maximum(raw,np.clip(.2+dn*1.6,0,.68)*(raw>.025))
_cal=[(dm,float(DOTS(np.full((H,W),dm,np.float32),1)[300:700,300:700].mean())) for dm in (.15,.3,.5,.8,1.2,1.8,2.6,3.6,5,7,10)]
def dens_for(level): return np.interp(level,[c for _,c in _cal],[d for d,_ in _cal])   # the dot density that gives a light level
_fx=np.array([505,560,620,680,740,790,822]); _fyy=np.array([772,796,824,842,848,840,824])  # the pec's lower fold (side view)
yfold=np.interp(xx[0],_fx,_fyy)[None,:]
_dd=yy-yfold
pecL=float(np.mean(T[640:740,660:800]))                                # his visible pec's light
abdL=float(np.mean(T[1180:1300,560:720]))                              # his visible abdomen's light (below the forearm)
Lrib=np.interp(yy[:,0],[820,900,1000,1150,1300],[pecL*.82,pecL*.74,(pecL*.7+abdL)/2*1.0,abdL*1.15,abdL])[:,None]
CL=np.where(_dd<0,pecL,Lrib)
CL=CL*(1+.45*np.exp(-((_dd+5)/5.)**2))                                 # the pec's lit lower edge
CL=CL*(1-.62*np.exp(-((_dd-15)/10.)**2))                                # the soft shadow under the fold
CL=CL*(.72+.28*np.clip((xx-505)/110,0,1))                              # a little darker toward the arm (not a hole)
# (definition round, 10 Nov 2026) MUSCLE DEFINITION behind the dumbbell, as in the reference and in his own visible abs (blocks at the
# front of his waist, grooves at y ~1205 / ~1290): the rectus abdominis continues up to the pec - its blocks lit on top, the soft
# grooves between them and along its outer edge fewer dots; the ribcage beside it in soft slanted bands (serratus). Only dot
# density changes - no drawn lines
_xb=front-xx
_rect=np.clip((_xb-8)/10,0,1)*np.clip((112-_xb)/12,0,1)*np.clip((yy-860)/30,0,1)*np.clip((1300-yy)/40,0,1)
_g=np.clip(sum(np.exp(-((yy-g)/14.)**2) for g in (948,1035,1120,1205))  ,0,1)
_top=sum(np.exp(-((yy-g-26)/22.)**2) for g in (862,948,1035,1120))
_lin=np.exp(-((_xb-116)/9.)**2)*np.clip((yy-870)/30,0,1)*np.clip((1300-yy)/40,0,1)
_ser=(.5+.5*np.cos(2*np.pi*((yy-.55*xx)/46.)))*np.clip((_xb-125)/20,0,1)*np.clip((250-_xb)/30,0,1)*np.clip((yy-870)/30,0,1)*np.clip((1080-yy)/50,0,1)
RELIEF=(1-.9*_g*_rect)*(1+.5*_top*_rect)*(1-.75*_lin)*(1-.5*_ser)
CL=CL*RELIEF*np.where(_dd>0,1.,1.)
CHEST=DOTS(dens_for(CL).astype(np.float32),23)
CHEST=np.maximum(CHEST,rim*.75*edge_ref*(np.random.default_rng(3).random((H,W))<.75))           # his front contour's own rim
# (chest round 2, 10 Nov 2026) WHY THE CHEST LOOKED SUNKEN: his pec is lit only at its edges (the bright front rim and the line
# along its top) while its middle stays dark - with rim light, a dark middle reads as a hollow. A full chest is lit from its middle:
# the pec now gets a soft convex light (brightest in its centre-front, easing to its edges), made of his own dots, and the torso
# under it a gentle rounded light too (brightest down its middle, not at its edges)
_ed=np.hypot((xx-718)/150.,(yy-712)/118.); MOUND=np.clip(1-_ed**2,0,1)**.8
_ab=np.exp(-((xx-(front-120))/95.)**2)*np.clip((yy-800)/60,0,1)*np.clip((1250-yy)/120,0,1)
CLV=pecL*(.6+.28*MOUND)*(MOUND>0)   # (definition round) a modest pec light, never above his own pec (the round-2 lift made a hot spot)
_ab=_ab*0                             # (definition round) no lift over the abdomen: it smoothed away his abs
VOL=DOTS(dens_for(CLV).astype(np.float32),31)
_vm=nd.gaussian_filter(((MOUND>.02)|(_ab>.05)).astype(np.float32),6)*(xx<front-3)*np.pad(sil0,((0,EXT),(0,0)))
VOLm=VOL*_vm
CHEST=np.maximum(CHEST,VOLm)
fillT=np.where(TORSO&(yy>740),CHEST*nd.gaussian_filter(torso_m,8),fillT)
# the side of the chest (between the biceps' front edge and the dumbbell) - visible in every pose: his chest dots fill only where it
# is dark (the biceps edge, pec dots and the dumbbell stay exactly as drawn)
SIDE=poly([(514,700),(560,668),(640,700),(720,748),(800,790),(840,800),(840,1010),(660,1010),(560,1000),(514,960)],10)
SIDE=SIDE*(1-np.clip(nd.gaussian_filter(np.clip(DBC*1.4+FORE,0,1),3)*1.6,0,1))*(xx<front-4)
_dark=np.clip((.30-nd.gaussian_filter(T,6))/.15,0,1)
T=np.maximum(T,CHEST*SIDE*_dark)
# the pec's convex light on his visible chest (every pose): only where his chest is darker than it should be; never on the dumbbell,
# forearm, biceps or neck
_vis=(1-np.clip(nd.gaussian_filter(np.clip(DBC*1.4+FORE,0,1),3)*1.6,0,1))*(xx>560)
_dk2=np.clip((nd.gaussian_filter(CLV,4)-nd.gaussian_filter(T,5))/.12,0,1)
T=np.maximum(T,VOLm*_vis*_dk2)
# (definition round) the pec separated from the shoulder by a soft groove (as in the reference): his dots a little dimmer along it
_gx=np.interp(yy[:,0],[580,640,700,760,800],[598,586,574,560,548])[:,None]
_grv=np.exp(-((xx-_gx)/11.)**2)*np.clip((yy-585)/30,0,1)*np.clip((800-yy)/40,0,1)
T=T*(1-.38*_grv)
S=T*(1-MOVE)+fillT*MOVE                                               # the still layer (his figure with the moving part removed)

_pk=poly([(478,770),(530,760),(575,790),(590,880),(575,960),(520,975),(470,955),(480,880)],10)*(T<.12)
POCK=np.clip(STIP(2.2,seed=41)*.9*_pk+np.clip(.18+nd.gaussian_filter((STIP(2.2,seed=41)>.12).astype(np.float32),2.2)*1.5,0,.6)*_pk*(STIP(2.2,seed=41)>.03),0,1)
# THE ELBOW JOINT (elbow fix): w(p) = how much of the forearm's turn each point takes. Around the pivot it blends by ANGLE - from the
# upper arm's axis (0) to the forearm's axis (1), on both sides: the outer side (the elbow's back and point) compresses smoothly
# and the inner crease opens smoothly - so the arm's outline stays one continuous curve at every angle. Beyond ~220 px the angular
# blend fades out (the upper arm above stays still); along the forearm w reaches 1 (forearm, wrist, hand, dumbbell turn rigidly)
_dx,_dy=xx-E[0],yy-E[1]; _r=np.hypot(_dx,_dy); _th=np.degrees(np.arctan2(_dy,_dx))
THF=-5.; THU=float(np.degrees(np.arctan2(700-E[1],330-E[0])))       # forearm and upper-arm axes from the pivot
_ss=lambda t: (lambda c: c*c*(3-2*c))(np.clip(t,0,1))
# two-bone blend across the elbow's bisector: u = signed distance from the bisector line (toward the forearm); w rises 0 -> 1 over
# +-B px. The upper arm's back, the elbow point and the forearm's underside bend as one continuous outline
_uu=np.array([np.cos(np.deg2rad(THU)),np.sin(np.deg2rad(THU))]); _uf=np.array([np.cos(np.deg2rad(THF)),np.sin(np.deg2rad(THF))])
_n=(_uf-_uu)/np.linalg.norm(_uf-_uu); _u=_dx*_n[0]+_dy*_n[1]
BJ=45.
WJ=_ss((_u+BJ)/(2*BJ)).astype(np.float32)
# only the OUTER half of the joint joins the bending layer (elbow point, back of the upper arm); the biceps (inner side) stays still,
# so the inner crease opens naturally between the still biceps and the turning forearm
_inn=(_th>THU)&(_th<THF)
OUTS=nd.gaussian_filter((~_inn).astype(np.float32),3)
MOVE=np.clip(FORE+DB+ARMU*OUTS,0,1)
def _wat(px,py): return nd.map_coordinates(WJ,[np.clip(py,0,H-1),np.clip(px,0,W-1)],order=1,mode='nearest')
# (elbow fix) his waist's outline just under the elbow: as the forearm comes down in front of it, this short stretch (y 1140-1330)
# recedes behind the arm (fades with the bend), so it no longer pokes out under the elbow as a fin or shows through mid-step
_wx=np.interp(yy[:,0],[1140,1160,1180,1200,1220,1240,1260,1280,1300,1320,1340],[348,366,378,388,392,394,392,389,383,375,370])[:,None]
WAISTE=np.exp(-((xx-_wx)/9.)**2)*np.clip((yy-1125)/15,0,1)*np.clip((1330-yy)/60,0,1)
N=10; PHI=[23-23*np.cos(2*np.pi*k/N) for k in range(N)]               # 0 (k=0, the approved image) .. 46 deg (k=5) .. back
def src(k):                                                           # where each pixel of pose k comes from (inverse of the joint bend)
    sx,sy=xx.copy(),yy.copy()
    for _ in range(10):
        th=-np.deg2rad(PHI[k])*_wat(sx,sy); C,Sn=np.cos(th),np.sin(th); dx,dy=xx-E[0],yy-E[1]
        sx=C*dx-Sn*dy+E[0]; sy=Sn*dx+C*dy+E[1]
    return sx,sy
def fwd(k,px,py):
    th=np.deg2rad(PHI[k])*_wat(px,py); C,Sn=np.cos(th),np.sin(th); dx,dy=px-E[0],py-E[1]; return C*dx-Sn*dy+E[0], Sn*dx+C*dy+E[1]
# FORWARD WARP of the arm layer (elbow fix): every source point (at 2x supersampling) is carried to where the joint sends it and
# written there (max) - a bend that folds over itself on the compressed side and stretches on the other is drawn correctly, with no
# backward-inverse failure. SRC[k]: for each destination pixel, the artwork point that landed there (used for the motion maps)
_SS=2
_ys,_xs=np.nonzero(nd.binary_dilation(MOVE>.02,iterations=4))
_oy,_ox=np.mgrid[0:_SS,0:_SS].reshape(2,-1)/_SS
_PY=(_ys[:,None]+_oy[None,:]).ravel().astype(np.float32); _PX=(_xs[:,None]+_ox[None,:]).ravel().astype(np.float32)
def _samp(a): return nd.map_coordinates(a,[_PY,_PX],order=1,mode='nearest')
MOVEC=np.clip(FORE+DBC+ARMU*OUTS,0,1)
_V={n:_samp(a) for n,a in (('mv',T*MOVEC),('wm',MOVEC),('db',DBC))}
def fsplat(k):
    qx,qy=fwd(k,_PX,_PY); ix=np.clip(np.round(qx).astype(int),0,W-1); iy=np.clip(np.round(qy).astype(int),0,H-1)
    out={}
    for n,v in _V.items():
        o=np.zeros((H,W),np.float32); np.maximum.at(o,(iy,ix),v); out[n]=o
    sxm=xx.copy(); sym=yy.copy(); keep=_V['wm']>.02
    sxm[iy[keep],ix[keep]]=_PX[keep]; sym[iy[keep],ix[keep]]=_PY[keep]
    return out,sxm,sym
# (elbow fix 2, 10 Nov 2026) THE OUTER ELBOW OUTLINE. Cause of the protrusion: the back of the elbow takes only part of the
# forearm's turn about E, so as the forearm lowers, the elbow's point (below-behind E) swings OUT past the upper arm's back line -
# a knob with a dark notch above it (the arm looked broken there). Now, in every pose, the arm's outer outline is the anatomical one:
# the upper arm's back line (still), a round elbow, and the forearm's underside (turned with the forearm); anything of the arm that
# lands outside it is removed, and the elbow's rim follows the outline. Measured from his rim in the approved image.
A_PTS=[(236,860),(241,920),(253,980),(264,1040),(276,1085),(282,1100)]
B_PTS=[(330,1146),(360,1150),(420,1151),(500,1145),(560,1136),(640,1129),(700,1125)]
def _rot(p,k):
    t=np.deg2rad(PHI[k]); dx,dy=p[0]-E[0],p[1]-E[1]; return (np.cos(t)*dx-np.sin(t)*dy+E[0], np.sin(t)*dx+np.cos(t)*dy+E[1])
def _dense(pts,step=3.):
    out=[]
    for (x0,y0),(x1,y1) in zip(pts[:-1],pts[1:]):
        n=max(1,int(np.hypot(x1-x0,y1-y0)/step)); out+= [(x0+(x1-x0)*i/n, y0+(y1-y0)*i/n) for i in range(n)]
    return np.array(out+[pts[-1]])
_rimA=float(np.percentile([T[int(y),int(x)-2:int(x)+6].max() for x,y in A_PTS],60))
_wxe=np.interp(yy[:,0],[900,1110,1135,1140,1160,1180,1200,1240,1300,1340,1500],[300,300,330,342,360,372,382,388,377,364,364])[:,None]-6
_ZONE=(np.hypot(xx-E[0],yy-E[1])<200)&(yy>930)&(xx<_wxe)               # the empty space behind/below his elbow only
_FLD=np.random.default_rng(5).random((H,W))
def elbow_outline(f,k):
    line=_dense([*A_PTS,*[_rot(p,k) for p in B_PTS]])
    xs=nd.gaussian_filter1d(line[:,0],9,mode='nearest'); ys=nd.gaussian_filter1d(line[:,1],9,mode='nearest')   # the round elbow
    nA=len(_dense(A_PTS[:4]))-1; xs[:nA]=line[:nA,0]; ys[:nA]=line[:nA,1]                           # (his upper arm's line kept)
    poly_=[*zip(xs,ys), _rot((700,980),k), _rot((420,990),k), (420,860)]
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon([(float(a),float(b)) for a,b in poly_],fill=255); IN=np.asarray(m)>0
    cut=_ZONE&~nd.binary_dilation(IN,iterations=2)
    f=np.where(cut,0,f)
    dist=nd.distance_transform_edt(IN)
    cy=np.interp(len(xs)*.42,np.arange(len(xs)),ys); cx=np.interp(len(xs)*.42,np.arange(len(xs)),xs)          # round the elbow's corner
    near=np.exp(-((np.hypot(xx-cx,yy-cy))/90.)**2)
    rimE=np.exp(-((dist-2.)/2.2)**2)*IN*near*_rimA*(_FLD<.8)
    return np.maximum(f,rimE)
DBCR=np.clip(nd.gaussian_filter(nd.binary_dilation(DBC>.5,iterations=9).astype(np.float32),1.5),0,1)   # the plates + their glow ring
SRC=[]
F=[];WM=[]
for k in range(N):
    o_,sx,sy=fsplat(k); SRC.append((sx,sy))
    mv,wm,wdb=o_['mv'],o_['wm'],o_['db']                              # the dumbbell (plates are solid: it always hides what is behind)
    occ=np.maximum(np.clip(nd.gaussian_filter(nd.binary_closing(mv>.05,iterations=3).astype(np.float32),1.2)*1.3,0,1)*np.clip(wm*1.1,0,1),np.clip(wdb*1.1,0,1))   # (meeting 6) the forearm hides only where it really is
    # the still layer for this pose: the forearm/dumbbell area as before; the joint's outer part (upper arm back, elbow) keeps its own
    # dots in place wherever this pose moves it less than ~2.5 px, and is cleared only where it really moves (no ghost, no seam)
    _dk=_r*np.deg2rad(PHI[k])*WJ; _m=np.clip((_dk-1.5)/2.,0,1)
    # (elbow fix 2) the arm layer hides what is under it only where it really moved: at the top edge of the bending part of the upper
    # arm (y ~850, where it does not move) it used to dim his own dots by half - the dark line across the back of the upper arm
    occ=occ*np.maximum(_m,np.clip(wdb*1.5,0,1))
    _MFD=np.clip(FORE+DBC,0,1); _a=np.clip(MOVEC-_MFD,0,1)
    # (chest fix) the plates' outer glow (a few px past their outline) leaves with the dumbbell too - it stayed on his chest as a thin
    # bright crescent once the dumbbell had moved down
    _MFD=np.clip(FORE+DBCR,0,1)
    Sk=T*(1-_MFD-_a*_m)+fillT*_MFD
    f=np.maximum(Sk*(1-occ),mv)
    f=np.maximum(f,T*(1-_MFD)*(1-_m)*(1-np.clip(occ,0,1)))   # (never through the moved forearm/dumbbell)                                 # where the joint did not move a point, its own dots at full strength
    # (meeting 6) as the forearm lowers, the dark pocket between his biceps and chest fills with his torso dots (in the top pose it stays
    # exactly as drawn): it otherwise reads as a hole in the arm
    f=np.maximum(f,POCK*.72*(PHI[k]/46.)*(1-occ))   # (elbow fix) toned to the chest's light
    f=f*(1-WAISTE*.9*(PHI[k]/46.)**.7*(1-np.clip(occ,0,1)))       # (the forearm itself, drawn over it, is untouched)
    if k>0: f=elbow_outline(f,k)                                      # (elbow fix 2) the anatomical outer elbow outline
    if k==0: f=T.copy()                                               # pose 1 is exactly the approved image (now with the chest fix)
    F.append(np.clip(f,0,1)); WM.append(wm)
# pack: tiles at half resolution (561 x 801), flow tiles one px per pose unit (3 tile px)
TW,THh=W//2,H//2; CH=THh//3; CW=TW//3; s=CH/H
def KNEE(a,k=.46,r=.5): return np.where(a<k,a,k+(a-k)*r)   # (light round) the top of his light compressed: no burnt-white patches
F=[KNEE(f) for f in F]
def res(a,h,w): return np.asarray(Image.fromarray(a.astype(np.float32),mode="F").resize((w,h),Image.LANCZOS))
COLS,ROWS=5,2
atlas=np.zeros((THh*ROWS,TW*COLS),np.uint8); FN=np.full((CH*ROWS,CW*COLS,3),128,np.uint8); FP=FN.copy()
MOV=nd.binary_dilation(np.maximum.reduce(WM)>.05,iterations=10)
MOV|=nd.binary_dilation(_pk>.05,iterations=6)                            # the elbow pocket changes per pose, so its dots are per pose
MOVs=res(MOV.astype(float),CH,CW)>.3
CORE=res(((np.hypot(xx-E[0],yy-E[1])<60)).astype(float),CH,CW)>.5; pass   # (meeting 6) no still core at the elbow
gy,gx=np.mgrid[0:CH,0:CW].astype(float); px0=gx/s; py0=gy/s
mx=0
for k in range(N):
    r,c=divmod(k,COLS)
    atlas[r*THh:(r+1)*THh,c*TW:(c+1)*TW]=(np.clip(res(F[k],THh,TW),0,1)*255).astype(np.uint8)
    wm=np.clip((res(WM[k],CH,CW)-.3)/.35,0,1)
    sx,sy=[res(a,CH,CW) for a in SRC[k]]                              # the artwork point under each flow pixel in pose k
    for arr,j in ((FN,(k+1)%N),(FP,(k-1)%N)):
        qx,qy=fwd(j,sx,sy); d=[(qx-px0)*s*wm,(qy-py0)*s*wm]; mx=max(mx,np.abs(d[0]).max(),np.abs(d[1]).max())
        for i in (0,1): arr[r*CH:(r+1)*CH,c*CW:(c+1)*CW,i]=np.clip(128+4*d[i],0,255).round().astype(np.uint8)
        arr[r*CH:(r+1)*CH,c*CW:(c+1)*CW,2]=np.where(MOVs,255,0).astype(np.uint8)
Image.fromarray(atlas).save(f"{O}/poses.webp",lossless=True)
Image.fromarray(FN).save(f"{O}/flow-next.png",optimize=True); Image.fromarray(FP).save(f"{O}/flow-prev.png",optimize=True)
a=np.clip(F[0]*1.15,0,1)
rgba=np.dstack([np.full_like(a,165/255),np.full_like(a,216/255),np.full_like(a,1.),a])
Image.fromarray((rgba*255).astype(np.uint8)).resize((W//2,H//2),Image.LANCZOS).save(f"{O}/still.webp",quality=92,method=6)
o=Image.new("L",(TW*5,THh*2))
for k in range(N): o.paste(Image.fromarray((F[k]*255).astype(np.uint8)).resize((TW,THh),Image.LANCZOS),((k%5)*TW,(k//5)*THh))
o.save(os.environ.get("MEN_FRAMES","frames.png"))
print("tile",TW,THh,"flow",CW,CH,"max step (units)",round(mx,1),"ar",TW/THh)
