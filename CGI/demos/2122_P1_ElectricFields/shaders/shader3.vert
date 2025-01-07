attribute vec4 vPosition;

// horizontal and vertical scale to convert from World coordinates to Normalised Device Coordinates [-1,1]
uniform vec2 uScale;

varying vec2 fPosition;

void main()
{
    gl_Position = vec4(vPosition.xy, 0.0, 1.0);
    fPosition = gl_Position.xy / uScale;
}