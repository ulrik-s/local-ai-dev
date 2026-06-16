// =============================================================================
//  TVÅLKOPP - självcentrerande, tvålen vilar vågrätt på kortsidornas nederkanter
// =============================================================================
//  Tvålen ses som ett rätblock:  L = långsida, W = kortsida, T = tjocklek.
//
//  Idé: två branta ändväggar (avstånd ~ L) stoppar tippning och centrerar på
//  längden, en flack v-ränna i mitten låter undersidan sväva fritt och torka,
//  och vattnet rinner till avloppshålet. Släpp tvålen ungefär rätt så glider
//  den till vågrätt jämviktsläge.
//
//  Öppna i OpenSCAD. Rendera (F6) och exportera STL för 3D-utskrift.
//  Alla mått i mm.
// =============================================================================

/* [Tvål] */
L = 90;     // långsida (tvålens längd)
W = 60;     // kortsida (tvålens bredd)
T = 25;     // tjocklek (tvålens höjd)

/* [Kopp] */
endrun   = 13;  // horisontell längd på brant ändvägg (stopp)
gap      = 10;  // luftspalt: hur högt tvålens underkant svävar i mitten
stop     = 12;  // hur högt ändväggen reser sig över viloläget
base     = 4;   // godstjocklek i botten
yclear   = 4;   // sidoglapp (per sida)
ywall    = 4;   // sidoväggens tjocklek
wallend  = 4;   // godstjocklek vid ändväggens topp
drain_d  = 9;   // avloppshålets diameter
feet_h   = 3;   // fothöjd (lyfter koppen för avrinning)

/* [Visning] */
show_soap = true;   // visa tvålen (genomskinlig) för referens
$fn = 64;

// --- härledda mått -----------------------------------------------------------
half  = L/2;
outL  = half + endrun;          // halva inre längden (fot -> rimtopp)
srest = base + gap;             // z för tvålens viloläge (underkant)
Htop  = base + stop + gap;      // rimtopp
yhi   = W/2 + yclear;           // inre halvbredd
yout  = yhi + ywall;            // yttre halvbredd
boxL  = outL + wallend;         // yttre halvlängd

// =============================================================================
module dish() {
    difference() {
        // ---- yttre kropp ----
        translate([0,0,feet_h])
            rounded_box(2*boxL, 2*yout, Htop, r=6);

        // ---- kavitet: extrudera luftprofilen (x-z) längs bredden ----
        translate([0, yhi, feet_h])
            rotate([90,0,0])
                linear_extrude(height = 2*yhi)
                    air_profile();

        // ---- avloppshål i mitten ----
        translate([0,0,-1])
            cylinder(d=drain_d, h=feet_h+base+2);

        // ---- liten avrinningsskåra ut genom en sidovägg ----
        translate([0, yout-ywall/2, feet_h+base])
            cube([drain_d, ywall+2, gap*0.6], center=true);
    }
    // ---- fötter ----
    for (sx=[-1,1], sy=[-1,1])
        translate([sx*(boxL-8), sy*(yout-8), 0])
            cylinder(d=8, h=feet_h);
}

// luftprofil i x-z: inre yta (v-ränna + branta ändväggar) + öppen topp
module air_profile() {
    polygon(points=[
        [-outL,           srest+stop],   // inre rimtopp vänster
        [-half,           srest    ],   // vänster fot (tvålens upplag)
        [ 0,              base     ],   // v-rännans botten (mitten)
        [ half,           srest    ],   // höger fot
        [ outL,           srest+stop],   // inre rimtopp höger
        [ outL,           Htop+10  ],   // upp i öppen topp
        [-outL,           Htop+10  ]
    ]);
}

module rounded_box(x, y, z, r=4) {
    hull() for (sx=[-1,1], sy=[-1,1])
        translate([sx*(x/2-r), sy*(y/2-r), 0])
            cylinder(r=r, h=z);
}

// =============================================================================
dish();

if (show_soap)
    color([0.12,0.37,0.75,0.40])
        translate([-half, -W/2, feet_h+srest])
            cube([L, W, T]);
