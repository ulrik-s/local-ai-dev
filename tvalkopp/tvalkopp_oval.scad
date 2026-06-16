// =============================================================================
//  TVÅLKOPP - OVAL/RUND variant ("avlångt cirkulär")
// =============================================================================
//  Samma önskvärda egenskaper som den rektangulära:
//    * tvålen vilar VÅGRÄT på kortsidornas nederkanter
//    * undersidan svävar fritt -> torkar, vatten rinner till avloppet
//    * självcentrerande på längden, tippar inte upp på högkant
//
//  Det runda yttre är bara estetik. Fysiken sitter i GOLVPROFILEN:
//    - flack (parabolisk) ränna i mitten  -> torkning + avrinning
//    - branta ändstigningar vid x = +/- L/2 -> "fångar" tvåländen, stoppar tipp
//  Plan-formen är en "stadion/oval" (hull av två ellipser).
//
//  Öppna i OpenSCAD, F6, exportera STL. Alla mått i mm.
// =============================================================================

/* [Tvål] */
L = 90;   // långsida
W = 60;   // kortsida
T = 25;   // tjocklek

/* [Kopp] */
endrun  = 16;  // längd på (kurvad) ändstigning
gap     = 10;  // luftspalt under tvålens mitt
stop    = 12;  // ändstigningens höjd över viloläget
base    = 4;   // godstjocklek i botten
yclear  = 4;   // sidoglapp per sida
ywall   = 5;   // sidoväggens tjocklek
wallend = 6;   // gods bortom ändstigningen
drain_d = 9;   // avloppshål
feet_h  = 3;   // fothöjd
rfil    = 5;   // rundningsradie (yttre kanter)

/* [Visning] */
show_soap = true;
cut = false;        // true = längssnitt (för att se golvprofilen)
$fn = 48;

// --- härlett ---------------------------------------------------------------
half  = L/2;
outL  = half + endrun;
srest = base + gap;          // tvålens viloläge (underkant)
Htop  = base + gap + stop;   // rimhöjd
yhi   = W/2 + yclear;        // inre halvbredd
yout  = yhi + ywall;         // yttre halvbredd
N     = 64;
tall  = Htop + 12;
dx    = 2*outL/N;

// golvprofil: FLACK v-ränna i mitten (gentle, ~12 grader) + BRANT stigning vid
// ändarna (~37 grader). Asymmetrin (flack inåt / brant utåt) är det som gör
// vågrätt läge stabilt och hindrar tvålen att tippa upp på högkant.
function floorz(x) =
    let(ax = abs(x))
    ax <= half ? base + (srest-base)*(ax/half)
               : srest + (Htop - srest)*((ax-half)/(outL-half));

module inner2d() hull(){
    translate([-half,0]) scale([endrun, yhi]) circle(1);
    translate([ half,0]) scale([endrun, yhi]) circle(1);
}
module outer2d() hull(){
    translate([-half,0]) scale([endrun+wallend, yout]) circle(1);
    translate([ half,0]) scale([endrun+wallend, yout]) circle(1);
}

// "allt ovanför golvet" (full bredd) via hull-loft av tunna skivor
module above_floor() union() for (i=[0:N-1]) {
    x0 = -outL + i*dx; x1 = x0 + dx;
    hull() {
        translate([x0,0,(floorz(x0)+tall)/2])
            cube([dx*1.06, 2*yout+12, tall-floorz(x0)], center=true);
        translate([x1,0,(floorz(x1)+tall)/2])
            cube([dx*1.06, 2*yout+12, tall-floorz(x1)], center=true);
    }
}
module cavity() intersection(){ above_floor(); linear_extrude(tall) inner2d(); }

// yttre kropp: rundad pebble med plan botten
module body() intersection(){
    minkowski(){ linear_extrude(Htop-rfil) offset(r=-rfil) outer2d(); sphere(rfil); }
    translate([-200,-200,0]) cube([400,400,Htop+rfil+5]);   // plan botten z=0
}

module dish() {
    difference() {
        body();
        cavity();
        translate([0,0,-2]) cylinder(d=drain_d, h=base+6);          // avlopp
    }
    // fötter (lyfter koppen så avloppet rinner fritt)
    for (sx=[-1,1], sy=[-1,1])
        translate([sx*half*0.7, sy*(yhi-2), -feet_h])
            cylinder(d=9, h=feet_h);
}

// =============================================================================
module scene() {
    dish();
    if (show_soap)
        color([0.12,0.37,0.75,0.40])
            translate([-half, -W/2, srest]) cube([L, W, T]);
}

if (cut)
    intersection() { scene(); translate([-300,-300,-60]) cube([600,300,260]); }
else
    scene();
