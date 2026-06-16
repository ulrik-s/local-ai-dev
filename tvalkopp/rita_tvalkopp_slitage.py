#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hur en tvål slits - och varför båt-/skålprofilen åldras väl.
Genererar: tvalkopp_slitage.png
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, FancyBboxPatch, Rectangle
from matplotlib.gridspec import GridSpec

# båt-profil (= tvalkopp_bat.scad)
L, W, T = 90.0, 60.0, 25.0
fmin, cdip, Sh, xsh_ex, deckex, Yb, border = 7.0, 8.0, 12.0, 10.0, 17.0, 44.0, 4.0
half = L/2; xs = half; xsh = xs+xsh_ex; Xb = xsh+deckex
H = fmin+cdip+Sh+6; BLx = Xb+border
def zlen(x):
    a=abs(x)
    if a<=xs:  return fmin+cdip*(a/xs)**2
    if a<=xsh: return (fmin+cdip)+Sh*((a-xs)/(xsh-xs))
    if a<=Xb:  return (fmin+cdip+Sh)+(H-(fmin+cdip+Sh))*((a-xsh)/(Xb-xsh))
    return H
def yhalf(x): return max(2.0,Yb*np.sqrt(max(0,1-(x/Xb)**2)))
def surf(x,y): zl=zlen(x); Yh=yhalf(x); return zl+(H-zl)*(y/Yh)**2
rest = surf(half, W/2)

DISH, DISH_E = "#d9d9d9", "#4d4d4d"
DIM, NOTE, GRN, RED = "#555555", "#222222", "#0a8f3c", "#d62728"
# tre slitstadier: (halvL, tjocklek, hörnradie, färg, etikett)
stages = [
    (45, 25, 2,  "#1f5fbf", "Ny"),
    (44, 15, 6,  "#7a5cc0", "Halvsliten"),
    (39, 8,  4,  "#c1611f", "Välsliten"),
]

fig = plt.figure(figsize=(15.5, 8.6))
gs = GridSpec(2, 1, height_ratios=[1.0, 0.34], hspace=0.12, left=0.04, right=0.98,
              top=0.90, bottom=0.04)

ax = fig.add_subplot(gs[0]); ax.set_aspect("equal"); ax.axis("off")
ax.set_title("Hur en tvål slits i båt-/skålprofilen (långsektion)", fontsize=13, fontweight="bold")
xs_arr = np.linspace(-BLx, BLx, 240)
top = [zlen(x) if abs(x)<=Xb else H for x in xs_arr]
ax.add_patch(Polygon([(-BLx,0)]+list(zip(xs_arr,top))+[(BLx,0)],closed=True,
                     facecolor=DISH, edgecolor=DISH_E, lw=1.4))
ax.add_patch(Rectangle((-4.5,0),9,fmin,facecolor="#e3eef7",edgecolor="#9bb8d6",lw=0.8))

# tvålar - alla vilar med underkant på rest, toppen sjunker när tjockleken minskar
for hL, th, cr, col, lab in stages:
    ax.add_patch(FancyBboxPatch((-hL+cr, rest+cr), 2*(hL-cr), max(0.1, th-2*cr),
                 boxstyle=f"round,pad={cr},rounding_size={cr}",
                 fill=False, edgecolor=col, lw=2.0, mutation_aspect=1, zorder=4))
    ax.text(0, rest+th+2.5, lab, ha="center", color=col, fontsize=9, fontweight="bold")

# vilolinje
ax.plot([-half-6, half+6],[rest,rest], color=RED, lw=0.9, ls=":")
ax.text(half+8, rest, "underkant vilar här\n(oförändrat läge)", color=RED, fontsize=8.3, va="center")

# annoteringar
ax.annotate("L (och W) ≈ stabil större delen av livet\n→ fångas av de branta axlarna hela tiden",
            xy=(xs, zlen(xs)), xytext=(-BLx+2, H+13), color=NOTE, fontsize=9, ha="left",
            arrowprops=dict(arrowstyle="->", color=NOTE, lw=1.1))
ax.annotate("", xy=(0, rest+25), xytext=(0, rest+8),
            arrowprops=dict(arrowstyle="->", color=GRN, lw=1.6))
ax.text(2, rest+33, "tjockleken minskar mest →\ntyngdpunkten sjunker → MER stabil",
        color=GRN, fontsize=9, va="center")
ax.annotate("kanter/hörn rundas av →\nden krökta skålen vaggar in den (kula-i-skål)",
            xy=(-half+6, rest+3), xytext=(-BLx+2, -8), color=NOTE, fontsize=9, ha="left",
            arrowprops=dict(arrowstyle="->", color=NOTE, lw=1))
ax.set_xlim(-BLx-30, BLx+34); ax.set_ylim(-14, rest+T+22)

axt = fig.add_subplot(gs[1]); axt.axis("off"); axt.set_xlim(0,100); axt.set_ylim(0,10)
txt = (
    r"$\bf{Hur\ slits\ en\ tvål?}$  I typiskt bruk gnuggas de stora ytorna, så TJOCKLEKEN går först och kanter/hörn rundas av; "
    "LÄNGD och BREDD är jämförelsevis stabila större delen av livet (din iakttagelse stämmer).\n"
    r"  $\bf{Vad\ det\ betyder\ för\ designen:}$"
    "   • Tvålen lägeställs av sin längd (axlar ≈ L) → fungerar nästan hela livet.   "
    "• Tunnare tvål = lägre tyngdpunkt = ännu stabilare.   "
    "• Underkanten vilar på samma ställe oavsett tjocklek → längsfångsten påverkas inte.\n"
    "  • När hörnen rundas vaggar den KRÖKTA skålen in tvålen som en kula i en skål - krökta former åldras alltså snällare än skarpa spår/fack.\n"
    r"  $\bf{Undantag:}$ allra sista tunna skivan blir klurig för alla tvålfat; och ojämn användning kan göra tvålen kilformad (skålen tål det - den lägger sig snett men ligger kvar)."
)
axt.text(0.5, 9.4, txt, ha="left", va="top", fontsize=9.3, color=NOTE, linespacing=1.5)

fig.suptitle("TVÅLENS SLITAGE – varför längd-baserad fångst + krökt skål åldras väl",
             fontsize=14, fontweight="bold", y=0.975)
fig.savefig("tvalkopp_slitage.png", dpi=130)
print("Sparade tvalkopp_slitage.png")
