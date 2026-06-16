// =============================================================================
//  TVÅLKOPP - OVAL SKÅL: oval form, krökt även i djupled (ellipsoid-skål)
// =============================================================================
//  Tanken (din): en svarvad/oval form som är krökt även i DJUPLED.
//  Det fungerar - och det är just djupkrökningen som är poängen:
//
//    En RAK kon har konstant lutning -> ingen återställning -> tvålen tippar.
//    En KRÖKT skål (ellipsoid) blir brantare utåt åt ALLA håll -> tvålen
//    centreras och hålls vågrät av sig själv, helt utan väggar.
//
//  Ytan är en ellipsoid:  (x/A)^2 + (y/B)^2 + ((z-zc)/C)^2 = 1  (nedre kalott).
//  Tvålen vilar på sina fyra underkantshörn, mitten svävar fritt -> torkar.
//  Lägsta punkten är mitten -> ett borrat avloppshål där (annars samlas vatten).
//
//  Tillverkning: "svarvad oval" kräver oval-/rosettsvarv (avancerat) ELLER
//  CNC/handhuggning/gjutning. En vanlig svarv ger bara rund (sätt A=B).
//
//  Öppna i OpenSCAD, F6, exportera STL. Mått i mm.
// =============================================================================

/* [Tvål] */
L = 90;  W = 60;  T = 25;

/* [Oval skål] */
A      = 92;   // ellipsoidens halvaxel i längdled (x)  - längre
B      = 46;   // ellipsoidens halvaxel i breddled (y)  - smalare => mer avlång
C      = 34;   // ellipsoidens halvaxel i djupled (z)   - djupare/aggressivare
fmin   = 8;    // godstjocklek under skålens lägsta punkt
border = 5;    // kant mellan skålens rim och blockets ytterkant
H      = 27;   // blockhöjd (rim) - djupare skål
rf     = 5;    // yttre rundning (pebble)
drain_d= 9;    // borrat avloppshål i lägsta punkten
feet_h = 3;

/* [Visning] */
show_soap = true;
cut = 0;       // 0=hel, 1=längssnitt (y<0), 2=tvärsnitt (x<0)
$fn = 72;

// --- härlett ----------------------------------------------------------------
half = L/2;
zc   = fmin + C;                       // ellipsoidens centrum (botten vid z=fmin)
function surf(x,y) = zc - C*sqrt(max(0, 1 - (x/A)*(x/A) - (y/B)*(y/B)));
rest = surf(half, W/2);                // tvålens viloläge (vilar på hörnen)
// blockets ytterkant strax utanför skålens rim vid z=H
rimx = A*sqrt(max(0,1-((H-zc)/C)^2));
BLx  = rimx + border;
BLy  = B*sqrt(max(0,1-((H-zc)/C)^2)) + border;

module oval_block() intersection(){
    minkowski(){ linear_extrude(H-2*rf) scale([BLx-rf, BLy-rf]) circle(1); sphere(rf); }
    translate([-400,-400,0]) cube([800,800,H+rf]);     // plan botten
}

module dish() {
    difference() {
        oval_block();
        translate([0,0,zc]) scale([A,B,C]) sphere(1);   // ellipsoid-urgröpning
        translate([0,0,-2]) cylinder(d=drain_d, h=fmin+4);
    }
    for (a=[0:2]) rotate([0,0,120*a+90])
        translate([BLx*0.52,0,-feet_h]) cylinder(d=9, h=feet_h);
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
