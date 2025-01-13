precision mediump float;


// Scale

uniform vec2 uSpaceSize;

// Vertex position in World Coordinates
attribute vec2 vPosition;

// Output vertex position
varying vec2 fPosition;

void main() 
{
    fPosition = vPosition * uSpaceSize;
    gl_Position = vec4(vPosition, 0.0, 1.0);
}