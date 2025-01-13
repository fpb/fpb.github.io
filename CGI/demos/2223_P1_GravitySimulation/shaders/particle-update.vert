//#version 300 es
precision mediump float;


const int MAX_BODIES = 10;

// bodies
uniform vec2 uPosition[MAX_BODIES];
uniform float uRadius[MAX_BODIES];

/* Number of seconds (possibly fractional) that has passed since the last
   update step. */
uniform float uDeltaTime;

/* This is the point from which all newborn particles start their movement. */
uniform vec2 uOrigin;

/* Theta is the angle between the vector (1, 0) and a newborn particle's
   velocity vector. By setting uMinTheta and uMaxTheta, we can restrict it
   to be in a certain range to achieve a directed "cone" of particles.
   To emit particles in all directions, set these to -PI and PI. */

uniform float uMinTheta;
uniform float uMaxTheta;

/* The min and max values of the (scalar!) speed assigned to a newborn
   particle.*/
uniform float uMinSpeed;
uniform float uMaxSpeed;

/* The min and max values for the life of new particles */
uniform float uMinLife;
uniform float uMaxLife; 


/* Inputs. These reflect the state of a single particle before the update. */

/* Where the particle is. */
attribute vec2 vPosition;
/* Age of the particle in seconds. */
attribute float vAge;
/* How long this particle is supposed to live. */
attribute float vLife;
/* Which direction it is moving, and how fast. */ 
attribute vec2 vVelocity;


/* Outputs. These mirror the inputs. These values will be captured
   into our transform feedback buffer! */
varying vec2 vPositionOut;
varying float vAgeOut;
varying float vLifeOut;
varying vec2 vVelocityOut;


// constante de gravitação universal
const float G = 6.6743e-11;
// densidade média da terra - a usar para as massas a colocar
const float rho = 5.51e3;
// pi
const float pi = 3.14159265;

// Volume da esfera = 4/3 * pi * r^3
// Massa dum corpo esférico de densidade rho = 4/3 * pi * rho * r^3

// constante a multiplicar pelo raio^3 para obter a massa do corpo
const float K = 4.0 / 3.0 * pi * rho;

// Escala global para todas as distâncias
const float EarthRadius = 6.371e6;

// Computes the gravitational field at a point "pos" 
// caused by a body with radius "R" located at "body_pos"

vec2 gravity_force(vec2 pos, vec2 body_pos, float R)
{
   vec2 u = body_pos - pos;
   float r = length(u);
   float r2 = r * r;
   vec2 v = normalize(u);
   float mass;

   if (r < R) {
      // inside
      mass = K * r * r * r ;
      vAgeOut = vLife;
      vPositionOut = vec2(1000.0, 1000.0);
   }
   else {
      // outside
      mass = K * R * R * R ;
   }
   
   return G * mass / r2 * v * EarthRadius;
}

vec2 net_force(vec2 pos) {
    // Compute gravitational field
    vec2 f = vec2(0.0, 0.0);

    for(int i=0; i<MAX_BODIES; i++)
      if(uRadius[i] > 0.0)
         f += gravity_force(pos, uPosition[i], uRadius[i]);

    return f;
}

highp float rand(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

void main() {

   /* Update parameters according to our simple rules.*/
   vPositionOut = vPosition + vVelocity * uDeltaTime;
   vAgeOut = vAge + uDeltaTime;
   vLifeOut = vLife;
   vVelocityOut = vVelocity + net_force(vPosition) * uDeltaTime;
      
   if (vAgeOut >= vLife) {

      /* Particle has exceeded its lifetime! Time to spawn a new one
         in place of the old one, in accordance with our rules.*/
      
      /* First, choose where to sample the random texture. I do it here
         based on particle ID. It means that basically, you're going to
         get the same initial random values for a given particle. The result
         still looks good. I suppose you could get fancier, and sample
         based on particle ID *and* time, or even have a texture where values
         are not-so-random, to control the pattern of generation. */
      //ivec2 noise_coord = ivec2(gl_VertexID % 512, gl_VertexID / 512);
      
      /* Get the pair of random values. */
      float xx = rand(vPosition);
      float yy = rand(uDeltaTime*vPosition);

      vec2 rand = vec2(xx, yy);

      /* Decide the direction of the particle based on the first random value.
         The direction is determined by the angle theta that its vector makes
         with the vector (1, 0).*/
      float theta = uMinTheta + rand.r*(uMaxTheta - uMinTheta);

      /* Derive the x and y components of the direction unit vector.
         This is just basic trig. */
      float x = cos(theta);
      float y = sin(theta);

      /* Return the particle to origin. */
      vPositionOut = uOrigin;

      /* It's new, so age must be set accordingly.*/
      vAgeOut = 0.0;
      vLifeOut = uMinLife + rand.g * (uMaxLife - uMinLife);

      /* Generate final velocity vector. We use the second random value here
         to randomize speed. */
      vVelocityOut =
         vec2(x, y) * (uMinSpeed + rand.g * (uMaxSpeed - uMinSpeed));
   }
}