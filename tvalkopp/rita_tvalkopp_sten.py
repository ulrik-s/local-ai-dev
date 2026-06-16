#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ritning av STEN-varianten: långsidesväggar + tjockt/rundat gods.
Genererar: tvalkopp_sten_ritning.png  (3D-render + måttsatt tvärsektion + sten-guide)
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle, FancyBboxPatch, Wedge
from matplotlib.gridspec import GridSpec

# parametrar (= tvalkopp_sten.scad)
L, W, T = 90.0, 60.0, 25.0
clear, wall_t, floor0, gap, wall_h, rfin, rext = 4.0, 12.0, 12.0, 10.0, 14.0, 6.0, 10.0
yhi  = W/2 + clear      # 34
BWh  = yhi + wall_t     # 46
rest = floor0 + gap     # 22
Ztop = rest + wall_h    # 36

DISH, DISH_E = "#d9d9d9", "#4d4d4d"
SOAP, RED, DIM, NOTE, GRN = "#1f5fbf", "#d62728", "#555555", "#222222", "#0a8f3c"

def dim_h(ax,x0,x1,y,text,off=2.2,fs=8.5,color=DIM):
    ax.annotate("",xy=(x1,y),xytext=(x0,y),arrowprops=dict(arrowstyle="<->",color=color,lw=1.1))
    for xx in (x0,x1): ax.plot([xx,xx],[y-1.2,y+1.2],color=color,lw=0.8)
    ax.text((x0+x1)/2,y+off,text,ha="center",va="bottom",color=color,fontsize=fs)
def dim_v(ax,y0,y1,x,text,off=2.2,fs=8.5,color=DIM):
    ax.annotate("",xy=(x,y1),xytext=(x,y0),arrowprops=dict(arrowstyle="<->",color=color,lw=1.1))
    for yy in (y0,y1): ax.plot([x-1.2,x+1.2],[yy,yy],color=color,lw=0.8)
    ax.text(x+off,(y0+y1)/2,text,ha="left",va="center",color=color,fontsize=fs,rotation=90)

fig = plt.figure(figsize=(16.5, 10.5))
gs = GridSpec(2, 2, height_ratios=[1.0, 0.62], hspace=0.16, wspace=0.10,
              left=0.035, right=0.985, top=0.91, bottom=0.03)

# --- 3D render
ax0 = fig.add_subplot(gs[0,0]); ax0.axis("off")
ax0.set_title("3D – STEN-variant (långsidesväggar, öppna ändar)", fontsize=12, fontweight="bold")
if os.path.exists("sten_iso.png"): ax0.imshow(plt.imread("sten_iso.png"))

# --- tvärsektion med mått
ax = fig.add_subplot(gs[0,1]); ax.set_aspect("equal"); ax.axis("off")
ax.set_title("TVÄRSEKTION (vid mitten) – mått för stenarbete", fontsize=12, fontweight="bold")
# gods (rundat ytterblock)
ax.add_patch(FancyBboxPatch((-BWh+rext,0+rext),2*(BWh-rext),Ztop-rext,
             boxstyle=f"round,pad={rext},rounding_size={rext}",
             facecolor=DISH, edgecolor=DISH_E, lw=1.4, mutation_aspect=1))
# inre kavitet (vit) - golv vid floor0, öppen topp, fileade bottenhörn
ax.add_patch(Rectangle((-yhi,floor0),2*yhi,Ztop-floor0+2,facecolor="white",edgecolor="none",zorder=2))
for sgn in (-1,1):
    ax.add_patch(Wedge((sgn*(yhi-rfin),floor0+rfin),rfin,180 if sgn<0 else 270,
                       270 if sgn<0 else 360,facecolor=DISH,edgecolor=DISH_E,lw=1,zorder=3))
ax.add_patch(Rectangle((-yhi,floor0),2*yhi,0.1,fill=False,edgecolor=DISH_E,lw=1.4,zorder=3))
for sgn in (-1,1):
    ax.plot([sgn*yhi,sgn*yhi],[floor0+rfin,Ztop],color=DISH_E,lw=1.4,zorder=3)
# soap
ax.add_patch(Rectangle((-W/2,rest),W,T,fill=False,edgecolor=SOAP,lw=1.8,ls=(0,(6,4)),zorder=4))
ax.text(0,rest+T/2,"TVÅL",ha="center",va="center",color=SOAP,fontsize=10,fontweight="bold")
ax.annotate("luftspalt – torkar", xy=(0,(floor0+rest)/2), xytext=(0,floor0-7),
            color=GRN, fontsize=8.5, ha="center", arrowprops=dict(arrowstyle="->",color=GRN,lw=1))
ax.annotate("", xy=(8,floor0), xytext=(8,rest), arrowprops=dict(arrowstyle="<->",color=GRN,lw=1.1))
ax.text(9,(floor0+rest)/2,f"{gap:.0f}",color=GRN,fontsize=8.5,va="center")
# väggannotering
ax.annotate("tjock VÄGG\n(långsida) =\nhindrar sidoglid",
            xy=(yhi+wall_t/2, Ztop-4), xytext=(BWh+6, Ztop-2),
            color=NOTE, fontsize=8.5, ha="left", arrowprops=dict(arrowstyle="->",color=NOTE,lw=1))
ax.text(0, floor0/2, "tjock botten", ha="center", va="center", color=NOTE, fontsize=8)
ax.annotate("filé r%g\n(inga vassa\ninnerhörn)"%rfin, xy=(-yhi+rfin,floor0+1),
            xytext=(-yhi-2, floor0-12), color=NOTE, fontsize=8, ha="center",
            arrowprops=dict(arrowstyle="->",color=NOTE,lw=1))
ax.text(0, Ztop+10, "stora ytterradier r%g (sten vill ha runt)"%rext, ha="center",
        color=NOTE, fontsize=8.5)
# mått
dim_h(ax,-W/2,W/2,Ztop+3,f"W={W:.0f}",color=SOAP)
dim_h(ax,yhi,BWh,Ztop+3,f"{wall_t:.0f}")
dim_h(ax,W/2,yhi,rest+4,f"glapp {clear:.0f}")
dim_h(ax,-BWh,BWh,Ztop+13,f"total bredd {2*BWh:.0f}")
dim_v(ax,0,floor0,BWh+4,f"botten {floor0:.0f}")
dim_v(ax,rest,Ztop,BWh+13,f"vägg {wall_h:.0f}")
ax.set_xlim(-BWh-26,BWh+30); ax.set_ylim(-16,Ztop+20)

# --- text: stenbearbetning
axt = fig.add_subplot(gs[1,:]); axt.axis("off"); axt.set_xlim(0,100); axt.set_ylim(0,10)
txt = (
    r"$\bf{Hur\ arbetar\ man\ i\ sten?}$"
    "\n"
    r"  $\bf{Svarv?}$ En svarv gör bara RUNDA (rotationssymmetriska) former – den här avlånga formen kan den INTE göra. "
    "Vill du svarva: gör en rund skål i stället (jag kan ge svarvprofilen).\n"
    r"  $\bf{För\ denna\ form:}$  • Handhugga i MJUK sten (täljsten/specksten) – kniv, rasp, borr, sandpapper. Enklast för en unik kopp.   "
    "• Vinkelslip + diamantskiva för grovform, diamant-roterstift (Dremel) för skålen, diamant-kärnborr för avloppshålet.   "
    "• CNC-stenfräs med diamantverktyg (vattenkyld) för exakt/hård sten.\n"
    r"  $\bf{Material:}$ täljsten är idealisk (Mohs ~2, vatt~ & värmetålig, nordisk tradition – och passande för just tvål). "
    "Alabaster/mjuk marmor går också. Enklast av allt: GJUT i betong/jesmonite i en 3D-printad form – stenkänsla utan att hugga.\n"
    r"  $\bf{Stenregler\ (modellen\ följer\ dem):}$ tjockt gods (botten/vägg ≳ 12 mm), inga vassa innerhörn (allt fileat), inga underskärningar, plan botten."
)
axt.text(0.5, 9.6, txt, ha="left", va="top", fontsize=9.2, color=NOTE, linespacing=1.45)

fig.suptitle("TVÅLKOPP – STEN-variant: långsidesväggar + tjockt, rundat gods för stenarbete",
             fontsize=14.5, fontweight="bold", y=0.965)
fig.text(0.035,0.005,"Alla mått i mm (exempel L=90, W=60, T=25).  Tvål = streckad.",fontsize=8,color="#666")
fig.savefig("tvalkopp_sten_ritning.png", dpi=130)
print("Sparade tvalkopp_sten_ritning.png")
