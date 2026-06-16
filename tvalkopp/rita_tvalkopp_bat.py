#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ritning av BÅT-profil-varianten. Genererar: tvalkopp_bat_ritning.png"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle, Ellipse, Circle
from matplotlib.gridspec import GridSpec

# parametrar (= tvalkopp_bat.scad)
L, W, T = 90.0, 60.0, 25.0
fmin, cdip, Sh, xsh_ex, deckex, Yb, border = 7.0, 8.0, 12.0, 10.0, 17.0, 44.0, 4.0
half = L/2
xs = half; xsh = xs + xsh_ex; Xb = xsh + deckex
H = fmin + cdip + Sh + 6
BLx, BLy = Xb + border, Yb + border

def zlen(x):
    a = abs(x)
    if a <= xs:  return fmin + cdip*(a/xs)**2
    if a <= xsh: return (fmin+cdip) + Sh*((a-xs)/(xsh-xs))
    if a <= Xb:  return (fmin+cdip+Sh) + (H-(fmin+cdip+Sh))*((a-xsh)/(Xb-xsh))
    return H
def yhalf(x): return max(2.0, Yb*np.sqrt(max(0,1-(x/Xb)**2)))
def surf(x,y): zl=zlen(x); Yh=yhalf(x); return zl+(H-zl)*(y/Yh)**2
rest = surf(half, W/2)

DISH, DISH_E = "#d9d9d9", "#4d4d4d"
SOAP, RED, DIM, NOTE, GRN = "#1f5fbf", "#d62728", "#555555", "#222222", "#0a8f3c"
def dim_h(ax,x0,x1,y,t,off=2.2,fs=8.5,c=DIM):
    ax.annotate("",xy=(x1,y),xytext=(x0,y),arrowprops=dict(arrowstyle="<->",color=c,lw=1.1))
    for xx in (x0,x1): ax.plot([xx,xx],[y-1.2,y+1.2],color=c,lw=0.8)
    ax.text((x0+x1)/2,y+off,t,ha="center",va="bottom",color=c,fontsize=fs)
def dim_v(ax,y0,y1,x,t,off=2.2,fs=8.5,c=DIM):
    ax.annotate("",xy=(x,y1),xytext=(x,y0),arrowprops=dict(arrowstyle="<->",color=c,lw=1.1))
    for yy in (y0,y1): ax.plot([x-1.2,x+1.2],[yy,yy],color=c,lw=0.8)
    ax.text(x+off,(y0+y1)/2,t,ha="left",va="center",color=c,fontsize=fs,rotation=90)

fig = plt.figure(figsize=(16.5, 11.5))
gs = GridSpec(3, 2, height_ratios=[1.0,0.9,0.46], hspace=0.26, wspace=0.10,
              left=0.035, right=0.985, top=0.92, bottom=0.03)

ax0 = fig.add_subplot(gs[0,0]); ax0.axis("off")
ax0.set_title("3D – BÅT-profil (djup mitt, branta ändar)", fontsize=12, fontweight="bold")
if os.path.exists("bat_iso.png"): ax0.imshow(plt.imread("bat_iso.png"))

# PLAN
ax = fig.add_subplot(gs[0,1]); ax.set_aspect("equal"); ax.axis("off")
ax.set_title("PLAN – oval, tvålen vilar på 4 hörn", fontsize=12, fontweight="bold")
ax.add_patch(Ellipse((0,0),2*BLx,2*BLy,facecolor="#f0f0f0",edgecolor=DISH_E,lw=1.4))
ax.add_patch(Ellipse((0,0),2*Xb,2*Yb,facecolor="#eaeaea",edgecolor=DISH_E,lw=1.0,ls=(0,(4,3))))
ax.add_patch(Circle((0,0),4.5,facecolor="#cfe0f0",edgecolor="#9bb8d6",lw=1))
ax.add_patch(Rectangle((-half,-W/2),L,W,fill=False,edgecolor=SOAP,lw=1.8,ls=(0,(6,4))))
ax.text(0,W/2-9,"TVÅL",ha="center",color=SOAP,fontsize=10,fontweight="bold")
for sx in (-half,half):
    for sy in (-W/2,W/2): ax.plot(sx,sy,"o",color=RED,ms=7,zorder=5)
dim_h(ax,-half,half,-BLy-6,f"L={L:.0f}",c=SOAP)
dim_v(ax,-W/2,W/2,BLx+5,f"W={W:.0f}",c=SOAP)
dim_h(ax,-BLx,BLx,-BLy-13,f"oval {2*BLx:.0f} × {2*BLy:.0f}")
ax.set_xlim(-BLx-22,BLx+20); ax.set_ylim(-BLy-20,BLy+16)

# LÅNGSEKTION (y=0) – boat profile
ax = fig.add_subplot(gs[1,:]); ax.set_aspect("equal"); ax.axis("off")
ax.set_title("LÅNGSEKTION – djup cockpit + BRANT axel vid tvåländen",
             fontsize=12, fontweight="bold")
xs_arr = np.linspace(-BLx, BLx, 240)
top = [zlen(x) if abs(x)<=Xb else H for x in xs_arr]
ax.add_patch(Polygon([(-BLx,0)]+list(zip(xs_arr,top))+[(BLx,0)],closed=True,
                     facecolor=DISH, edgecolor=DISH_E, lw=1.4))
ax.add_patch(Rectangle((-4.5,0),9,fmin,facecolor="#e3eef7",edgecolor="#9bb8d6",lw=0.8))
ax.annotate("avlopp",xy=(0,fmin/2),xytext=(14,-6),color=GRN,fontsize=8.5,
            arrowprops=dict(arrowstyle="->",color=GRN,lw=1))
ax.add_patch(Polygon([(-half,rest),(half,rest),(half,rest+T),(-half,rest+T)],
                     closed=True,fill=False,edgecolor=SOAP,lw=1.8,ls=(0,(6,4))))
ax.text(0,rest+T/2,"TVÅL",ha="center",va="center",color=SOAP,fontsize=10,fontweight="bold")
for sx in (-half,half): ax.plot(sx,rest,"o",color=RED,ms=6,zorder=6)
ax.annotate("",xy=(0,zlen(0)),xytext=(0,rest),arrowprops=dict(arrowstyle="<->",color=GRN,lw=1.1))
ax.text(2,(zlen(0)+rest)/2,f"luftspalt ~{rest-zlen(0):.0f}\n(djup → torkar)",color=GRN,fontsize=8,va="center")
ax.annotate("BRANT axel vid tvåländen\n→ fångar kortsidan, stark längscentrering",
            xy=((xs+xsh)/2, zlen((xs+xsh)/2)), xytext=(Xb*0.30, H+9),
            color=NOTE, fontsize=8.5, ha="left", arrowprops=dict(arrowstyle="->",color=NOTE,lw=1.1))
ax.annotate("djup, flack cockpit", xy=(-12,zlen(-12)), xytext=(-Xb*0.7,H+9),
            color=NOTE, fontsize=8.5, ha="left", arrowprops=dict(arrowstyle="->",color=NOTE,lw=1))
ax.annotate("mjukt däck ut till\noval kant", xy=((xsh+Xb)/2, zlen((xsh+Xb)/2)),
            xytext=(Xb*0.62,H+2), color=NOTE, fontsize=8, ha="left",
            arrowprops=dict(arrowstyle="->",color=NOTE,lw=1))
for sx in (xs,-xs): ax.plot([sx,sx],[0,rest+T],color="#bbb",lw=0.6,ls=":")
ax.set_xlim(-BLx-20,BLx+20); ax.set_ylim(-12,rest+T+14)

# text
axt = fig.add_subplot(gs[2,:]); axt.axis("off"); axt.set_xlim(0,100); axt.set_ylim(0,10)
txt = (
    r"$\bf{Båt\!-\!profil:}$ långaxeln dippar djupt och flackt i mitten (cockpit) och reser sig BRANT just vid tvålens ändar - sedan ett mjukt "
    "däck ut till den ovala kanten. De branta axlarna fångar kortsidorna och ger stark centrering på längden; den djupa cockpiten gör att "
    "undersidan svävar fritt och torkar (avlopp i lägsta punkten). Tvärsnittet är en flack parabel som når samma rimhöjd överallt → ren oval kant "
    "och mild sidocentrering. Tvålen vilar på sina 4 underkantshörn.\n"
    r"  $\bf{Skillnad\ mot\ ellipsoid\!-\!skålen:}$ där var långaxeln den mjukast krökta; här är den medvetet BRANTAST vid tvåländen - mer aggressiv fångst i längd-led."
)
axt.text(0.5,9.5,txt,ha="left",va="top",fontsize=9.2,color=NOTE,linespacing=1.45)

fig.suptitle("TVÅLKOPP – BÅT-profil: djup cockpit + branta ändar (aggressiv längsfångst), oval form",
             fontsize=14, fontweight="bold", y=0.965)
fig.text(0.035,0.005,"Alla mått i mm (exempel L=90, W=60, T=25).  Tvål = streckad.",fontsize=8,color="#666")
fig.savefig("tvalkopp_bat_ritning.png", dpi=130)
print("Sparade tvalkopp_bat_ritning.png  (rest=%.1f, oval=%.0fx%.0f, djup=%.0f)"%(rest,2*BLx,2*BLy,H-fmin))
