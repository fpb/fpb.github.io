import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../../libs/utils.js";
import { mat3, translate, rotate, scalem } from "../../../libs/MV.js";

import { IFSShape } from "./ifsshape.js";
import * as Shapes from "./shape_params.js";
import * as Helpers from "../../helpers.js";


var gl;
var canvas;
var aspect;

var ifs_program;
var draw_program;

var ifs = null;

var scale = 1.0;
var offset_x = 0.0;
var offset_y = 0.0;

var scaleNode, offsetNode, pointsNode, iterationsNode;

var down=false;
var last_x, last_y;

let max_iterations = 50;
let points = 5000000;

function setup_barnsley_fern(event) {
    scale = 5.5;
    offset_x = 0.0;
    offset_y = -5.0;
    add_ifs(Shapes.barnsley_fern);
}

function setup_culcita_fern(event) {
    scale = 3.1;
    offset_x = 0.0;
    offset_y = -2.9;
    add_ifs(Shapes.culcita_fern);
}

function setup_cyclosorus_fern(event)
{
    scale = 4;
    offset_x = 0.0;
    offset_y = -3.2;
    add_ifs(Shapes.cyclosorus_fern);
}

function setup_fishbone_fern(event)
{
    scale = 4;
    offset_x = 0.0;
    offset_y = -3.2;
    add_ifs(Shapes.fishbone_fern);
}

function setup_spiral(event)
{
    scale = 5;
    offset_x = 0.0;
    offset_y = -4.9;
    add_ifs(Shapes.spiral);
}

function setup_mandelbrot_like(event)
{
    scale = 0.6;
    offset_x = -0.150;
    offset_y = 0.460;
    add_ifs(Shapes.mandelbrot_like);
}

function setup_tree_1(event)
{
    scale = 1;
    offset_x = 0.0;
    offset_y = 0.0;
    add_ifs(Shapes.tree_1);
}

function setup_tree_2(event)
{
    scale = 0.5;
    offset_x = 0.0;
    offset_y = -0.444;
    add_ifs(Shapes.tree_2);
}

function setup_dragon(event)
{
    scale = 5.5;
    offset_x = -0.5;
    offset_y = -4.9;
    add_ifs(Shapes.dragon);
}

function setup_maple_leaf(event)
{
    scale = 4;
    offset_x = 0;
    offset_y = 0;
    add_ifs(Shapes.maple_leaf);
}

function increase_iterations(event)
{
    max_iterations = Math.min(max_iterations + 1, 100);
}

function decrease_iterations(event)
{
    max_iterations = Math.max(max_iterations - 1, 0);
    if(ifs) ifs.reset();
}

function setup_random_predef_ifs(event)
{
    max_iterations = 50;
    ifs.iterations = 0;
    ifs.params = Shapes.all_shapes[Math.floor(Math.random() * Shapes.all_shapes.length)];
}

function setup_random_ifs(event) {
    max_iterations = 50;
    ifs.iterations = 0;
    ifs.params = randomize_shape();
}

function reset_ifs(event)
{
    max_iterations =  0;
    if(ifs) ifs.reset();
}

const keydown_handlers = {
    '1' : { 'handler': setup_barnsley_fern,     'msg': 'Barnsley fern' },
    '2' : { 'handler': setup_culcita_fern,      'msg': 'Culcita fern' },
    '3' : { 'handler': setup_cyclosorus_fern,   'msg': 'Cyclosorus fern' },
    '4' : { 'handler': setup_fishbone_fern,     'msg': 'Fishbone fern' },
    '5' : { 'handler': setup_spiral,            'msg': 'Spiral' },
    '6' : { 'handler': setup_mandelbrot_like,   'msg': 'Mandelbrot like' },
    '7' : { 'handler': setup_tree_1,            'msg': 'Tree 1' },
    '8' : { 'handler': setup_tree_2,            'msg': 'Tree 2' },
    '9' : { 'handler': setup_dragon,            'msg': 'Dragon' },
    '0' : { 'handler': setup_maple_leaf,        'msg': 'Maple leaf' },
    '+' : { 'handler': increase_iterations,     'msg': 'Increase max iterations' },
    '-' : { 'handler': decrease_iterations,     'msg': 'Decrease max iterations' },
    'r' : { 'handler': setup_random_predef_ifs, 'msg': 'Random predefined IFS' },
    'x' : { 'handler': setup_random_ifs,        'msg': 'Random IFS' },
    'i' : { 'handler': reset_ifs,               'msg': 'Set max iterations to 0' },
};


function resize(target) {
    const width = target.innerWidth;
    const height = target.innerHeight;

    canvas.width = width;
    canvas.height = height;

    aspect = canvas.width / canvas.height;

    gl.viewport(0,0,width, height);
}

function setup(shaders)
{
    canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas, { alpha: true } );

    // Create WebGL programs
    ifs_program = buildProgramFromSources(gl, shaders["shader-iterate.vert"], shaders["shader-iterate.frag"], ["new_position", "new_hue"]);
    draw_program = buildProgramFromSources(gl, shaders["shader1.vert"], shaders["shader1.frag"]);

    Helpers.setup_keydown_handlers(window, keydown_handlers);

    // Handle resize events 
    window.addEventListener("resize", (event) => {
        resize(event.target);
    });

    window.addEventListener("wheel", (event) => {

        scale *= (1 + event.deltaY / 1000);
    });

    window.addEventListener("mousedown", (event) => {
        last_x = event.offsetX;
        last_y = event.offsetY;

        down = true;
    });

    window.addEventListener("mousemove", (event) => {
        if( !down )
            return;

        const delta_x = event.offsetX - last_x;
        const delta_y = event.offsetY - last_y;

        offset_x += 2*aspect * (delta_x / canvas.width) * scale ;
        offset_y -= 2*(delta_y / canvas.height) * scale;

        last_x = event.offsetX;
        last_y = event.offsetY;

    });


    window.addEventListener("mouseup", (event) => {
        down=false;
    });

    resize(window);

    gl.clearColor(0.0, 0.0, 0.0, 1);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    //gl.blendFunc(gl.ONE, gl.ONE);

        // look up the elements we want to affect
    var scaleElement = document.querySelector("#scale");
    var offsetElement = document.querySelector("#offset");
    var pointsElement = document.querySelector("#points");
    var iterationsElement = document.querySelector("#iterations");
    
    // Create text nodes to save some time for the browser.
    scaleNode = document.createTextNode("");
    offsetNode = document.createTextNode("");
    pointsNode = document.createTextNode("");
    iterationsNode = document.createTextNode("");

    
    // Add those text nodes where they need to go
    scaleElement.appendChild(scaleNode);
    offsetElement.appendChild(offsetNode);
    pointsElement.appendChild(pointsNode);
    iterationsElement.appendChild(iterationsNode);

    window.requestAnimationFrame(animate);
}



function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

function getRandomFloat(min, max) {
    return Math.random() * (max-min) + min;
}


function getRandomTransform() {
    const angle = getRandomFloat(0, 2*Math.PI);
    let scalex = getRandomFloat(0.5, 1.0);
    let scaley = getRandomFloat(0.5, 1.0);

    if(getRandomFloat(0,1) > 0.5) scalex *= -1;
    if(getRandomFloat(0,1) > 0.5) scaley *= -1;

    const dx = getRandomFloat(-2,2);
    const dy = getRandomFloat(-2,2);

    const cosa = Math.cos(angle);
    const sina = Math.sin(angle);

    const m = mat3(1.0);
    m[0][0] = cosa * scalex;
    m[0][1] = -sina * scaley;
    m[1][0] = sina * scalex;
    m[1][1] = cosa * scaley;

    m[0][2] = dx;
    m[1][2] = dy;

    return m;
}

function randomize_shape() {

    const params = { m: [], p: [] };

    const n_funcs = getRandomInt(2, 7);

    let probs = Array(n_funcs).fill().map(()=>Math.random());
    const tp = probs.reduce((accumulator, currentValue) => { return accumulator + currentValue },0);
    probs = probs.map( (elem) => elem/tp );

    let acc_p = 0;

    for(let i=0; i<n_funcs; i++) {
        params.m.push(getRandomTransform());

        acc_p += probs[i];
        params.p.push(acc_p);
    }

    console.log(params);
    return params;
}

function add_ifs(params) {

    if( ifs )
        ifs.destroy();

        max_iterations = 50;

    ifs = new IFSShape(gl, 2000000, params);
}

function animate(time)
{
    window.requestAnimationFrame(animate);

    offsetNode.nodeValue = "(" + offset_x.toFixed(3) + ", " + offset_y.toFixed(3) + ")";  // no decimal place
    scaleNode.nodeValue = scale.toFixed(2);   // 2 decimal places
    pointsNode.nodeValue = points.toFixed(0);   // 2 decimal places
    iterationsNode.nodeValue = max_iterations.toFixed(0);   // 2 decimal places

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(draw_program);

    const uScale = gl.getUniformLocation(draw_program, "scale");
    gl.uniform1f(uScale, scale);
    const uAspect = gl.getUniformLocation(draw_program, "aspect");
    gl.uniform1f(uAspect, canvas.width / canvas.height);
    const uOffset = gl.getUniformLocation(draw_program, "offset");
    gl.uniform2f(uOffset, offset_x, offset_y);

    if(ifs) {
        // Draw the ifs shape
        ifs.draw(draw_program);

        // Update the ifs
        ifs.iterate(ifs_program, max_iterations);
    }

}

loadShadersFromURLS(["shader1.vert", "shader1.frag", "shader-iterate.frag", "shader-iterate.vert"]).then(shaders => setup(shaders))