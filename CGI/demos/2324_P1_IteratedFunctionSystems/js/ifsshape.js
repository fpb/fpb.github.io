export  { IFSShape } ;

import { vec2, flatten, sizeof } from "../../../libs/MV.js"

class IFSShape {
    /**
     * Creates a new IfsShape object with the specified number of points.
     * @constructor
     * @param {number} n - The number of points to generate.
     */
    constructor(gl, n, params) {
        this.gl = gl;
        this.n = n;
        this.points = null;

        this.bufferA = null;    // The current state, meant to be drawn and to serve as input to the next iteration
        this.bufferB = null;    // The iterated new state

        this.iterations = 0;    // The number of iterations so far

        this.params = { m: params.m, p: params.p };

        this.reset();
    }

    reset() {
        this.iterations = 0;
        this.points = Array(3*this.n).fill().map( () => Math.random());
        this.init(this.gl);
    }

    init() {

        const gl = this.gl;

        // Create the A buffer
        this.bufferA = gl.createBuffer();
        // Fill the A buffer with the points data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferA);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.DYNAMIC_COPY);

        // Create the B buffer
        this.bufferB = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferB);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.DYNAMIC_COPY);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Create the transform feedback object
        this.tf = gl.createTransformFeedback();
    }

    destroy() {
        /** @type{WebGL2RenderingContext} */
        const gl = this.gl;

        if(this.bufferA) gl.deleteBuffer(this.bufferA);
        if(this.bufferB) gl.deleteBuffer(this.bufferB);
        this.bufferA = null;
        this.bufferB = null;

        gl.deleteTransformFeedback(this.tf);
    }

    iterate(program, end_iteration) {

        const gl = this.gl;

        if( this.iterations >= end_iteration )
            return;

        gl.useProgram(program);

        for(let i=0; i<this.params.m.length; i++) {
            const uM = gl.getUniformLocation(program, "m[" + i + "]");
            gl.uniformMatrix3fv(uM, false, flatten(this.params.m[i]));

            const uP = gl.getUniformLocation(program, "p[" + i + "]");
            gl.uniform1f(uP, this.params.p[i]);
        }

        const uNfuncs = gl.getUniformLocation(program, "nfuncs");
        gl.uniform1i(uNfuncs, this.params.p.length);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferA);
        const positionLoc = gl.getAttribLocation(program, "position");
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 12, 0);
        gl.enableVertexAttribArray(positionLoc);

        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.tf);

        // no need to call the fragment shader
        gl.enable(gl.RASTERIZER_DISCARD);

        // bind the buffers to the transform feedback
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.bufferB);

        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, this.n);
        gl.endTransformFeedback();

        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

        // turn on using fragment shaders again
        gl.disable(gl.RASTERIZER_DISCARD);

        // Swap the buffers
        const temp = this.bufferA;
        this.bufferA = this.bufferB;
        this.bufferB = temp;

        this.iterations++;
    }

    draw(program) {
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferA);

        const positionLoc = gl.getAttribLocation(program, "position");
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 12, 0);
        gl.enableVertexAttribArray(positionLoc);

        const hueLoc = gl.getAttribLocation(program, "in_hue");
        gl.vertexAttribPointer(hueLoc, 1, gl.FLOAT, false, 12, 8);
        gl.enableVertexAttribArray(hueLoc);

        //gl.useProgram(program);
        gl.drawArrays(gl.POINTS, 0, this.n);
    }
}
