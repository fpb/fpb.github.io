import { vec2, vec4, add, scale } from '../../../libs/MV.js';

const max_sample_points = 60000;

export const B_SPLINE = 1;
export const CATMULL_ROM = 2;
export const BEZIER = 3;
export class Curve {
    /** Creates a new cubic B-Spline curve  */

    static #vao = null;

    #points;
    #velocities;
    #type;
    #color;
    #base_vel;
    #pt_size;

    static init(gl, program) {
        let indices = [];

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        for (let i = 0; i <= max_sample_points; i++)
            indices.push(i);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

        Curve.#vao = gl.createVertexArray();

        gl.bindVertexArray(Curve.#vao);
        const a_idx = gl.getAttribLocation(program, "a_idx");
        gl.vertexAttribIPointer(a_idx, 1, gl.UNSIGNED_INT, false, 0, 0);
        gl.enableVertexAttribArray(a_idx);
        gl.bindVertexArray(null);
    }

    constructor(gl) {
        this.#points = [];
        this.#velocities = [];
        this.#color = this.random_color();
        this.#type = B_SPLINE;
        this.#base_vel = this.random_velocity(0.5);
        this.#pt_size = Math.random() * 25.0 + 25.0;
    }

    get n_points() {
        return this.#points.length;
    }

    /**
     * @param {any} t
     */
    set type(t) {
        this.#type = t;
    }

    at(i) {
        return this.#points[i];
    }

    random_color() {
        return vec4(Math.random() * 0.9 + 0.1,
            Math.random() * 0.9 + 0.1,
            Math.random() * 0.9 + 0.1,
            Math.random() * 0.1 + 0.1);
    }
    random_velocity(scale) {
        function random_speed_comp() {
            const amp = 0.5;
            return Math.random() * amp - amp / 2;
        }
        return vec2(scale * random_speed_comp(), scale * random_speed_comp());
    }

    add_point(pt) {
        this.#points.push(pt);

        const vel = this.random_velocity(0.1);
        this.#velocities.push(add(vel, this.#base_vel));
    }

    update_point(i, dt) {
        const oldpt = this.at(i);

    }

    finish() {
        const vx = this.#points[this.n_points - 1][0] - this.#points[0][0];
        const vy = this.#points[this.n_points - 1][1] - this.#points[0][1];
    }

    draw(gl, program, n_steps, what) {
        if (this.n_points < 4) return;

        // Send the curve type
        const u_type = gl.getUniformLocation(program, "u_type");
        gl.uniform1ui(u_type, this.#type);

        // Send the color
        const u_color = gl.getUniformLocation(program, "u_color");
        gl.uniform4fv(u_color, this.#color);

        // Send the point size
        const u_pt_size = gl.getUniformLocation(program, "u_pt_size");
        gl.uniform1f(u_pt_size, this.#pt_size);

        // Send the number of steps per segment
        const u_n_steps = gl.getUniformLocation(program, "u_n_steps");
        gl.uniform1ui(u_n_steps, n_steps);

        // Send the number of control points
        const u_n_points = gl.getUniformLocation(program, "u_n_points");
        gl.uniform1ui(u_n_points, this.n_points);

        // Send the actual control points
        for (let i = 0; i < this.n_points; i++) {
            const u_Pi = gl.getUniformLocation(program, "u_P[" + i + "]");
            let pt = this.at(i);
            gl.uniform2f(u_Pi, pt[0], pt[1]);
        }

        const u_point = gl.getUniformLocation(program, "u_point");

        gl.bindVertexArray(Curve.#vao);

        let npts;

        if (this.#type == B_SPLINE || this.#type == CATMULL_ROM)
            npts = n_steps * (this.n_points - 3) + 1;
        else npts = n_steps * (Math.floor((this.n_points - 1) / 3)) + 1
        if (what & 1) {
            gl.uniform1ui(u_point, 1);
            gl.drawArrays(gl.POINTS, 0, npts);
        }
        if (what & 2) {
            gl.uniform1ui(u_point, 0);
            gl.drawArrays(gl.LINE_STRIP, 0, npts);
        }
        gl.bindVertexArray(null);
    }

    update(dt) {
        // Update the control points
        if (this.n_points < 4) return;

        for (let i = 0; i < this.n_points; i++) {
            this.#points[i] = add(this.#points[i], scale(dt, this.#velocities[i]));

            if (this.#points[i][0] > 1.0 || this.#points[i][0] < -1.0)
                this.#velocities[i][0] = -this.#velocities[i][0];
            if (this.#points[i][1] > 1.0 || this.#points[i][1] < -1.0)
                this.#velocities[i][1] = -this.#velocities[i][1];
        }
    }

    debug() {
        console.log(`Curve ${this} has ${this.n_points}`);
        for (const p of this.#points) {
            console.log(`point at ${p[0]}, ${p[1]}`);
        }
    }

};