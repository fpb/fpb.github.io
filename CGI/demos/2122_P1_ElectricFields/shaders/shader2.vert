// horizontal and vertical scale to convert from World coordinates to Normalised Device Coordinates [0,1]
uniform vec2 uScale;

// size used to draw the charges
uniform float uPointSize;

// Vertex position in World Coordinates
attribute vec2 vPosition;
// Charge value
attribute float vCharge;

varying float fCharge;

void main() 
{    
    fCharge = vCharge;
    gl_PointSize = uPointSize;
    gl_Position = vec4(vPosition*uScale, 0.0, 1.0);
}