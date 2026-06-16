// =============================================================================
//  TVÅLKOPP - STEN-variant: långsidesväggar + tjockt/rundat för stenarbete
// =============================================================================
//  * Parabolisk golvprofil längs tvålen  -> längscentrering, mitten torkar
//  * VÄGGAR på långsidorna                -> tvålen kan inte glida av i sidled
//  * Låga/öppna kortändar                 -> skjut ut tvålen, vatten rinner av
//  * Tjockt gods + stora radier överallt  -> tål att göras i sten (spröd!)
//
//  Stenregler som modellen följer:
//    - inga tunna väggar (>= ~12 mm), inga vassa innerhörn (allt fileat),
//      inga underskärningar, plan botten. Avlopp = ett borrat hål (diamantborr).
//
//  Bearbetning: täljsten/mjuk sten -> handverktyg (kniv, rasp, borr) eller
//  vinkelslip + diamant; hård sten -> CNC-fräs med diamant (vattenkyld).
//  En SVARV kan INTE göra denna avlånga form (bara runda, se README).
//
//  Öppna i OpenSCAD, F6, exportera STL. Mått i mm.
// =============================================================================

/* [Tvål] */
L = 90;  W = 60;  T = 25;

/* [Kopp / sten] */
clear   = 4;    // sidoglapp mot väggen (per sida)
wall_t  = 12;   // långsidesväggens tjocklek (tjock för sten)
floor0  = 12;   // golvtjocklek i mitten (tjock botten)
gap     = 10;   // luftspalt under tvålens mitt
endrun  = 8;    // hur långt golvet stiger bortom tvåländen (mjuk ändfångst)
wall_h  = 14;   // väggens höjd över tvålens viloläge
rfin    = 6;    // inre filé (golv/vägg-övergång)
rext    = 10;   // yttre rundning (pebble-känsla)
drain_d = 10;   // borrat avloppshål
spout_w = 12;   // avrinningsskåra i ena långväggen

/* [Visning] */
show_soap = true;
cut = false;
$fn = 48;

// --- härlett ----------------------------------------------------------------
half = L/2;
yhi  = W/2 + clear;            // inre halvbredd
BWh  = yhi + wall_t;           // yttre halvbredd
Xc   = half + endrun;          // halva inre längden (öppna ändar)
BLh  = Xc;                     // yttre halvlängd (kortändar i liv med rännan)
ax   = gap/(half*half);
rest = floor0 + gap;           // tvålens viloläge (underkant)
Ztop = rest + wall_h;          // väggtopp / blockhöjd
Zc   = Ztop + 8;               // kavitetens topp
Nx = 80; stepx = 2*Xc/Nx; dxs = 0.8;

function floorz(x) = floor0 + ax*x*x;

module rbox(l,w,h,r) intersection(){
    hull() for (sx=[-1,1],sy=[-1,1],sz=[-1,1])
        translate([sx*(l/2-r), sy*(w/2-r), sz*(h/2-r)]) sphere(r);
    translate([-l, -w, 0]) cube([2*l, 2*w, h]);     // plan botten vid z=0
}

// rundad "tråg"-tvärsektion (y-z) med botten vid golvet floorz(x)
module section2d(x) {
    cz = floorz(x);
    offset(r=rfin) offset(delta=-rfin)
        translate([-yhi, cz]) square([2*yhi, Zc-cz]);
}
module slice(x)
    translate([x,0,0])
        multmatrix([[0,0,1,0],[1,0,0,0],[0,1,0,0],[0,0,0,1]])
            linear_extrude(height=dxs) section2d(x);

module cavity() union() for (i=[0:Nx-1])
    let (x0=-Xc+i*stepx) hull(){ slice(x0); slice(x0+stepx); }

module dish() {
    difference() {
        translate([0,0,Ztop/2]) rbox(2*BLh, 2*BWh, Ztop, rext);
        cavity();
        // avlopp: borrat hål i mitten
        translate([0,0,-2]) cylinder(d=drain_d, h=floor0+4);
        // avrinningsskåra ut genom ena långväggen, vid golvnivå
        translate([0, BWh-wall_t/2, floor0]) cube([spout_w, wall_t+4, 6], center=true);
    }
}

// =============================================================================
module scene() {
    dish();
    if (show_soap)
        color([0.12,0.37,0.75,0.40])
            translate([-half, -W/2, rest]) cube([L, W, T]);
}
if (cut) intersection(){ scene(); translate([-300,-300,-60]) cube([300,600,300]); }  // tvärsnitt (x<0)
else scene();
