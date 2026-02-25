import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../../libs/utils.js";
import { vec2 } from "../../../libs/MV.js";
import { Curve, B_SPLINE, CATMULL_ROM, BEZIER } from "./curve.js";
import * as Helpers from "../../helpers.js";

let gl;
let canvas;

let draw_program;

let curves = [];
let curve = null;
let type = B_SPLINE;

let pointsNode, curvesNode, stepsNode, speedNode;

let playing = false;
let editing = false;
let tracking = false;
let moved = false;
let last_x, last_y;

let forward = true;

/** Global statistics and parameters */

/* Total number of points */
let points = 0;
/* Number of steps to draw a curve */
let steps = 5;
/* Speed of the simulation */
let speed = 1.0;

const DISPLAY_POINTS = 1;
const DISPLAY_LINES = 2;

let display_mode = DISPLAY_POINTS | DISPLAY_LINES;

let clear_color = true;

function debug_info() {
    console.log(`Total curves ${curves.length}`);
    for (const c of curves) {
        c.debug();
    }
    console.log(`Editing: ${editing}`);
}

function increase_steps() {
    steps = Math.min(steps + 1, 50);
}

function decrease_steps() {
    steps = Math.max(steps - 1, 1);
}

function toggle_points() {
    display_mode ^= DISPLAY_POINTS;
}

function toggle_lines() {
    display_mode ^= DISPLAY_LINES;
}

function clear() {
    curves = [];
    curve = null;
    editing = false;
    steps = 20;
    points = 0;
}

function quicker() {
    speed *= 1.05;
}

function slower() {
    speed /= 1.05;
}

function toggle_clear() {
    clear_color = !clear_color;
}

function play_pause() {
    playing = !playing;
}

function finish_curve() {
    editing = false;
    if (curve) {
        curve.finish();
        curves.push(curve);
        curve = null;
    }
}

function invert_time_direction() {
    forward = !forward;
}

function set_bspline() {
    type = B_SPLINE;
}

function set_catmull_rom() {
    type = CATMULL_ROM;
}

function set_bezier() {
    type = BEZIER;
}

const keydown_handlers = {
    '1': { 'handler': debug_info, 'msg': 'Dump debug information' },
    '+': { 'handler': increase_steps, 'msg': 'Increase steps per segment' },
    '-': { 'handler': decrease_steps, 'msg': 'Decrease steps per segment' },
    'p': { 'handler': toggle_points, 'msg': 'Toggle points display' },
    'l': { 'handler': toggle_lines, 'msg': 'Toggle lines display' },
    'c': { 'handler': clear, 'msg': 'Clear all lines' },
    '>': { 'handler': quicker, 'msg': 'Increase speed' },
    '<': { 'handler': slower, 'msg': 'Decrease speed' },
    'x': { 'handler': toggle_clear, 'msg': 'Toggle clear background' },
    ' ': { 'handler': play_pause, 'msg': 'play/pause animation' },
    'z': { 'handler': finish_curve, 'msg': 'Finish current curve' },
    's': { 'handler': invert_time_direction, 'msg': 'Invert time' },
    '1': { 'handler': set_bspline, 'msg': 'B-Splines' },
    '2': { 'handler': set_catmull_rom, 'msg': 'Catmull-Rom' },
    '3': { 'handler': set_bezier, 'msg': 'Bézier' },
};

/**
 * Resize event handler
 * 
 * @param {*} target - The window that has resized
 */
function resize(target) {
    // Aquire the new window dimensions
    const width = target.innerWidth;
    const height = target.innerHeight;

    // Set canvas size to occupy the entire window
    canvas.width = width;
    canvas.height = height;


    // Set the WebGL viewport to fill the canvas completely
    gl.viewport(0, 0, width, height);
}

function setup(shaders) {
    canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas, { alpha: true, preserveDrawingBuffer: true });

    // Create WebGL programs
    draw_program = buildProgramFromSources(gl, shaders["shader1.vert"], shaders["shader1.frag"]);


    Helpers.setup_keydown_handlers(window, keydown_handlers);

    Curve.init(gl, draw_program);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.lineWidth(20.0);

    // Handle resize events 
    window.addEventListener("resize", (event) => {
        resize(event.target);
    });

    // Handle wheel events
    window.addEventListener("wheel", (event) => {
    });

    function get_pos_from_mouse_event(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / canvas.width * 2 - 1;
        const y = -((event.clientY - rect.top) / canvas.height * 2 - 1);

        return vec2(x, y);
    }

    // Handle mouse down events
    window.addEventListener("mousedown", (event) => {

        if (!editing)
            // This is the first control point of a curve
            curve = new Curve();

        curve.type = type;

        curve.add_point(get_pos_from_mouse_event(canvas, event));
        points++;

        editing = true;
        tracking = true;

        last_x = event.offsetX;
        last_y = event.offsetY;
    });

    // Handle mouse move events
    window.addEventListener("mousemove", (event) => {
        if (!tracking)
            return;

        const dx = event.offsetX - last_x;
        const dy = event.offsetY - last_y;

        if (dx * dx + dy * dy > 100) {
            curve.add_point(get_pos_from_mouse_event(canvas, event));
            last_x = event.offsetX;
            last_y = event.offsetY;
            points++;
        }

        moved = true;
    });

    // Handle mouse up events
    window.addEventListener("mouseup", (event) => {
        tracking = false;

        if (moved) {
            moved = false;
            finish_curve();
        }
    });

    resize(window);

    gl.clearColor(0.0, 0.0, 0.0, 1);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    //gl.blendFunc(gl.ONE, gl.ONE);

    // look up the elements we want to affect
    var pointsElement = document.querySelector("#points");
    var curvesElement = document.querySelector("#curves");
    var stepsElement = document.querySelector("#steps");
    var speedElement = document.querySelector("#speed");

    // Create text nodes to save some time for the browser.
    pointsNode = document.createTextNode("");
    curvesNode = document.createTextNode("");
    stepsNode = document.createTextNode("");
    speedNode = document.createTextNode("");


    // Add those text nodes where they need to go
    pointsElement.appendChild(pointsNode);
    curvesElement.appendChild(curvesNode);
    stepsElement.appendChild(stepsNode);
    speedElement.appendChild(speedNode);

    window.requestAnimationFrame(animate);
}

let start;

function animate(timestamp) {
    window.requestAnimationFrame(animate);

    if (start === undefined) {
        start = timestamp;
    }
    const elapsed = timestamp - start;


    pointsNode.nodeValue = points;
    stepsNode.nodeValue = steps;
    curvesNode.nodeValue = curves.length;   // 2 decimal places
    speedNode.nodeValue = speed.toFixed(4);   // 2 decimal places

    if (clear_color)
        gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(draw_program);

    // Go through each curve
    for (const c of curves) {
        c.draw(gl, draw_program, steps, display_mode);
        if (playing) {
            let dt = speed * elapsed / 1000;
            if (!forward) dt *= -1.0;
            c.update(dt);
        }
    }
    if (curve != null)
        curve.draw(gl, draw_program, steps, display_mode);

    gl.useProgram(null);

    start = timestamp;
}

loadShadersFromURLS(["shader1.vert", "shader1.frag"]).then(shaders => setup(shaders))