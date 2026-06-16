#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ritning av OVAL SKÅL-varianten (ellipsoid-skål, krökt även i djupled).
Genererar: tvalkopp_ovalskal_ritning.png
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle, Ellipse, Circle
from matplotlib.gridspec import GridSpec

# parametrar (= tvalkopp_ovalskal.scad)
L, W, T = 90.0, 60.0, 25.0
A, B, C, fmin, H, border, drain_d = 92.0, 46.0, 34.0, 8.0, 27.0, 5.0, 9.0
half = L/2
zc = fmin + C

def surf(x, y):
    v = 1 - (x/A)**2 - (y/B)**2
    return zc - C*np.sqrt(np.clip(v, 0, None))

rest = float(surf(half, W/2))                       # vilar på hörnen
rimx = A*np.sqrt(max(0, 1-((H-zc)/C)**2))
rimy = B*np.sqrt(max(0, 1-((H-zc)/C)**2))
BLx, BLy = rimx + border, rimy + border

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

fig = plt.figure(figsize=(16.5, 11.5))
gs = GridSpec(3, 2, height_ratios=[1.0, 0.9, 0.5], hspace=0.26, wspace=0.10,
              left=0.035, right=0.985, top=0.92, bottom=0.03)

# --- 3D render
ax0 = fig.add_subplot(gs[0,0]); ax0.axis("off")
ax0.set_title("3D – OVAL SKÅL (krökt även i djupled)", fontsize=12, fontweight="bold")
if os.path.exists("ovalskal_iso.png"): ax0.imshow(plt.imread("ovalskal_iso.png"))

# --- PLAN
ax = fig.add_subplot(gs[0,1]); ax.set_aspect("equal"); ax.axis("off")
ax.set_title("PLAN – oval form, tvålen vilar på 4 hörn", fontsize=12, fontweight="bold")
ax.add_patch(Ellipse((0,0),2*BLx,2*BLy,facecolor="#f0f0f0",edgecolor=DISH_E,lw=1.4))
ax.add_patch(Ellipse((0,0),2*rimx,2*rimy,facecolor="#eaeaea",edgecolor=DISH_E,lw=1.0,ls=(0,(4,3))))
ax.add_patch(Circle((0,0),drain_d/2,facecolor="#cfe0f0",edgecolor="#9bb8d6",lw=1))
ax.text(0,-7,"avlopp\n(lägsta punkt)",ha="center",va="top",color="#3a6ea5",fontsize=7.5)
ax.add_patch(Rectangle((-half,-W/2),L,W,fill=False,edgecolor=SOAP,lw=1.8,ls=(0,(6,4))))
ax.text(0,W/2-9,"TVÅL",ha="center",color=SOAP,fontsize=10,fontweight="bold")
for sx in (-half,half):
    for sy in (-W/2,W/2): ax.plot(sx,sy,"o",color=RED,ms=7,zorder=5)
ax.annotate("kontakt = 4 underkantshörn\n(minimal kontakt → torkar bäst)",
            xy=(half,W/2),xytext=(0,BLy+9),color=RED,fontsize=8.5,ha="center",
            arrowprops=dict(arrowstyle="->",color=RED,lw=1))
dim_h(ax,-half,half,-BLy-6,f"L={L:.0f}",color=SOAP)
dim_v(ax,-W/2,W/2,BLx+5,f"W={W:.0f}",color=SOAP)
dim_h(ax,-BLx,BLx,-BLy-13,f"oval {2*BLx:.0f} × {2*BLy:.0f}")
ax.set_xlim(-BLx-24,BLx+22); ax.set_ylim(-BLy-20,BLy+18)

# --- LÅNGSEKTION (genom mitten, y=0)
ax = fig.add_subplot(gs[1,:]); ax.set_aspect("equal"); ax.axis("off")
ax.set_title("LÅNGSEKTION (mitten) – djupkrökningen är det som ersätter väggen",
             fontsize=12, fontweight="bold")
xs = np.linspace(-BLx, BLx, 220)
top = [min(H, float(surf(x,0))) for x in xs]
mat = [(-BLx,0)] + list(zip(xs, top)) + [(BLx,0)]
ax.add_patch(Polygon(mat, closed=True, facecolor=DISH, edgecolor=DISH_E, lw=1.4))
# drän
ax.add_patch(Rectangle((-drain_d/2,0),drain_d,fmin,facecolor="#e3eef7",edgecolor="#9bb8d6",lw=0.8))
ax.annotate("avlopp",xy=(0,fmin/2),xytext=(14,-6),color=GRN,fontsize=8.5,
            arrowprops=dict(arrowstyle="->",color=GRN,lw=1))
# soap
ax.add_patch(Polygon([(-half,rest),(half,rest),(half,rest+T),(-half,rest+T)],
                     closed=True,fill=False,edgecolor=SOAP,lw=1.8,ls=(0,(6,4))))
ax.text(0,rest+T/2,"TVÅL",ha="center",va="center",color=SOAP,fontsize=10,fontweight="bold")
ax.plot([-half,half],[rest,rest],color=SOAP,lw=0.8,ls=":")
for sx in (-half,half): ax.plot(sx,rest,"o",color=RED,ms=6,zorder=6)
ax.annotate("vilar på hörnen\n(framför/bakom snittet)",xy=(half,rest),
            xytext=(half-26,rest+30),color=RED,fontsize=8,ha="center",
            arrowprops=dict(arrowstyle="->",color=RED,lw=1))
ax.annotate("",xy=(0,float(surf(0,0))),xytext=(0,rest),arrowprops=dict(arrowstyle="<->",color=GRN,lw=1.1))
ax.text(2,(float(surf(0,0))+rest)/2,f"luftspalt ~{rest-float(surf(0,0)):.0f}\n(mitten torkar)",
        color=GRN,fontsize=8,va="center")
ax.annotate("krökt i djupled → brantare utåt →\ncentrerar & håller vågrät (rak kon skulle tippa)",
            xy=(-half*0.7,float(surf(-half*0.7,0))),xytext=(-BLx+4,rest+T-3),
            color=NOTE,fontsize=8.5,ha="left",arrowprops=dict(arrowstyle="->",color=NOTE,lw=1))
ax.set_xlim(-BLx-22,BLx+22); ax.set_ylim(-12,rest+T+14)

# --- text
axt = fig.add_subplot(gs[2,:]); axt.axis("off"); axt.set_xlim(0,100); axt.set_ylim(0,10)
txt = (
    r"$\bf{Ja-vacker\ OCH\ funktionell\ på\ samma\ gång.}$  Nyckeln är att skålen är KRÖKT i djupled (en ellipsoid), inte raka konväggar. "
    "Krökningen gör ytan brantare ju längre ut man kommer åt alla håll → tvålen centreras och hålls vågrät helt utan väggar (en rak kon hade tippat den).\n"
    "  •  Tvålen vilar på sina 4 underkantshörn → minimal kontakt, torkar bäst.   •  Mitten är lägst → ett borrat avloppshål där (annars samlas vatten under tvålen).\n"
    "  •  Den ovala skålen självriktar även tvålens längdled (den långa formen lägger sig längs den långa axeln).\n"
    r"  $\bf{Tillverkning:}$ \"svarvad oval\" kräver oval-/rosettsvarv (avancerat hantverk). Vanlig svarv ger bara RUND skål - sätt A=B så blir det en rund "
    "skål som funkar lika bra fysiskt. Annars CNC-fräs, handhuggning (täljsten) eller gjutning."
)
axt.text(0.5,9.5,txt,ha="left",va="top",fontsize=9.2,color=NOTE,linespacing=1.45)

fig.suptitle("TVÅLKOPP – OVAL SKÅL: estetiskt vacker oval form som är funktionell tack vare djupkrökningen",
             fontsize=14, fontweight="bold", y=0.965)
fig.text(0.035,0.005,"Alla mått i mm (exempel L=90, W=60, T=25).  Tvål = streckad.  Ytan: ellipsoid (x/%g)²+(y/%g)²+((z-%g)/%g)²=1."
         %(A,B,zc,C),fontsize=8,color="#666")
fig.savefig("tvalkopp_ovalskal_ritning.png", dpi=130)
print("Sparade tvalkopp_ovalskal_ritning.png  (rest=%.1f, rim=%.0fx%.0f, oval=%.0fx%.0f)"
      %(rest,2*rimx,2*rimy,2*BLx,2*BLy))
