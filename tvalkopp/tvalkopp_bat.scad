// =============================================================================
//  TVÅLKOPP - BÅT-profil: djup mitt, BRANT uppför just vid tvåländarna
// =============================================================================
//  Din variant B: långaxel-profilen dippar djupt i mitten (cockpit) och reser
//  sig BRANT just vid tvålens ändar (axlar/"shoulders"), och planar sedan ut
//  i ett mjukt däck ut till den ovala kanten. Tvärsnittet är en flack parabel
//  (mjuk oval) som når samma rimhöjd överallt -> ren oval kant.
//
//    långaxel:  cockpit (djup, flack) -> BRANT axel vid x=+/-half -> mjukt däck
//    tväraxel:  flack parabel (mild sidocentrering)
//
//  Tvålens kortändar fångas av de branta axlarna (stark längscentrering),
//  mitten svävar djupt -> torkar. Lägsta punkt i mitten -> borrat avlopp.
//
//  Öppna i OpenSCAD, F6, exportera STL. Mått i mm.
// =============================================================================

/* [Tvål] */
L = 90;  W = 60;  T = 25;

/* [Båt-profil - långaxel] */
fmin   = 7;    // golvtjocklek/lägsta punkt i mitten
cdip   = 8;    // hur mycket cockpit-golvet stiger ut till tvåländen (luftspalt)
Sh     = 12;   // AXELNS höjd (det branta steget vid tvåländen) - "aggressiviteten"
xsh_ex = 10;   // axelns längd (brant över denna sträcka). Kort = brantare.
deckex = 17;   // däckets längd ut till kanten (mjuk)
Hrim   = 0;    // (beräknas)

/* [Tväraxel & block] */
Yb     = 44;   // skålens halvbredd vid mitten (oval)
border = 4;    // kant mellan rim och ytterkant
rf     = 5;    // yttre rundning (pebble)
drain_d= 9;
feet_h = 3;

/* [Visning] */
show_soap = true;
cut = 0;       // 0=hel, 1=längssnitt (y<0), 2=tvärsnitt (x<0)
$fn = 56;

// --- härlett ----------------------------------------------------------------
half = L/2;
xs   = half;               // cockpit-kant = tvåländen
xsh  = xs + xsh_ex;        // slut på brant axel
Xb   = xsh + deckex;       // skålens halva längd (rim)
H    = fmin + cdip + Sh + 6;   // rimhöjd (= cockpit + axel + lite däck)
Ztop = H + 8;

function zlen(x) =
    let (a = abs(x))
    a <= xs  ? fmin + cdip*(a/xs)*(a/xs) :
    a <= xsh ? (fmin+cdip) + Sh*((a-xs)/(xsh-xs)) :
    a <= Xb  ? (fmin+cdip+Sh) + (H-(fmin+cdip+Sh))*((a-xsh)/(Xb-xsh)) : H;

function yhalf(x) = max(2, Yb*sqrt(max(0, 1-(x/Xb)*(x/Xb))));
function surf(x,y) = let(zl=zlen(x), Yh=yhalf(x)) zl + (H-zl)*(y/Yh)*(y/Yh);
rest = surf(half, W/2);

// loft av tvärsnitt (y-z): parabel-skål med botten enl. zlen(x)
NX = 96; stepx = 2*Xb/NX; dxs = 0.8; MY = 26;
module section2d(x) {
    Yh = yhalf(x);
    pts = concat(
        [[-Yh, Ztop]],
        [ for (i=[0:MY]) let(y=-Yh+2*Yh*i/MY) [y, surf(x,y)] ],
        [[Yh, Ztop]]
    );
    polygon(pts);
}
module slice(x)
    translate([x,0,0]) multmatrix([[0,0,1,0],[1,0,0,0],[0,1,0,0],[0,0,0,1]])
        linear_extrude(height=dxs) section2d(x);
module cavity() union() for (i=[0:NX-1])
    let(x0=-Xb+i*stepx) hull(){ slice(x0); slice(x0+stepx); }

module oval_block() intersection(){
    minkowski(){ linear_extrude(H-2*rf) scale([Xb+border-rf, Yb+border-rf]) circle(1); sphere(rf); }
    translate([-400,-400,0]) cube([800,800,H+rf]);
}
module dish() {
    difference() {
        oval_block();
        cavity();
        translate([0,0,-2]) cylinder(d=drain_d, h=fmin+4);
    }
    for (a=[0:2]) rotate([0,0,120*a+90])
        translate([(Xb)*0.5,0,-feet_h]) cylinder(d=9, h=feet_h);
}

// =============================================================================
module scene() {
    dish();
    if (show_soap)
        color([0.12,0.37,0.75,0.40])
            translate([-half,-W/2, rest]) cube([L, W, T]);
}
if      (cut==1) intersection(){ scene(); translate([-400,-400,-60]) cube([800,400,300]); }
else if (cut==2) intersection(){ scene(); translate([-400,-400,-60]) cube([400,800,300]); }
else scene();
