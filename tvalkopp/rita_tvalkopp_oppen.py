#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ritning av den ÖPPNA tvålkoppen - bara en kurvad yta, inga väggar.

Poäng: en RAK kon tippar tvålen (konstant lutning = ingen återställning),
men en KURVAD/parabolisk yta (brantare mot ändarna) centrerar och håller den
vågrät helt utan väggar.

Genererar: tvalkopp_oppen_ritning.png
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle
from matplotlib.gridspec import GridSpec

# parametrar (samma som tvalkopp_oppen.scad)
L, W, T = 90.0, 60.0, 25.0
gap, edgelift, xmargin, ymargin, base = 10.0, 3.0, 15.0, 13.0, 3.0
feet_h = 3.0
half = L/2
ax = gap/(half*half)
ay = edgelift/((W/2)**2)
Xr = half + xmargin
rest = base + ay*(W/2)**2 + ax*half**2     # tvålens viloläge (hörnkontakt)

DISH, DISH_E = "#d9d9d9", "#4d4d4d"
SOAP, RED, DIM, NOTE = "#1f5fbf", "#d62728", "#555555", "#222222"
GRN = "#0a8f3c"

def s_center(x):  return base + ax*x*x                       # yta vid y=0
def s_corner(x):  return base + ay*(W/2)**2 + ax*x*x         # yta vid y=±W/2

fig = plt.figure(figsize=(16.5, 11.5))
gs = GridSpec(3, 2, height_ratios=[1.0, 0.95, 0.42], hspace=0.28, wspace=0.12,
              left=0.04, right=0.985, top=0.92, bottom=0.03)

# ---------------------------------------------------------------- 3D render
ax0 = fig.add_subplot(gs[0, 0]); ax0.axis("off")
ax0.set_title("3D – ÖPPEN YTA, inga väggar (tvålen genomskinlig)",
              fontsize=12, fontweight="bold")
if os.path.exists("oppen_iso.png"):
    ax0.imshow(plt.imread("oppen_iso.png"))

# ---------------------------------------------------------------- kontrast
axc = fig.add_subplot(gs[0, 1]); axc.axis("off"); axc.set_aspect("equal")
axc.set_title("Varför KURVAD yta och inte rak kon?", fontsize=12, fontweight="bold")
axc.set_xlim(0, 100); axc.set_ylim(-4, 34)

# vänster: rak kon
axc.plot([4,24,44],[30,4,30], color="#999", lw=2)            # V
axc.plot([10,40],[19,9], color=SOAP, lw=4, solid_capstyle="round")  # tippad/glidande tvål
axc.annotate("", xy=(43,6), xytext=(33,11),
             arrowprops=dict(arrowstyle="->", color=RED, lw=2))
axc.text(24, 33, "RAK KON", ha="center", fontsize=10, fontweight="bold", color=RED)
axc.text(24, -3.5, "konstant lutning →\ningen återställning →\nglider & tippar",
         ha="center", va="top", fontsize=8.4, color=NOTE)

# höger: parabel
xp = np.linspace(56, 96, 60); zp = 0.055*(xp-76)**2 + 3
axc.plot(xp, zp, color="#999", lw=2)
axc.plot([64,88],[7.0,7.0], color=SOAP, lw=4, solid_capstyle="round")  # centrerad, vågrät
axc.annotate("", xy=(70,7), xytext=(76,7), arrowprops=dict(arrowstyle="->", color=GRN, lw=2))
axc.annotate("", xy=(82,7), xytext=(76,7), arrowprops=dict(arrowstyle="->", color=GRN, lw=2))
axc.text(76, 33, "KURVAD (parabel)", ha="center", fontsize=10, fontweight="bold", color=GRN)
axc.text(76, -3.5, "brantare utåt →\nrubbas den höjs tyngdpunkten →\ncentrerar, vågrät",
         ha="center", va="top", fontsize=8.4, color=NOTE)

# ---------------------------------------------------------------- långsektion
ax1 = fig.add_subplot(gs[1, :]); ax1.axis("off"); ax1.set_aspect("equal")
ax1.set_title("LÅNGSEKTION – öppen parabolisk \"båt\" (inga väggar)",
              fontsize=12, fontweight="bold")

xs = np.linspace(-Xr, Xr, 160)
mat = [(-Xr,-feet_h)] + [(x, s_center(x)) for x in xs] + [(Xr,-feet_h)]
ax1.add_patch(Polygon(mat, closed=True, facecolor=DISH, edgecolor=DISH_E, lw=1.4))
# yta vid tvålkanten (möter tvålen)
ax1.plot(xs, [s_corner(x) for x in xs], color=DISH_E, lw=1.2, ls=(0,(5,3)))
ax1.text(-Xr+4, s_corner(-Xr)+1, "yta vid tvålkanten (y=±W/2)", color=DISH_E, fontsize=8)
ax1.text(8, s_center(8)-4, "yta vid mitten (y=0) – lägst", color=DISH_E, fontsize=8, va="top")
# fötter + avlopp
for fx in (-Xr*0.5, Xr*0.5):
    ax1.add_patch(Rectangle((fx-4.5,-feet_h),9,feet_h,facecolor=DISH,edgecolor=DISH_E,lw=1))
ax1.add_patch(Rectangle((-4,-feet_h),8,base+feet_h,facecolor="#e3eef7",edgecolor="#9bb8d6",lw=0.8))
ax1.annotate("avlopp", xy=(0,0), xytext=(12,-feet_h-6), color=GRN, fontsize=8.5,
             arrowprops=dict(arrowstyle="->", color=GRN, lw=1))

# tvål
ax1.add_patch(Polygon([(-half,rest),(half,rest),(half,rest+T),(-half,rest+T)],
                      closed=True, fill=False, edgecolor=SOAP, lw=1.8, ls=(0,(6,4))))
ax1.text(0, rest+T/2, "TVÅL", ha="center", va="center", color=SOAP, fontsize=10, fontweight="bold")
for sx in (-half, half):
    ax1.plot(sx, rest, "o", color=RED, ms=7, zorder=6)
ax1.annotate("vilar på kortsidans nederkant/hörn",
             xy=(half, rest), xytext=(0, rest+30), color=RED, fontsize=8.5, ha="center",
             arrowprops=dict(arrowstyle="->", color=RED, lw=1))

# luftspalt
ax1.annotate("", xy=(-12, s_center(-12)), xytext=(-12, rest),
             arrowprops=dict(arrowstyle="<->", color=GRN, lw=1.1))
ax1.text(-15, (s_center(-12)+rest)/2, "luftspalt\n(torkar)", color=GRN, fontsize=8,
         ha="right", va="center")

# "inga väggar"
for sgn in (-1, 1):
    ax1.annotate("ytan slutar i jämnhöjd –\ninget sticker upp över tvålen",
                 xy=(sgn*Xr, s_center(sgn*Xr)),
                 xytext=(sgn*(Xr-2), rest+T-2),
                 color=NOTE, fontsize=8, ha=("right" if sgn>0 else "left"),
                 arrowprops=dict(arrowstyle="->", color=NOTE, lw=1))

ax1.set_xlim(-Xr-30, Xr+30); ax1.set_ylim(-feet_h-12, rest+T+12)

# ---------------------------------------------------------------- text
axt = fig.add_subplot(gs[2, :]); axt.axis("off"); axt.set_xlim(0,100); axt.set_ylim(0,10)
txt = (
    r"$\bf{Ja-väggarna\ behövs\ inte.}$  En enda öppen, kurvad yta räcker, om den är PARABOLISK (brantare mot ändarna) snarare än en rak kon. "
    "Kurvaturen ersätter väggen: rubbas tvålen åker en ände upp på en brantare del, tyngdpunkten höjs och den glider tillbaka till mitten - vågrätt.\n"
    "  •  Mitten ligger lägst → undersidan svävar fritt, torkar, vattnet rinner till avloppet.    •  Tvålen vilar på kortsidornas nederkanter/hörn.\n"
    r"  $\bf{Pris\ för\ minimalismen:}$ utan väggar finns ingen hård stopp - en hård stöt kan putta av tvålen, och ytan måste vara större än tvålen "
    "för att centreringen ska fungera. För vardagsbruk räcker det gott."
)
axt.text(0.5, 9.4, txt, ha="left", va="top", fontsize=9.3, color=NOTE, linespacing=1.4)

fig.suptitle("TVÅLKOPP – ÖPPEN variant: bara en kurvad yta, inga väggar",
             fontsize=15, fontweight="bold", y=0.965)
fig.text(0.04, 0.005, "Alla mått i mm (exempel L=90, W=60, T=25).  Snittytor visar gods.  Tvål = streckad.",
         fontsize=8, color="#666")

fig.savefig("tvalkopp_oppen_ritning.png", dpi=130)
print("Sparade tvalkopp_oppen_ritning.png")
