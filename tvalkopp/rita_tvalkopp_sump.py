#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sump + perch för sista tunna skivan. Genererar: tvalkopp_sump_ritning.png"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle, Circle, FancyBboxPatch
from matplotlib.gridspec import GridSpec

# parametrar (= tvalkopp_bat.scad)
L, W, T = 90.0, 60.0, 25.0
fmin, cdip, Sh, xsh_ex, deckex, Yb = 7.0, 8.0, 12.0, 10.0, 17.0, 44.0
half = L/2; xs = half; xsh = xs+xsh_ex; Xb = xsh+deckex; H = fmin+cdip+Sh+6
sump_r, sump_d, nub_r, peg_d, nub_above, drain_d = 17.0, 5.0, 10.0, 6.0, 5.0, 9.0
def zlen(x):
    a=abs(x)
    if a<=xs:  return fmin+cdip*(a/xs)**2
    if a<=xsh: return (fmin+cdip)+Sh*((a-xs)/(xsh-xs))
    if a<=Xb:  return (fmin+cdip+Sh)+(H-(fmin+cdip+Sh))*((a-xsh)/(Xb-xsh))
    return H
sumpz = fmin - sump_d          # 2
nubtop = fmin + nub_above      # 12
sliver_h = 5

DISH, DISH_E = "#d9d9d9", "#4d4d4d"
DIM, NOTE, GRN, RED, WATER, SOAP = "#555555", "#222222", "#0a8f3c", "#d62728", "#7fb3e0", "#c1611f"

fig = plt.figure(figsize=(15.5, 8.8))
gs = GridSpec(2, 2, height_ratios=[1.0, 0.34], width_ratios=[1.05,1.0],
              hspace=0.14, wspace=0.08, left=0.03, right=0.985, top=0.90, bottom=0.04)

ax0 = fig.add_subplot(gs[0,0]); ax0.axis("off")
ax0.set_title("3D – sump + knottror i botten", fontsize=12, fontweight="bold")
if os.path.exists("bat_sump_iso.png"): ax0.imshow(plt.imread("bat_sump_iso.png"))

# zoomad centersektion
ax = fig.add_subplot(gs[0,1]); ax.set_aspect("equal"); ax.axis("off")
ax.set_title("Centrum i snitt – hur slutskivan hålls torr", fontsize=12, fontweight="bold")
xr = np.linspace(-34,-sump_r,30); xl = np.linspace(sump_r,34,30)
top = ([(-34, zlen(-34))] + [(x,zlen(x)) for x in xr] +
       [(-sump_r,sumpz),(sump_r,sumpz)] + [(x,zlen(x)) for x in xl] + [(34,zlen(34))])
ax.add_patch(Polygon(top+[(34,-4),(-34,-4)], closed=True, facecolor=DISH, edgecolor=DISH_E, lw=1.4))
# vatten i sumpen
ax.add_patch(Rectangle((-sump_r, sumpz), 2*sump_r, 3.2, facecolor=WATER, edgecolor="none", zorder=1))
ax.text(-sump_r+1, sumpz+1.6, "vatten", color="#1f5f9e", fontsize=8, va="center")
# avlopp
ax.add_patch(Rectangle((-drain_d/2,-4), drain_d, sump_d+2, facecolor="white", edgecolor=DISH_E, lw=1, zorder=2))
ax.add_patch(Rectangle((-drain_d/2,-4), drain_d, sump_d+2, facecolor=WATER, alpha=0.5, edgecolor="none", zorder=2))
# knottror (2 i snittet)
for nx in (-nub_r, nub_r):
    ax.add_patch(FancyBboxPatch((nx-peg_d/2+1, sumpz+1), peg_d-2, nubtop-sumpz-1,
                 boxstyle="round,pad=1,rounding_size=2.5", facecolor=DISH, edgecolor=DISH_E, lw=1.3, zorder=3))
# slutskiva (vilar på knottrorna)
ax.add_patch(FancyBboxPatch((-22+2, nubtop+2), 44-4, sliver_h-2,
             boxstyle="round,pad=2,rounding_size=2", facecolor=SOAP, alpha=0.85, edgecolor=DISH_E, lw=1.2, zorder=4))
ax.text(0, nubtop+sliver_h/2+1, "sista tunna skivan – TORR", ha="center", va="center",
        color="white", fontsize=8.5, fontweight="bold", zorder=5)

ax.annotate("knottror (perch) lyfter\nskivan ovanför vattnet (+%g)"%nub_above,
            xy=(nub_r, nubtop-2), xytext=(20, nubtop+10), color=NOTE, fontsize=8.5,
            ha="left", arrowprops=dict(arrowstyle="->",color=NOTE,lw=1))
ax.annotate("sump (−%g) samlar vattnet"%sump_d, xy=(-sump_r+4, sumpz+1),
            xytext=(-46, sumpz-3), color="#1f5f9e", fontsize=8.5, ha="left",
            arrowprops=dict(arrowstyle="->",color="#1f5f9e",lw=1))
ax.annotate("avlopp", xy=(0,-3.5), xytext=(8,-9), color=GRN, fontsize=8.5,
            arrowprops=dict(arrowstyle="->",color=GRN,lw=1))
ax.text(0, H-2, "(färsk tvål ligger högt på axlarna,\nrör aldrig knottrorna)", ha="center",
        va="top", color="#888", fontsize=8, style="italic")
ax.set_xlim(-50, 42); ax.set_ylim(-11, H+2)

axt = fig.add_subplot(gs[1,:]); axt.axis("off"); axt.set_xlim(0,100); axt.set_ylim(0,10)
txt = (
    r"$\bf{Sump\ +\ perch\ för\ slutskivan.}$  Problemet: när tvålen blivit en liten tunn skiva (kortare än axelavståndet) lossnar längsfångsten "
    "och skivan faller till botten - just där vattnet samlas. Lösningen: en SUMP (försänkning) som samlar vattnet och leder det till avloppet, "
    "och 3 små rundade KNOTTROR (perch) som skivan vilar på en bit ovanför vattnet → den hålls torr och slipp-mosas.\n"
    r"  $\bf{Smart\ detalj:}$ den färska tvålen vilar högt på de branta axlarna (~15+ mm upp) och rör aldrig knottrorna - de spelar bara roll allra sist. "
    "3 knottror = stabilt (vaggar inte), grova/rundade = tål sten."
)
axt.text(0.5, 9.4, txt, ha="left", va="top", fontsize=9.3, color=NOTE, linespacing=1.5)

fig.suptitle("TVÅLKOPP – sump + perch så sista tunna skivan inte blir liggande i blöt",
             fontsize=14, fontweight="bold", y=0.975)
fig.savefig("tvalkopp_sump_ritning.png", dpi=130)
print("Sparade tvalkopp_sump_ritning.png")
