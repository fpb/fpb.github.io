precision highp float;

const int MAX_CHARGES = 20;

const float ke = 8.988e9;
const float qe = 1.602176634e-19;

// charge positions
uniform vec2 uChargePosition[MAX_CHARGES];
// charge magnitudes
uniform float uCharge[MAX_CHARGES];

// distance between grid points
uniform float uGridSpace;

//
uniform float uSize;

varying vec2 fPosition;


#define TWOPI 6.28318530718

// convert angle to hue; returns RGB
// colors corresponding to (angle mod TWOPI):
// 0=red, PI/2=yellow-green, PI=cyan, -PI/2=purple

vec3 angle_to_hue(float angle) {
  angle /= TWOPI;
  return clamp((abs(fract(angle+vec3(3.0, 2.0, 1.0)/3.0)*6.0-3.0)-1.0), 0.0, 1.0);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 colorize(float l, vec2 f)
{
    if(mod(log(abs(l)), 0.5) < 0.05) return vec4(0.0, 0.0, 0.0, 1.0);

    float a = atan(f.y, f.x);
    return vec4(angle_to_hue(a-TWOPI), 1.);
}

// Computes the electrical field at a grid point "pos" 
// caused by a charge with "charge" magnitude located at "charge_pos"

vec2 electrical_force(vec2 pos, vec2 charge_pos, float charge)
{
    vec2 r = pos - charge_pos;
    float r2 = length(r) * length(r);
    r = normalize(r);
    return ke * charge * r / r2;
}

void main()
{
    // Compute electric field and displace the point accordingly
    vec2 f = vec2(0.0, 0.0);

    for(int i=0; i<MAX_CHARGES; i++) {
        f += electrical_force(fPosition, uChargePosition[i], uCharge[i]);
    }
    float l = length(f);

    // Truncate electric field
    f = normalize(f);


    gl_FragColor = colorize(l, f)*uSize;
}