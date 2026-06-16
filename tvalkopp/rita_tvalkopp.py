#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ritning av en självcentrerande tvålkopp.

Tvålen betraktas som ett rätblock:
    L = långsida, W = kortsida, T = tjocklek.

Tvålen ska vila VÅGRÄT på kortsidornas båda nederkanter, med undersidan
fritt svävande så att den kan torka. Koppen är utformad så att tvålen
hittar sitt jämviktsläge av sig själv när man "släpper" ner den.

Genererar: tvalkopp_ritning.png  (ortografiska vyer + 3D + förklaring)

Mått i millimeter. Ändra L, W, T nedan så skalar allt med.
"""

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle, Circle, FancyArrowPatch
from matplotlib.gridspec import GridSpec
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# ----------------------------------------------------------------------------
# PARAMETRAR (exempel - en typisk tvålbit). Skala fritt.
# ----------------------------------------------------------------------------
L = 90.0      # långsida (tvålens längd)
W = 60.0      # kortsida (tvålens bredd)
T = 25.0      # tjocklek (tvålens höjd)

# Härledda koppmått
half   = L / 2.0          # 45  - halva tvållängden, läget för upplaget
endrun = 13.0             # horisontell längd på den branta ändväggen
outL   = half + endrun    # 58  - halva yttre längden  -> total = 116
gap    = 10.0             # luftspalt: viloläget för tvålens underkant (datum z=0 i botten)
stop   = 12.0             # hur högt ändväggen reser sig OVANFÖR viloläget
rimz   = gap + stop       # 22  - rimhöjd
base   = 4.0              # godstjocklek i botten
yclear = 4.0             # sidoglapp
yhi    = W/2 + yclear     # 34  - inre halvbredd
ywall  = 4.0             # sidoväggens tjocklek
yout   = yhi + ywall      # 38  - yttre halvbredd  -> total bredd = 76

DISH = "#d9d9d9"          # gods
DISH_E = "#4d4d4d"
SOAP = "#1f5fbf"          # tvål (streckad)
RED  = "#d62728"          # kontakt
DIM  = "#555555"          # måttsättning
NOTE = "#222222"

# ----------------------------------------------------------------------------
# hjälpare
# ----------------------------------------------------------------------------
def dim_h(ax, x0, x1, y, text, off=2.5, fs=9, color=DIM):
    ax.annotate("", xy=(x1, y), xytext=(x0, y),
                arrowprops=dict(arrowstyle="<->", color=color, lw=1.1))
    for xx in (x0, x1):
        ax.plot([xx, xx], [y - 1.5, y + 1.5], color=color, lw=0.8)
    ax.text((x0 + x1) / 2, y + off, text, ha="center", va="bottom",
            color=color, fontsize=fs)

def dim_v(ax, y0, y1, x, text, off=2.5, fs=9, color=DIM):
    ax.annotate("", xy=(x, y1), xytext=(x, y0),
                arrowprops=dict(arrowstyle="<->", color=color, lw=1.1))
    for yy in (y0, y1):
        ax.plot([x - 1.5, x + 1.5], [yy, yy], color=color, lw=0.8)
    ax.text(x + off, (y0 + y1) / 2, text, ha="left", va="center",
            color=color, fontsize=fs, rotation=90)

def style2d(ax, title):
    ax.set_aspect("equal")
    ax.set_title(title, fontsize=12, fontweight="bold", pad=8)
    ax.axis("off")

# ----------------------------------------------------------------------------
fig = plt.figure(figsize=(16.5, 13.0))
gs = GridSpec(3, 2, height_ratios=[1.0, 1.0, 0.62], hspace=0.20, wspace=0.12,
              left=0.04, right=0.985, top=0.93, bottom=0.03)

# ============================================================================
# 1) LÅNGSEKTION (snitt längs tvålen) -- den viktigaste vyn
# ============================================================================
ax = fig.add_subplot(gs[0, 0])

# gods (material) som sluten polygon
mat = [(-outL, rimz), (-outL, -base), (outL, -base), (outL, rimz),
       (half, gap), (0, 0), (-half, gap)]
ax.add_patch(Polygon(mat, closed=True, facecolor=DISH, edgecolor=DISH_E, lw=1.4))

# inre yta markerad tydligare
inner = [(-outL, rimz), (-half, gap), (0, 0), (half, gap), (outL, rimz)]
ix, iz = zip(*inner)
ax.plot(ix, iz, color=DISH_E, lw=1.6)

# tvål (streckad)
soap = [(-half, gap), (half, gap), (half, gap + T), (-half, gap + T)]
ax.add_patch(Polygon(soap, closed=True, fill=False, edgecolor=SOAP, lw=1.8,
                     linestyle=(0, (6, 4))))
ax.text(0, gap + T / 2, "TVÅL\n(rätblock)", ha="center", va="center",
        color=SOAP, fontsize=10, fontweight="bold")

# kontaktpunkter (kortsidornas nederkanter)
for sx in (-half, half):
    ax.plot(sx, gap, "o", color=RED, ms=7, zorder=5)
ax.annotate("kortsidans nederkant\nvilar här (linjekontakt)",
            xy=(half, gap), xytext=(half - 24, gap + 30),
            color=RED, fontsize=8.5, ha="center",
            arrowprops=dict(arrowstyle="->", color=RED, lw=1))

# luftspalt
dim_v(ax, 0, gap, 0, f"luftspalt {gap:.0f}\n(torkar)", off=2.0, fs=8, color="#0a8f3c")
ax.annotate("undersidan svävar fritt → rinner av & torkar",
            xy=(0, gap / 2), xytext=(-half + 2, -base - 9),
            color="#0a8f3c", fontsize=8.5, ha="left",
            arrowprops=dict(arrowstyle="->", color="#0a8f3c", lw=1))

# ändvägg = stopp
ax.annotate("brant ÄNDVÄGG = stopp\n(hindrar att tvålen reser sig på högkant\noch centrerar på längden)",
            xy=(-half - (endrun * 0.5), gap + stop * 0.55),
            xytext=(-outL - 14, rimz + 30),
            color=NOTE, fontsize=8.5, ha="left",
            arrowprops=dict(arrowstyle="->", color=NOTE, lw=1))

# självcentrerande pil
ax.annotate("", xy=(-half + 8, gap + 2), xytext=(-18, gap - 5),
            arrowprops=dict(arrowstyle="->", color="#7a5cc0", lw=1.4,
                            connectionstyle="arc3,rad=0.35"))
ax.text(-30, gap - 9, "glider till\nvågrätt läge", color="#7a5cc0",
        fontsize=8, ha="center", va="top")

# mått
dim_h(ax, -half, half, rimz + 8, f"upplagsavstånd ≈ L = {L:.0f}")
dim_h(ax, -outL, outL, rimz + 17, f"total längd {2*outL:.0f}")
dim_v(ax, gap, rimz, outL + 5, f"stopp {stop:.0f}")

ax.set_xlim(-outL - 30, outL + 16)
ax.set_ylim(-base - 18, rimz + 38)
style2d(ax, "LÅNGSEKTION  (snitt längs tvålen)")

# ============================================================================
# 2) TVÄRSEKTION (snitt tvärs tvålen, vid upplaget)
# ============================================================================
ax = fig.add_subplot(gs[0, 1])

matc = [(-yout, rimz), (-yout, -base), (yout, -base), (yout, rimz),
        (yhi, gap), (W/2, gap), (6, gap), (0, gap - 4), (-6, gap),
        (-W/2, gap), (-yhi, gap)]
ax.add_patch(Polygon(matc, closed=True, facecolor=DISH, edgecolor=DISH_E, lw=1.4))
innerc = [(-yhi, gap), (-W/2, gap), (-6, gap), (0, gap - 4), (6, gap),
          (W/2, gap), (yhi, gap)]
cx, cz = zip(*[(-yout, rimz)] + innerc + [(yout, rimz)])
ax.plot(cx, cz, color=DISH_E, lw=1.6)

# tvål tvärsnitt
soapc = [(-W/2, gap), (W/2, gap), (W/2, gap + T), (-W/2, gap + T)]
ax.add_patch(Polygon(soapc, closed=True, fill=False, edgecolor=SOAP, lw=1.8,
                     linestyle=(0, (6, 4))))
ax.text(0, gap + T/2, "TVÅL", ha="center", va="center", color=SOAP,
        fontsize=10, fontweight="bold")

for sy in (-W/2, W/2):
    ax.plot(sy, gap, "o", color=RED, ms=6, zorder=5)

ax.annotate("svag tvärlutning + sidoräcken\n= centrerar i sidled, ingen rullning",
            xy=(-yhi + 1, gap + 3), xytext=(-yout - 12, rimz + 28),
            color=NOTE, fontsize=8.5, ha="left",
            arrowprops=dict(arrowstyle="->", color=NOTE, lw=1))
ax.annotate("avrinningsspår", xy=(0, gap - 4), xytext=(10, -base - 10),
            color="#0a8f3c", fontsize=8.5,
            arrowprops=dict(arrowstyle="->", color="#0a8f3c", lw=1))

dim_h(ax, -W/2, W/2, rimz + 8, f"kortsida W = {W:.0f}")
dim_h(ax, -yout, yout, rimz + 17, f"total bredd {2*yout:.0f}")
dim_v(ax, gap, gap + T, W/2 + 7, f"tjocklek T = {T:.0f}", color=SOAP)

ax.set_xlim(-yout - 26, yout + 18)
ax.set_ylim(-base - 18, rimz + 36)
style2d(ax, "TVÄRSEKTION  (snitt tvärs tvålen)")

# ============================================================================
# 3) VY UPPIFRÅN
# ============================================================================
ax = fig.add_subplot(gs[1, 0])

ax.add_patch(Rectangle((-outL, -yout), 2*outL, 2*yout, facecolor="#f0f0f0",
                       edgecolor=DISH_E, lw=1.4))
# ändväggar (band)
for x0 in (-outL, half):
    ax.add_patch(Rectangle((x0, -yout), endrun, 2*yout, facecolor=DISH,
                           edgecolor=DISH_E, lw=1.0, hatch="////"))
# sidoräcken
for y0 in (-yout, yhi):
    ax.add_patch(Rectangle((-half, y0), L, ywall, facecolor=DISH,
                           edgecolor=DISH_E, lw=1.0))
# ränna + avlopp
ax.add_patch(Rectangle((-half, -6), L, 12, facecolor="#e3eef7",
                       edgecolor="#9bb8d6", lw=0.8))
ax.add_patch(Circle((0, 0), 4.5, facecolor="#cfe0f0", edgecolor="#9bb8d6", lw=1))
ax.text(0, -10, "avloppshål", ha="center", va="top", color="#3a6ea5", fontsize=8)

# tvål streckad
ax.add_patch(Rectangle((-half, -W/2), L, W, fill=False, edgecolor=SOAP,
                       lw=1.8, linestyle=(0, (6, 4))))
ax.text(0, W/2 - 8, "TVÅL", ha="center", color=SOAP, fontsize=10, fontweight="bold")
# kontaktlinjer
for sx in (-half, half):
    ax.plot([sx, sx], [-W/2, W/2], color=RED, lw=3, solid_capstyle="butt", zorder=5)
ax.annotate("kontakt = kortsidans nederkant", xy=(half, 0),
            xytext=(half + 4, -yout - 6), color=RED, fontsize=8.5, ha="center",
            arrowprops=dict(arrowstyle="->", color=RED, lw=1))

dim_h(ax, -half, half, yout + 7, f"L = {L:.0f}", color=SOAP)
dim_h(ax, -outL, outL, yout + 16, f"{2*outL:.0f}")
dim_v(ax, -W/2, W/2, outL + 6, f"W = {W:.0f}", color=SOAP)
dim_v(ax, -yout, yout, outL + 15, f"{2*yout:.0f}")

ax.set_xlim(-outL - 26, outL + 26)
ax.set_ylim(-yout - 20, yout + 24)
style2d(ax, "VY UPPIFRÅN")

# ============================================================================
# 4) 3D ISOMETRISK VY
# ============================================================================
ax = fig.add_subplot(gs[1, 1], projection="3d")

def box(ax, x0, x1, y0, y1, z0, z1, color, alpha=1.0, ec="#4d4d4d", lw=0.6):
    p = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
         (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    faces = [[p[0], p[1], p[2], p[3]], [p[4], p[5], p[6], p[7]],
             [p[0], p[1], p[5], p[4]], [p[2], p[3], p[7], p[6]],
             [p[1], p[2], p[6], p[5]], [p[0], p[3], p[7], p[4]]]
    ax.add_collection3d(Poly3DCollection(faces, facecolor=color, alpha=alpha,
                                         edgecolor=ec, linewidths=lw))

def wedge_endwall(ax, sign, color):
    # brant inre yta lutande från fot (z=gap) upp till rim (z=rimz)
    xi = sign * half          # inre fot
    xo = sign * outL          # ytterkant
    p = [(xi, -yhi, gap), (xo, -yhi, rimz), (xo, -yhi, -base), (xi, -yhi, -base)]
    q = [(xi,  yhi, gap), (xo,  yhi, rimz), (xo,  yhi, -base), (xi,  yhi, -base)]
    faces = [p, q,
             [p[0], q[0], q[1], p[1]],   # inre lutande yta (topp)
             [p[3], q[3], q[2], p[2]],   # botten
             [p[1], q[1], q[2], p[2]],   # ytterkant
             [p[0], q[0], q[3], p[3]]]   # fot
    ax.add_collection3d(Poly3DCollection(faces, facecolor=color, alpha=1.0,
                                         edgecolor="#4d4d4d", linewidths=0.6))

# botten
box(ax, -outL, outL, -yout, yout, -base, 0, "#cfcfcf")
# ändväggar (kilar)
wedge_endwall(ax, -1, "#bdbdbd")
wedge_endwall(ax, +1, "#bdbdbd")
# sidoräcken
box(ax, -half, half, -yout, -yhi, 0, gap + 3, "#c7c7c7")
box(ax, -half, half,  yhi,  yout, 0, gap + 3, "#c7c7c7")
# tvål svävande
box(ax, -half, half, -W/2, W/2, gap, gap + T, "#7da9e6", alpha=0.55,
    ec=SOAP, lw=1.0)

ax.text(0, 0, gap + T + 6, "TVÅL", color=SOAP, fontsize=10, fontweight="bold",
        ha="center")
ax.text(half + 2, 0, rimz + 4, "stopp", color=NOTE, fontsize=8, ha="center")

ax.set_xlim(-outL, outL); ax.set_ylim(-yout, yout); ax.set_zlim(-base, rimz + T)
ax.set_box_aspect((2*outL, 2*yout, rimz + T + base))
ax.view_init(elev=24, azim=-58)
ax.set_axis_off()
ax.set_title("3D – ISOMETRISK", fontsize=12, fontweight="bold", pad=2)

# ============================================================================
# 5) FÖRKLARINGSRUTA
# ============================================================================
ax = fig.add_subplot(gs[2, :])
ax.axis("off")

# liten kon-skiss till vänster
ax.set_xlim(0, 100); ax.set_ylim(0, 30)
ax.add_patch(Polygon([(3, 2), (17, 26), (31, 2)], closed=True, fill=False,
                     edgecolor="#999", lw=1.3))
ax.plot([6, 26], [20, 9], color=SOAP, lw=2.4)   # tippad tvål
ax.annotate("", xy=(24, 7), xytext=(15, 14),
            arrowprops=dict(arrowstyle="->", color=RED, lw=1.4))
ax.text(17, 28.5, "REN KON = tvålen tippar", ha="center", fontsize=9,
        fontweight="bold", color=RED)

txt = (
    r"$\bf{Varför\ inte\ en\ ren\ kon?}$  I en kon/tratt sänker tvålen sin tyngdpunkt genom att TIPPA upp på ena änden"
    "\n(tyngdpunktshöjd ∝ √(L²−d²) → störst när den ligger vågrätt). Vågrätt blir alltså det INSTABILA läget – konen vill"
    "\nresa tvålen på högkant, inte hålla den platt.  Därför behövs en form som gör tvärtom:"
    "\n\n"
    r"$\bf{Lösningen\ (3\ saker):}$"
    "\n"
    "  1.  Två BRANTA ändväggar med avstånd ≈ L  →  stoppar tippning och centrerar på längden.\n"
    "  2.  Flack RÄNNA i mitten (lutning ≲ 12°, under friktionsvinkeln för blöt tvål)  →  undersidan svävar fritt,\n"
    "       torkar, och vattnet rinner till mitten/avloppet i stället för att samlas under tvålen.\n"
    "  3.  Svag TVÄRLUTNING + sidoräcken  →  centrerar i sidled och hindrar tvålen från att rulla.\n"
    "  →  Släpp tvålen ungefär rätt, så glider den ner till vågrätt jämviktsläge och vilar på kortsidornas nederkanter."
)
ax.text(36, 28, txt, ha="left", va="top", fontsize=9.3, color=NOTE,
        linespacing=1.35)

params = (
    f"Parametrar (mm, exempel):\n"
    f"  L (långsida) = {L:.0f}\n"
    f"  W (kortsida) = {W:.0f}\n"
    f"  T (tjocklek) = {T:.0f}\n"
    f"  upplagsavstånd = {L:.0f}\n"
    f"  luftspalt = {gap:.0f}\n"
    f"  stopphöjd = {stop:.0f}\n"
    f"  total = {2*outL:.0f}×{2*yout:.0f}×{rimz+base:.0f}"
)
ax.text(99.5, 28, params, ha="right", va="top", fontsize=8.6, color="#333",
        family="monospace",
        bbox=dict(boxstyle="round,pad=0.5", fc="#f4f4f4", ec="#bbb"))

fig.suptitle("TVÅLKOPP – självcentrerande, tvålen vilar vågrätt på kortsidornas nederkanter",
             fontsize=15, fontweight="bold", y=0.975)
fig.text(0.04, 0.005, "Alla mått i mm.  Ortografiska vyer (1:a vinkel).  "
         "Snittytor visar gods.  Tvål = streckad.", fontsize=8, color="#666")

out = "tvalkopp_ritning.png"
fig.savefig(out, dpi=130)
print("Sparade", out)
