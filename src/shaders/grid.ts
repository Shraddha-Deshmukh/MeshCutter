/**
 * Procedural grid floor — renders on a screen-aligned XZ quad that's large
 * enough to look infinite. Two grid frequencies (minor + major lines) fade
 * out with distance for a clean look.
 */

export const GRID_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;

uniform mat4 u_view;
uniform mat4 u_proj;

out vec3 v_worldPos;

void main() {
  // a_position is already in world space — quad is fixed at y = 0
  v_worldPos = a_position;
  gl_Position = u_proj * u_view * vec4(a_position, 1.0);
}
`;

export const GRID_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 v_worldPos;

uniform vec3 u_cameraPos;

out vec4 outColor;

float gridLine(vec2 coord, float spacing, float thickness) {
  vec2 g = abs(fract(coord / spacing - 0.5) - 0.5) / fwidth(coord / spacing);
  float line = min(g.x, g.y);
  return 1.0 - smoothstep(0.0, thickness, line);
}

void main() {
  vec2 c = v_worldPos.xz;

  float minor = gridLine(c, 1.0, 1.0) * 0.35;
  float major = gridLine(c, 5.0, 1.2) * 0.55;
  float axisX = (1.0 - smoothstep(0.0, fwidth(c.y) * 1.5, abs(c.y))) * 0.6;
  float axisZ = (1.0 - smoothstep(0.0, fwidth(c.x) * 1.5, abs(c.x))) * 0.6;

  float dist = length(u_cameraPos.xz - c);
  float falloff = 1.0 - smoothstep(20.0, 60.0, dist);

  vec3 lineCol = vec3(0.55, 0.62, 0.78);
  vec3 axisRed = vec3(1.0, 0.35, 0.45);
  vec3 axisBlu = vec3(0.4, 0.7, 1.0);

  vec3 col = lineCol * (minor + major);
  col += axisRed * axisZ;       // X axis runs along Z = 0 (red)... we flip below
  col += axisBlu * axisX;       // Z axis runs along X = 0 (blue)

  float alpha = clamp((minor + major + axisX + axisZ) * falloff, 0.0, 0.85);
  if (alpha < 0.001) discard;
  outColor = vec4(col, alpha);
}
`;
