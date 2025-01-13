//#version 300 es
precision highp float;

// Escala global para todas as ditâncias
const float EARTH_RADIUS = 6.37e6;

// 2 times PI
const float TWO_PI=6.28318530718;

const float PI=3.14159265;

// Maximum number of planets
const int MAX_BODIES = 10;

// bodies
uniform vec2 uPosition[MAX_BODIES];
uniform float uRadius[MAX_BODIES];

// Output vertex position
varying vec2 fPosition;



// convert angle to hue; returns RGB
// colors corresponding to (angle mod TWO_PI):
// 0=red, PI/2=yellow-green, PI=cyan, -PI/2=purple
vec3 angle_to_hue(float angle) {
  angle /= TWO_PI;
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
    return vec4(angle_to_hue(a-TWO_PI), length(f)/1.0);
}


// constante de gravitação universal
const float G = 6.6743e-11;
// densidade média da terra - a usar para as massas a colocar
const float rho = 5.51e3;

// Volume da esfera = 4/3 * PI * r^3
// Massa dum corpo esférico de densidade rho = 4/3 * PI * rho * r^3

// constante a multiplicar pelo raio^3 para obter a massa do corpo
const float K = 4.0 / 3.0 * PI * rho;


// Computes the gravitational field at a point "pos" 
// caused by a body with radius "R" located at "body_pos"

vec3 gravity_force(vec2 pos, vec2 body_pos, float R)
{
    vec2 u = body_pos - pos;
    float r = length(u);
    float r2 = r * r;
    vec2 v = normalize(u);
    float mass;

    bool inside = false;

    if (r < R) {
        // inside
        mass = K * r * r * r ;
        inside = true;
    }
    else {
        // outside
        mass = K * R * R * R ;
    }
   
    return vec3(G * mass / r2 * v * EARTH_RADIUS, inside? 1.0 : 0.0);
}

vec3 net_force(vec2 pos) {
    // Compute gravitational field
    vec3 f = vec3(0.0, 0.0, 0.0);

    for(int i=0; i<MAX_BODIES; i++)
      if(uRadius[i] > 0.0)
         f += gravity_force(pos, uPosition[i], uRadius[i]);

    return f;
}


void main() {
    
    vec2 pos = fPosition;

    vec3 f = net_force(pos);

    float lf = length(f.xy);

    vec4 color = colorize(lf, f.xy);
    //vec4 color = vec4(hsv2rgb(vec3(atan(f.y, f.x)/TWO_PI, 1.0, 1.0)), lf);
    if(f.z > 0.0)
        color.a /=4.0;

    gl_FragColor = color;
}