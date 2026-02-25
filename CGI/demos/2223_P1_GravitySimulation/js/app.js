import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { vec2, flatten, subtract, dot } from '../../libs/MV.js';

import * as Helpers from '../helpers.js';

// Space width
const SPACE_WIDTH = 1.5;


// Maximum number of planets
const MAX_BODIES = 10;

let bodies = {
    position: [],
    radius: []
}



// Buffers: particles before update, particles after update, quad vertices
let inParticlesBuffer, outParticlesBuffer, quadBuffer;

// Particle system constants

// Total number of particles
const N_PARTICLES = 1000000;

// Minimum life
const MIN_LIFE_ABS = 1;
const MAX_LIFE_ABS = 20;
const DELTA_AGE = 1;


// Particle System status
let paramsPS = {
    // Minimum age
    minLife : 2,
    // Maximum age
    maxLife : 10,
    // Current simulation time
    time: undefined,
    // Place where particles are created              
    origin: [0,0],
    // minimum speed
    minSpeed : 0.1,
    // maximum speed
    maxSpeed : 0.2,
    // center direction
    centerAngle : 0.0,
    // aperture
    deltaAngle : Math.PI,
    //
};



const STEP_ANGLE = Math.PI / 6.0;

let bodyCreation = false;
let lastPos = vec2(0,0);

let drawPoints = true;
let drawField = true;

const keydown_handlers = {
    'PageUp'     : { 'handler': increase_speed,       'msg': 'Increase speed' },
    'PageDown'   : { 'handler': decrease_speed,       'msg': 'Decrease speed' },
    'ArrowUp'    : { 'handler': open_angle,           'msg': 'Open particles source angle' },
    'ArrowDown'  : { 'handler': close_angle,          'msg': 'Close particles source angle' },
    'ArrowLeft'  : { 'handler': rotate_ccw,           'msg': 'Rotate source counter clock wise' },
    'ArrowRight' : { 'handler': rotate_cw,            'msg': 'Rotate source clock wise' },
    'q'          : { 'handler': increase_min_life,    'msg': 'Increase min particle life' },
    'a'          : { 'handler': decrease_min_life,    'msg': 'Decrease min particle life' },
    'w'          : { 'handler': increase_max_life,    'msg': 'Increase max particle life' },
    's'          : { 'handler': decrease_max_life,    'msg': 'Decrease max particle life' },
    '0'          : { 'handler': toggle_draw_field,    'msg': 'Toggle field visualization' },
    '9'          : { 'handler': toggle_draw_points,   'msg': 'Toggle particle visualization' },
    'Shift'      : { 'handler': move_particle_source, 'msg': 'Move particle source to mouse position' },
};

function increase_speed(event)
{
    paramsPS.maxSpeed *= 1.20;
    paramsPS.minSpeed *= 1.15;
}

function decrease_speed(event)
{
    paramsPS.maxSpeed /= 1.20;
    paramsPS.minSpeed /= 1.15;
}

function open_angle(event) {
    paramsPS.deltaAngle = Math.min(paramsPS.deltaAngle + Math.PI/60, Math.PI);
}

function close_angle(event) {
    paramsPS.deltaAngle = Math.max(paramsPS.deltaAngle - Math.PI/60, Math.PI/60);
}

function rotate_ccw(event) {
    paramsPS.centerAngle += STEP_ANGLE*paramsPS.deltaTime;
}

function rotate_cw(event) {
    paramsPS.centerAngle -= STEP_ANGLE*paramsPS.deltaTime;
}

function increase_min_life(event){
    paramsPS.minLife = Math.min(paramsPS.minLife + DELTA_AGE, paramsPS.maxLife-DELTA_AGE);
}

function decrease_min_life(event){
    paramsPS.minLife = Math.max(paramsPS.minLife - DELTA_AGE, MIN_LIFE_ABS);
}

function increase_max_life(event){
    paramsPS.maxLife = Math.min(paramsPS.maxLife + DELTA_AGE, MAX_LIFE_ABS);
}

function decrease_max_life(event){
    paramsPS.maxLife = Math.max(paramsPS.maxLife - DELTA_AGE, paramsPS.minLife+DELTA_AGE);
}

function toggle_draw_field(event) {
    drawField = !drawField;
}

function toggle_draw_points(event){
    drawPoints  = !drawPoints;   
}

function move_particle_source(event) {
    paramsPS.origin = lastPos;
}

function main(shaders)
{
    // Generate the canvas element to fill the entire page
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;


    /** type {WebGL2RenderingContext} */
    const gl = setupWebGL(canvas, {alpha: true});

    // Initialize GLSL programs    
    const fieldProgram = buildProgramFromSources(gl, shaders["field-render.vert"], shaders["field-render.frag"]);
    const renderProgram = buildProgramFromSources(gl, shaders["particle-render.vert"], shaders["particle-render.frag"]);
    const updateProgram = buildProgramFromSources(gl, shaders["particle-update.vert"], shaders["particle-update.frag"], ["vPositionOut", "vAgeOut", "vLifeOut", "vVelocityOut"]);

    let space_height = SPACE_WIDTH * canvas.height / canvas.width;

    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 

    buildQuad();
    buildParticleSystem(N_PARTICLES, paramsPS.minLife, paramsPS.maxLife);

    window.addEventListener("resize", function(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0,0,canvas.width, canvas.height);
        space_height = SPACE_WIDTH * canvas.height / canvas.width;
    });

    Helpers.setup_keydown_handlers(window, keydown_handlers);

    window.addEventListener("keydown", function(event) {
        console.log(event.key);
        switch(event.key) {
            case 'Shift':
                paramsPS.origin = lastPos;
        }
        dumpParameters();
    })
    
    canvas.addEventListener("mousedown", function(event) {

        bodyCreation = !event.shiftKey && (bodies.position.length < MAX_BODIES);

        if(bodyCreation) {
            // There is still space for another body
            const p = getCursorPosition(canvas, event);
            bodies.position.push(p);
            bodies.radius.push(0);
        }
    });

    canvas.addEventListener("mousemove", function(event) {
        const p = getCursorPosition(canvas, event);

        if(bodyCreation) {
            const diff = subtract(p, bodies.position[bodies.position.length-1]);
            const len = Math.sqrt(dot(diff, diff))
            bodies.radius[bodies.position.length-1] = len;
        }

        if(event.shiftKey)
            paramsPS.origin = p;

        lastPos = p;
    });

    canvas.addEventListener("mouseup", function(event) {
        bodyCreation = false;
        bodies.count++;
    })

    function getCursorPosition(canvas, event) {
  
       
        const mx = event.offsetX;
        const my = event.offsetY;

        const x = ((mx / canvas.width * 2) - 1) * SPACE_WIDTH;
        const y = (((canvas.height - my)/canvas.height * 2) -1) * space_height;

        return vec2(x,y);
    }

    window.requestAnimationFrame(animate);

    function buildQuad() {
        const vertices = [-1.0, 1.0, -1.0, -1.0, 1.0, -1.0,
                          -1.0, 1.0,  1.0, -1.0, 1.0,  1.0];
        
        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    }

    function buildParticleSystem(nParticles, minLife, maxLife) {
        const data = [];

        for(let i=0; i<nParticles; ++i) {
            // position
            const x = -SPACE_WIDTH + Math.random() * (2 * SPACE_WIDTH);
            const y = -space_height + Math.random() * (2 * space_height);
            data.push(x); data.push(y);
            
            // age
            data.push(0.0);

            // life
            const life = minLife + Math.random() * (maxLife - minLife)
            data.push(life);

            // velocity
            data.push(0.0);
            data.push(0.0);
        }

        inParticlesBuffer = gl.createBuffer();
        outParticlesBuffer = gl.createBuffer();

        // Input buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, inParticlesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STREAM_DRAW);

        // Output buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, outParticlesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STREAM_DRAW);
    }



    function animate(timestamp)
    {
        let deltaTime = 0;

        if(paramsPS.time === undefined) {
            paramsPS.time = timestamp/1000;
            paramsPS.deltaTime = 0;
        } 
        else {
            paramsPS.deltaTime = timestamp/1000 - paramsPS.time;
            paramsPS.time = timestamp/1000;
        } 
        window.requestAnimationFrame(animate);

        // Clear framebuffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if(drawField) 
            drawQuad();
        updateParticles(paramsPS.deltaTime);
        if(drawPoints) 
            drawParticles(outParticlesBuffer);
        swapParticlesBuffers();
    }

    function updateParticles(deltaTime)
    {
        // Setup uniforms
        const uDeltaTime = gl.getUniformLocation(updateProgram, "uDeltaTime");
        const uOrigin = gl.getUniformLocation(updateProgram, "uOrigin");
        const uMinTheta = gl.getUniformLocation(updateProgram, "uMinTheta");
        const uMaxTheta = gl.getUniformLocation(updateProgram, "uMaxTheta");
        const uMinSpeed = gl.getUniformLocation(updateProgram, "uMinSpeed");
        const uMaxSpeed = gl.getUniformLocation(updateProgram, "uMaxSpeed");
        const uMinLife = gl.getUniformLocation(updateProgram, "uMinLife");
        const uMaxLife = gl.getUniformLocation(updateProgram, "uMaxLife");
        
        gl.useProgram(updateProgram);

        gl.uniform1f(uDeltaTime, deltaTime);
        gl.uniform2fv(uOrigin, paramsPS.origin);
        gl.uniform1f(uMinTheta, paramsPS.centerAngle - paramsPS.deltaAngle);
        gl.uniform1f(uMaxTheta, paramsPS.centerAngle + paramsPS.deltaAngle);
        gl.uniform1f(uMinSpeed, paramsPS.minSpeed);
        gl.uniform1f(uMaxSpeed, paramsPS.maxSpeed);
        gl.uniform1f(uMinLife, paramsPS.minLife);
        gl.uniform1f(uMaxLife, paramsPS.maxLife);

        // Send the bodies' positions
        for(let i=0; i<MAX_BODIES; i++) {

            const uPosition = gl.getUniformLocation(updateProgram, "uPosition[" + i + "]");
            const uRadius = gl.getUniformLocation(updateProgram, "uRadius[" + i + "]");

            const position = i < bodies.position.length ? bodies.position[i] : [0,0];
            const radius = i < bodies.position.length ? bodies.radius[i] : -1.0;

            gl.uniform2fv(uPosition, position);
            gl.uniform1f(uRadius, radius);
        }
        
        // Setup attributes
        const vPosition = gl.getAttribLocation(updateProgram, "vPosition");
        const vAge = gl.getAttribLocation(updateProgram, "vAge");
        const vLife = gl.getAttribLocation(updateProgram, "vLife");
        const vVelocity = gl.getAttribLocation(updateProgram, "vVelocity");

        gl.bindBuffer(gl.ARRAY_BUFFER, inParticlesBuffer);
        
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(vAge, 1, gl.FLOAT, false, 24, 8);
        gl.vertexAttribPointer(vLife, 1, gl.FLOAT, false, 24, 12);
        gl.vertexAttribPointer(vVelocity, 2, gl.FLOAT, false, 24, 16);
        
        gl.enableVertexAttribArray(vPosition);
        gl.enableVertexAttribArray(vAge);
        gl.enableVertexAttribArray(vLife);
        gl.enableVertexAttribArray(vVelocity);

        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, outParticlesBuffer);
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, N_PARTICLES);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    }

    function swapParticlesBuffers()
    {
        let auxBuffer = inParticlesBuffer;
        inParticlesBuffer = outParticlesBuffer;
        outParticlesBuffer = auxBuffer;
    }

    function drawQuad() {

        gl.useProgram(fieldProgram);


        // Setup uniforms

        const uSpaceSize = gl.getUniformLocation(fieldProgram, "uSpaceSize");
        gl.uniform2f(uSpaceSize, SPACE_WIDTH, space_height);

        // Send the bodies' positions
        for(let i=0; i<MAX_BODIES; i++) {

            const uPosition = gl.getUniformLocation(fieldProgram, "uPosition[" + i + "]");
            const uRadius = gl.getUniformLocation(fieldProgram, "uRadius[" + i + "]");

            const position = i < bodies.position.length ? bodies.position[i] : [0,0];
            const radius = i < bodies.position.length ? bodies.radius[i] : 0.0;

            gl.uniform2fv(uPosition, position);
            gl.uniform1f(uRadius, radius);
        }
        

        // Setup attributes
        const vPosition = gl.getAttribLocation(fieldProgram, "vPosition"); 

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(vPosition);
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawParticles(buffer)
    {

        gl.useProgram(renderProgram);

        // Setup uniforms

        const uSpaceSize = gl.getUniformLocation(renderProgram, "uSpaceSize");
        gl.uniform2f(uSpaceSize, SPACE_WIDTH, space_height);

        // Setup attributes
        const vPosition = gl.getAttribLocation(renderProgram, "vPosition");
        const vAge = gl.getAttribLocation(renderProgram, "vAge");
        const vLife = gl.getAttribLocation(renderProgram, "vLife");
        //const vVelocity = gl.getAttribLocation(renderProgram, "vVelocity");

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        gl.enableVertexAttribArray(vPosition);
        gl.enableVertexAttribArray(vAge);
        gl.enableVertexAttribArray(vLife);
        //gl.enableVertexAttribArray(vVelocity);

        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(vAge, 1, gl.FLOAT, false, 24, 8);
        gl.vertexAttribPointer(vLife, 1, gl.FLOAT, false, 24, 12);
        //gl.vertexAttribPointer(vVelocity, 2, gl.FLOAT, false, 24, 16);

        gl.drawArrays(gl.POINTS, 0, N_PARTICLES);
    }

    function dumpParameters() {
        console.log(paramsPS);
    }
}



loadShadersFromURLS([
    "field-render.vert", "field-render.frag",
    "particle-update.vert", "particle-update.frag", 
    "particle-render.vert", "particle-render.frag"
    ]
).then(shaders=>main(shaders));