precision highp float;

const vec4 plusColor = vec4(0.0, 1.0, 0.0, 1.0);
const vec4 minusColor = vec4(1.0, 0.0, 0.0, 1.0);

varying float fCharge;

void main()
{
    if(length(gl_PointCoord - vec2(0.5, 0.5)) > 0.5)
        discard;

    vec2 p = abs(gl_PointCoord - vec2(0.5, 0.5));

    if(fCharge > 0.0 && p.x < 0.1 && p.y < 0.4) 
        discard;

    if(p.y < 0.1 && p.x < 0.4)
        discard;

    if(fCharge < 0.0)
        gl_FragColor = minusColor;
    else
        gl_FragColor = plusColor; 
    //gl_FragColor = fCharge < 0.0 ? minusColor : plusColor;
}