#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ritning av den OVALA/RUNDA tvålkoppen ("avlångt cirkulär").

Visar att de önskvärda egenskaperna bevaras trots rund form:
fysiken sitter i GOLVPROFILEN (flack v-ränna i mitten + branta ändstigningar),
inte i ytterkonturen - som därför får vara hur rund som helst.

Genererar: tvalkopp_oval_ritning.png
(kombinerar en vektor-långsektion + planvy med 3D-rendern oval_iso.png)
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle, FancyArrowPatch
from matplotlib.gridspec import GridSpec

# --- parametrar (samma som tvalkopp_oval.scad) ------------------------------
L, W, T = 90.0, 60.0, 25.0
endrun, gap, stop, base = 16.0, 10.0, 12.0, 4.0
yclear, ywall, wallend, feet_h = 4.0, 5.0, 6.0, 3.0
half  = L/2
outL  = half + endrun
srest = base + gap
Htop  = base + gap + stop
yhi   = W/2 + yclear
yout  = yhi + ywall
boxL  = outL + wallend          # yttre halvlängd
boxY  = yout                    # yttre halvbredd

DISH, DISH_E = "#d9d9d9", "#4d4d4d"
SOAP, RED, DIM, NOTE = "#1f5fbf", "#d62728", "#555555", "#222222"
GRN, PUR = "#0a8f3c", "#7a5cc0"

def floorz(x):
    ax = abs(x)
    return base + (srest-base)*(ax/half) if ax <= half \
        else srest + (Htop-srest)*((ax-half)/(outL-half))

def dim_h(ax, x0, x1, y, text, off=2.5, fs=9, color=DIM):
    ax.annotate("", xy=(x1,y), xytext=(x0,y),
                arrowprops=dict(arrowstyle="<->", color=color, lw=1.1))
    for xx in (x0,x1): ax.plot([xx,xx],[y-1.4,y+1.4], color=color, lw=0.8)
    ax.text((x0+x1)/2, y+off, text, ha="center", va="bottom", color=color, fontsize=fs)

def dim_v(ax, y0, y1, x, text, off=2.5, fs=9, color=DIM):
    ax.annotate("", xy=(x,y1), xytext=(x,y0),
                arrowprops=dict(arrowstyle="<->", color=color, lw=1.1))
    for yy in (y0,y1): ax.plot([x-1.4,x+1.4],[yy,yy], color=color, lw=0.8)
    ax.text(x+off, (y0+y1)/2, text, ha="left", va="center", color=color,
            fontsize=fs, rotation=90)

fig = plt.figure(figsize=(16.5, 12.0))
gs = GridSpec(3, 2, height_ratios=[1.05, 1.0, 0.5], hspace=0.22, wspace=0.10,
              left=0.035, right=0.985, top=0.92, bottom=0.03)

# ============================================================ 3D-render
ax = fig.add_subplot(gs[0, 0]); ax.axis("off")
ax.set_title("3D – OVAL FORM (tvålen genomskinlig)", fontsize=12, fontweight="bold")
if os.path.exists("oval_iso.png"):
    ax.imshow(plt.imread("oval_iso.png"))
else:
    ax.text(0.5,0.5,"(kör tvalkopp_oval.scad -> oval_iso.png)", ha="center")

# ============================================================ PLAN (vektor)
ax = fig.add_subplot(gs[0, 1])
ax.set_aspect("equal"); ax.axis("off")
ax.set_title("PLAN (vy uppifrån) – stadion/oval kontur", fontsize=12, fontweight="bold")

def stadium(ax, hx, ry, **kw):
    # stadion = rak mittdel [-half,half] + halvellipser i ändarna (rx=hx-half)
    rx = hx - half
    th = np.linspace(-np.pi/2, np.pi/2, 40)
    xr = half + rx*np.cos(th); yr = ry*np.sin(th)
    th2 = np.linspace(np.pi/2, 3*np.pi/2, 40)
    xl = -half + rx*np.cos(th2); yl = ry*np.sin(th2)
    xs = np.concatenate([xr, xl]); ys = np.concatenate([yr, yl])
    ax.add_patch(Polygon(np.column_stack([xs,ys]), closed=True, **kw))

stadium(ax, boxL, boxY, facecolor="#f0f0f0", edgecolor=DISH_E, lw=1.4)
stadium(ax, outL, yhi, facecolor="#eaeaea", edgecolor=DISH_E, lw=1.0)
# ränna + avlopp
ax.add_patch(Rectangle((-half,-6), L, 12, facecolor="#e3eef7", edgecolor="#9bb8d6", lw=0.8))
ax.add_patch(plt.Circle((0,0), 4.5, facecolor="#cfe0f0", edgecolor="#9bb8d6", lw=1))
# tvål
ax.add_patch(Rectangle((-half,-W/2), L, W, fill=False, edgecolor=SOAP, lw=1.8,
                       linestyle=(0,(6,4))))
ax.text(0, W/2-9, "TVÅL", ha="center", color=SOAP, fontsize=10, fontweight="bold")
for sx in (-half, half):
    ax.plot([sx,sx],[-W/2,W/2], color=RED, lw=3, solid_capstyle="butt", zorder=5)
ax.annotate("kontakt = kortsidans nederkant", xy=(half,0), xytext=(0,-yhi-12),
            color=RED, fontsize=8.5, ha="center",
            arrowprops=dict(arrowstyle="->", color=RED, lw=1))
dim_h(ax, -half, half, boxY+7, f"L = {L:.0f}", color=SOAP)
dim_h(ax, -boxL, boxL, boxY+15, f"total {2*boxL:.0f}")
dim_v(ax, -W/2, W/2, boxL+5, f"W = {W:.0f}", color=SOAP)
ax.set_xlim(-boxL-22, boxL+20); ax.set_ylim(-boxY-22, boxY+22)

# ============================================================ LÅNGSEKTION (vektor)
ax = fig.add_subplot(gs[1, :])
ax.set_aspect("equal"); ax.axis("off")
ax.set_title("LÅNGSEKTION – fysiken sitter här (golvprofilen)", fontsize=12, fontweight="bold")

xs = np.linspace(-outL, outL, 200)
inner = [(x, floorz(x)) for x in xs]
mat = [(-boxL,0),(-boxL,Htop),(-outL,Htop)] + inner + [(outL,Htop),(boxL,Htop),(boxL,0)]
ax.add_patch(Polygon(mat, closed=True, facecolor=DISH, edgecolor=DISH_E, lw=1.4))
ax.plot([p[0] for p in inner],[p[1] for p in inner], color=DISH_E, lw=1.6)
# fötter
for fx in (-half*0.7, half*0.7):
    ax.add_patch(Rectangle((fx-4.5,-feet_h), 9, feet_h, facecolor=DISH, edgecolor=DISH_E, lw=1))
# avlopp (streck i mitten)
ax.add_patch(Rectangle((-4.5,-feet_h), 9, base+feet_h, facecolor="#e3eef7", edgecolor="#9bb8d6", lw=0.8))
ax.annotate("avlopp", xy=(0,0), xytext=(12,-feet_h-7), color=GRN, fontsize=8.5,
            arrowprops=dict(arrowstyle="->", color=GRN, lw=1))

# tvål
ax.add_patch(Polygon([(-half,srest),(half,srest),(half,srest+T),(-half,srest+T)],
                     closed=True, fill=False, edgecolor=SOAP, lw=1.8, linestyle=(0,(6,4))))
ax.text(0, srest+T/2, "TVÅL", ha="center", va="center", color=SOAP, fontsize=10, fontweight="bold")
for sx in (-half, half):
    ax.plot(sx, srest, "o", color=RED, ms=7, zorder=6)

# luftspalt
dim_v(ax, base, srest, 0, "", color=GRN)
ax.annotate("luftspalt – undersidan svävar fritt & torkar",
            xy=(-18, (base+srest)/2), xytext=(-half+2, -feet_h-7),
            color=GRN, fontsize=8.5, ha="left",
            arrowprops=dict(arrowstyle="->", color=GRN, lw=1))

# vinkel-callouts (flack vänster, brant höger, kontakt mitten)
ax.annotate("flack v-ränna ~12°\n(torkar & centrerar,\nför flack för att tippa)",
            xy=(half*0.45, floorz(half*0.45)), xytext=(-boxL+2, Htop+8),
            color=NOTE, fontsize=8.5, ha="left",
            arrowprops=dict(arrowstyle="->", color=NOTE, lw=1))
ax.annotate("brant ändstigning ~37° = STOPP\n(fångar tvåländen, hindrar tipp,\ncentrerar på längden)",
            xy=(half+endrun*0.5, floorz(half+endrun*0.5)),
            xytext=(boxL+2, Htop+8),
            color=NOTE, fontsize=8.5, ha="right",
            arrowprops=dict(arrowstyle="->", color=NOTE, lw=1))
ax.annotate("vilar på kortsidans nederkant", xy=(half, srest),
            xytext=(0, srest+34), color=RED, fontsize=8.5, ha="center",
            arrowprops=dict(arrowstyle="->", color=RED, lw=1))

dim_h(ax, -half, half, Htop+22, f"upplagsavstånd ≈ L = {L:.0f}")
dim_h(ax, -boxL, boxL, Htop+31, f"total längd {2*boxL:.0f}")
dim_v(ax, srest, Htop, boxL+4, f"stopp {stop:.0f}")
ax.set_xlim(-boxL-32, boxL+18); ax.set_ylim(-feet_h-14, Htop+40)

# ============================================================ text
ax = fig.add_subplot(gs[2, :]); ax.axis("off")
ax.set_xlim(0,100); ax.set_ylim(0,10)
txt = (
    r"$\bf{Ja-rund\ form\ fungerar.}$  Den runda/ovala konturen är bara estetik och påverkar inte funktionen. "
    "Allt som krävs för de önskvärda egenskaperna sitter i den inre golvprofilen:\n"
    "  •  FLACK v-ränna i mitten (~12°, under friktionsvinkeln)  →  undersidan svävar fritt och torkar, vattnet rinner till avloppet, "
    "och lutningen lockar tvålen mot mitten.\n"
    "  •  BRANTA ändstigningar (~37°) på avstånd ≈ L  →  fångar kortsidornas nederkanter, hindrar tvålen att tippa upp på högkant och "
    "centrerar den på längden.\n"
    "  •  Den ovala skålen + tajt sidoglapp centrerar i sidled.   Skillnaden mot en ren kon: konen är symmetrisk och låter tvålen glida "
    "ner och tippa – här bryts det av de branta ändstigningarna."
)
ax.text(0.5, 9.3, txt, ha="left", va="top", fontsize=9.4, color=NOTE, linespacing=1.4)

fig.suptitle("TVÅLKOPP – OVAL/RUND variant: rund form, samma önskvärda egenskaper",
             fontsize=15, fontweight="bold", y=0.965)
fig.text(0.035, 0.005, "Alla mått i mm (exempel L=90, W=60, T=25).  Snittytor visar gods.  Tvål = streckad.",
         fontsize=8, color="#666")

fig.savefig("tvalkopp_oval_ritning.png", dpi=130)
print("Sparade tvalkopp_oval_ritning.png")
