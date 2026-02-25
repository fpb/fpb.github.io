import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../../libs/utils.js';
import { vec2, flatten, sizeof } from '../../../libs/MV.js';

import * as Helpers from '../../helpers.js';

const table_width = 1.5;
const grid_space = 0.05;

const MAX_CHARGES = 20;

let probesBuffer, chargesBuffer, quadBuffer;
let chargesVisible = false;
let linesVisible = true;

const keydown_handlers = {
    ' '     : { 'handler': () => chargesVisible = !chargesVisible,   'msg': 'Toggle charges display' },
    '0'     : { 'handler': () => linesVisible = !linesVisible,       'msg': 'Toggle field display' },
};

function main(shaders)
{
    const chargePosition = [];
    const charge = [];
    let nCharges = 0;

    // Generate the canvas element to fill the entire page
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;


    /** type {WebGLRenderingContext} */
    const gl = setupWebGL(canvas, {alpha: true});

    // Initialize GLSL programs
    const program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    const program2 = buildProgramFromSources(gl, shaders["shader2.vert"], shaders["shader2.frag"]);
    const program3 = buildProgramFromSources(gl, shaders["shader3.vert"], shaders["shader3.frag"]);
    
    console.log(gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS));

    let table_height = table_width * canvas.height / canvas.width;

    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 

    let nProbes = buildFieldLines();

    buildChargeMarkers();

    buildQuad();


    window.addEventListener("resize", function(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0,0,canvas.width, canvas.height);
        table_height = table_width * canvas.height / canvas.width;
    });

    Helpers.setup_keydown_handlers(window, keydown_handlers);

    // window.addEventListener("keydown", function(event) {
    //     if(event.key == ' ') chargesVisible = !chargesVisible;
    //     else if(event.key == '0') linesVisible = !linesVisible;
    // })
    canvas.addEventListener("click", function(event) {
        if(nCharges == MAX_CHARGES) return;

        const c = event.shiftKey ? -1.0e-3 : 1.0e-3;
        const p = getCursorPosition(canvas, event);
        chargePosition[nCharges] = p;
        
        charge[nCharges] = c;

        // Buffer contains vec2, float, ...
        gl.bindBuffer(gl.ARRAY_BUFFER, chargesBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 12 * nCharges, flatten(chargePosition[nCharges]));
        gl.bufferSubData(gl.ARRAY_BUFFER, 12 * nCharges + 8, flatten([charge[nCharges]]));

        nCharges++;
    });

    function getCursorPosition(canvas, event) {
        /*
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        console.log("x: " + x + " y: " + y);
        */
       
        const mx = event.offsetX;
        const my = event.offsetY;

        const x = ((mx / canvas.width * 2) - 1) * table_width;
        const y = (((canvas.height - my)/canvas.height * 2) -1) * table_height;

        return vec2(x,y);
    }

    window.requestAnimationFrame(animate);



    function buildFieldLines()
    {
        let nProbes = 0;
        const probes = [];
        for(let x = grid_space/2; x <= table_width; x += grid_space)
            for(let y = grid_space/2; y <= table_height; y += grid_space) {
                const xx = x + grid_space * (Math.random() - 0.5);
                const yy = y + grid_space * (Math.random() - 0.5);
                probes.push(vec2(xx,yy)); probes.push(vec2(xx+2*table_width,yy));
                probes.push(vec2(xx,-yy)); probes.push(vec2(xx+2*table_width,-yy));
                probes.push(vec2(-xx,yy)); probes.push(vec2(-xx+2*table_width,yy));
                probes.push(vec2(-xx,-yy)); probes.push(vec2(-xx+2*table_width,-yy));
                nProbes += 8;
            }
    
        probesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, probesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(probes), gl.STATIC_DRAW);    

        return nProbes;
    }

    function buildChargeMarkers()
    {
        chargesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, chargesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, (sizeof['vec2'] + 4) * MAX_CHARGES, gl.DYNAMIC_DRAW);
    }

    function buildQuad()
    {
        const corners = [
            vec2(-1, 1),
            vec2(-1, -1),
            vec2(1, 1),
            vec2(1, -1)
        ];

        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(corners), gl.STATIC_DRAW);
    }

    function animate(time)
    {
        window.requestAnimationFrame(animate);

        // Clear framebuffer
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Draw the Field Lines
        if(linesVisible) 
            drawFieldLines(time);
        else drawQuad(time);

        // Draw the charges
        if(chargesVisible) 
            drawCharges();

        // Update che charges positions for the next frame
        moveCharges();
    }

    function drawFieldLines(time)
    {
        gl.useProgram(program);

        // Send the charges' positions
        for(let i=0; i<chargePosition.length; i++) {
            const uChargePosition = gl.getUniformLocation(program, "uChargePosition[" + i + "]");
            const uCharge = gl.getUniformLocation(program, "uCharge[" + i + "]");
            gl.uniform2fv(uChargePosition, chargePosition[i]);
            gl.uniform1f(uCharge, charge[i]);
        }

        // Send the scale
        let scale = vec2(1/table_width, 1/table_height);

        const uScale = gl.getUniformLocation(program, "uScale");
        gl.uniform2fv(uScale, scale);

        // Send the grid spacing
        const uGridSpace = gl.getUniformLocation(program, "uGridSpace");
        gl.uniform1f(uGridSpace, grid_space);

        // Send the size of the lines
        const uSize = gl.getUniformLocation(program, "uSize");
        gl.uniform1f(uSize, Math.abs(5*Math.sin(time/10000)));

        gl.bindBuffer(gl.ARRAY_BUFFER, probesBuffer);
        const vPosition = gl.getAttribLocation(program, "vPosition");
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    
        // Draw the field lines
        gl.drawArrays(gl.LINES, 0, nProbes);
    }

    function drawCharges()
    {
        gl.useProgram(program2);

        // Send the scale
        let scale = vec2(1/table_width, 1/table_height);

        const uScale = gl.getUniformLocation(program2, "uScale");
        gl.uniform2fv(uScale, scale);

        const uPointSize = gl.getUniformLocation(program2, "uPointSize");
        gl.uniform1f(uPointSize, 24.0);

        //
        gl.bindBuffer(gl.ARRAY_BUFFER, chargesBuffer);

        const vPosition = gl.getAttribLocation(program2, "vPosition");
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 12, 0);

        const vCharge = gl.getAttribLocation(program2, "vCharge");
        gl.enableVertexAttribArray(vCharge);
        gl.vertexAttribPointer(vCharge, 1, gl.FLOAT, false, 12, 8);
    
        // Draw the charges marks
        gl.drawArrays(gl.POINTS, 0, nCharges);
    }

    function drawQuad(time)
    {
        gl.useProgram(program3);

        // Send the charges' positions
        for(let i=0; i<chargePosition.length; i++) {
            const uChargePosition = gl.getUniformLocation(program3, "uChargePosition[" + i + "]");
            const uCharge = gl.getUniformLocation(program3, "uCharge[" + i + "]");
            gl.uniform2fv(uChargePosition, chargePosition[i]);
            gl.uniform1f(uCharge, charge[i]);
        }

        // Send the scale
        let scale = vec2(1/table_width, 1/table_height);

        const uScale = gl.getUniformLocation(program3, "uScale");
        gl.uniform2fv(uScale, scale);

        // Send the grid spacing
        const uGridSpace = gl.getUniformLocation(program3, "uGridSpace");
        gl.uniform1f(uGridSpace, grid_space);

        // Send the size of the lines
        const uSize = gl.getUniformLocation(program3, "uSize");
        gl.uniform1f(uSize, 1.0);
        

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const vPosition = gl.getAttribLocation(program, "vPosition");
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    
        // Draw the field quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function drawCharges()
    {
        gl.useProgram(program2);

        // Send the scale
        let scale = vec2(1/table_width, 1/table_height);

        const uScale = gl.getUniformLocation(program2, "uScale");
        gl.uniform2fv(uScale, scale);

        const uPointSize = gl.getUniformLocation(program2, "uPointSize");
        gl.uniform1f(uPointSize, 24.0);

        //
        gl.bindBuffer(gl.ARRAY_BUFFER, chargesBuffer);

        const vPosition = gl.getAttribLocation(program2, "vPosition");
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 12, 0);

        const vCharge = gl.getAttribLocation(program2, "vCharge");
        gl.enableVertexAttribArray(vCharge);
        gl.vertexAttribPointer(vCharge, 1, gl.FLOAT, false, 12, 8);
    
        // Draw the charges marks
        gl.drawArrays(gl.POINTS, 0, nCharges);

    }

    function moveCharges()
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, chargesBuffer);
        
        for(let i=0; i<nCharges; i++) {
            chargePosition[i] = rot2D(chargePosition[i], charge[i]*1000);
            gl.bufferSubData(gl.ARRAY_BUFFER, 12* i, flatten(chargePosition[i]));
        }
    }

    function rot2D(v, theta) {
        var c = Math.cos( radians(theta) );
        var s = Math.sin( radians(theta) );

        return vec2(c * v[0] -s * v[1], s * v[0] + c * v[1]);
    }

    function radians(deg)
    {
        return Math.PI / 180 * deg;
    }










    


}



loadShadersFromURLS(["shader.vert", "shader.frag","shader2.vert", "shader2.frag", "shader3.vert", "shader3.frag"]).then(shaders=>main(shaders));