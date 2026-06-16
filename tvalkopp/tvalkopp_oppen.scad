// =============================================================================
//  TVÅLKOPP - ÖPPEN variant: BARA en kurvad yta, inga väggar
// =============================================================================
//  Frågan: måste vi ha väggar? Kan man ha bara en "konisk-avlång" yta?
//
//  Svar: ja - MEN ytan måste vara KURVAD (brantare mot ändarna), inte en rak
//  kon. En rak kon har konstant lutning -> ingen återställande kraft -> tvålen
//  glider ner och tippar. En PARABOLISK ("båt"-formad) yta blir brantare ju
//  längre ut man kommer -> putta tvålen ur läge och en ände åker upp på en
//  brantare del -> tyngdpunkten höjs -> den glider tillbaka. Kurvaturen
//  ersätter väggen.
//
//  Ytan:  z(x,y) = base + ax*x^2 + ay*y^2   (flack båt, öppen, ingen rim)
//  Tvålen vilar på kortsidornas nederkanter/hörn, mitten svävar fritt -> torkar.
//
//  Öppna i OpenSCAD, F6, exportera STL. Mått i mm.
// =============================================================================

/* [Tvål] */
L = 90;   W = 60;   T = 25;

/* [Yta] */
gap      = 10;   // hur djupt mitten ligger under tvålens ändupplag
edgelift = 3;    // hur mycket ytan höjer sig i sidled vid tvålkanten (centrering)
xmargin  = 15;   // hur långt ytan fortsätter bortom tvålen (centreringsmån)
ymargin  = 13;   // d:o i sidled
base     = 3;    // materialtjocklek i mitten (lägsta punkten)
drain_d  = 8;    // litet avloppshål i mitten
feet_h   = 3;    // fothöjd
rf       = 4;    // rundning av yttre kant

/* [Visning] */
show_soap = true;
cut = false;
$fn = 40;

// --- härlett ---------------------------------------------------------------
half = L/2;
ax   = gap      / (half*half);     // längskurvatur (flack)
ay   = edgelift / ((W/2)*(W/2));   // tvärkurvatur (mild centrering)
Xr   = half + xmargin;             // halva fotavtryckets längd
Yr   = W/2  + ymargin;             // halva fotavtryckets bredd
Hb   = ceil(base + ax*Xr*Xr + ay*Yr*Yr + 6);   // blockhöjd
Zc   = Hb + rf + 8;                // kavitetens topp (skär av helt)
Nx   = 90;  stepx = 2*Xr/Nx;  dxs = 0.8;  M = 22;

function sxy(x,y) = base + ax*x*x + ay*y*y;
function ywid(x)  = max(0.5, Yr*sqrt(max(0, 1-(x/Xr)*(x/Xr))));

module ellipse2d() scale([Xr, Yr]) circle(1);

// en tunn tvärskiva av "allt ovanför ytan" vid station x
module slice(x) {
    Yw = ywid(x);
    pts = concat(
        [[-Yw, Zc]],
        [ for (i=[0:M]) let(y = -Yw + 2*Yw*i/M) [y, sxy(x,y)] ],
        [[Yw, Zc]]
    );
    translate([x,0,0])
        multmatrix([[0,0,1,0],[1,0,0,0],[0,1,0,0],[0,0,0,1]])
            linear_extrude(height=dxs) polygon(pts);
}
module cavity() union() for (i=[0:Nx-1])
    let (x0 = -Xr + i*stepx) hull() { slice(x0); slice(x0+stepx); }

// massivt block (rundad pebble, plan botten)
module block() intersection(){
    minkowski(){ linear_extrude(Hb) offset(r=-rf) ellipse2d(); sphere(rf); }
    translate([-300,-300,0]) cube([600,600,Hb+rf]);
}

module dish() {
    difference() {
        block();
        cavity();
        translate([0,0,-2]) cylinder(d=drain_d, h=base+6);
    }
    for (a=[0:2]) rotate([0,0,120*a+60])
        translate([Xr*0.5,0,-feet_h]) cylinder(d=9, h=feet_h);
}

// =============================================================================
module scene() {
    dish();
    if (show_soap)
        color([0.12,0.37,0.75,0.40])
            translate([-half, -W/2, sxy(half, W/2)]) cube([L, W, T]);
}
if (cut) intersection(){ scene(); translate([-300,-300,-60]) cube([600,300,300]); }
else scene();
