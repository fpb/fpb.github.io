#version 300 es

#define MAX_CONTROL_POINTS  256

#define B_SPLINE 1u
#define CATMULL_ROM 2u
#define BEZIER 3u

// Type of curve
uniform uint u_type;

// Number of steps to draw each curve segment (used to compute the t value)
uniform uint u_n_steps;

// Size of points
uniform float u_pt_size;

// Control points
uniform vec2 u_P[MAX_CONTROL_POINTS];

// Number of actually used control points
uniform uint u_n_points;

// Index of the current point
in uint a_idx;

vec2 b_spline(uint idx_p0, float t) {
    uint idx_p1 = idx_p0 + 1u;
    uint idx_p2 = idx_p0 + 2u;
    uint idx_p3 = idx_p0 + 3u;

    float t2 = t * t;
    float t3 = t * t2;
    // Compute weights from blending functions
    float b0 = (-t3 + 3.0f * t2 - 3.0f * t + 1.0f) / 6.0f;
    float b1 = (3.0f * t3 - 6.0f * t2 + 4.0f) / 6.0f;
    float b2 = (-3.0f * t3 + 3.0f * t2 + 3.0f * t + 1.0f) / 6.0f;
    float b3 = t3 / 6.0f;

    return b0 * u_P[idx_p0] + b1 * u_P[idx_p1] + b2 * u_P[idx_p2] + b3 * u_P[idx_p3];
}

vec2 catmull_rom(uint idx_p0, float t) {
    uint idx_p1 = idx_p0 + 1u;
    uint idx_p2 = idx_p0 + 2u;
    uint idx_p3 = idx_p0 + 3u;

    float t2 = t * t;
    float t3 = t * t2;
    // Compute weights from blending functions
    float b0 = (-t3 + 2.0f * t2 - 1.0f * t) / 2.0f;
    float b1 = (3.0f * t3 - 5.0f * t2 + 2.0f) / 2.0f;
    float b2 = (-3.0f * t3 + 4.0f * t2 + t) / 2.0f;
    float b3 = (t3 - t2) / 2.0f;

    return b0 * u_P[idx_p0] + b1 * u_P[idx_p1] + b2 * u_P[idx_p2] + b3 * u_P[idx_p3];
}

vec2 bezier(uint idx_p0, float t) {
    uint idx_p1 = idx_p0 + 1u;
    uint idx_p2 = idx_p0 + 2u;
    uint idx_p3 = idx_p0 + 3u;

    float t2 = t * t;
    float t3 = t * t2;
    // Compute weights from blending functions
    float b0 = (-t3 + 3.0f * t2 - 3.0f * t + 1.0f);
    float b1 = (3.0f * t3 - 6.0f * t2 + 3.0f * t);
    float b2 = (-3.0f * t3 + 3.0f * t2);
    float b3 = t3;

    return b0 * u_P[idx_p0] + b1 * u_P[idx_p1] + b2 * u_P[idx_p2] + b3 * u_P[idx_p3];
}

void main() {

    vec2 pt;
    uint idx_p0;
    float t;

    switch(u_type) {
        case B_SPLINE:
            idx_p0 = a_idx / u_n_steps;
            t = float(a_idx % u_n_steps) / float(u_n_steps);
            pt = b_spline(idx_p0, t);
            break;
        case CATMULL_ROM:
            idx_p0 = a_idx / u_n_steps;
            t = float(a_idx % u_n_steps) / float(u_n_steps);
            pt = catmull_rom(idx_p0, t);
            break;
        case BEZIER:
            idx_p0 = 3u * (a_idx / u_n_steps);
            t = float(a_idx % u_n_steps) / float(u_n_steps);
            pt = bezier(idx_p0, t);
            break;
    }

    gl_Position = vec4(pt, 0.0f, 1.0f);

    gl_PointSize = u_pt_size;
}