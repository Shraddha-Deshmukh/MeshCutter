/**
 * GLSL ES 3.00 sources kept as string literals. Each export pair gives a vertex
 * and fragment shader; the Shader class compiles & links them on demand.
 */

export const PHONG_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;
uniform mat3 u_normalMatrix;

out vec3 v_worldPos;
out vec3 v_normal;

void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  v_worldPos = world.xyz;
  v_normal = normalize(u_normalMatrix * a_normal);
  gl_Position = u_proj * u_view * world;
}
`;

export const PHONG_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;

uniform vec3 u_color;
uniform vec3 u_cameraPos;
uniform vec3 u_lightDir;     // direction light travels (sun → ground)
uniform vec3 u_lightColor;
uniform vec3 u_ambient;
uniform float u_shininess;
uniform float u_specularStrength;

out vec4 outColor;

void main() {
  // Normals on the cut "cap" come from the cutting plane, which may face
  // either way depending on viewing direction — flip so we always shade
  // the side the camera is looking at.
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_cameraPos - v_worldPos);
  if (dot(N, V) < 0.0) N = -N;

  vec3 L = normalize(-u_lightDir);
  vec3 H = normalize(L + V);

  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), u_shininess) * u_specularStrength;

  // simple hemispheric fill so shadowed areas don't go pitch black
  float hemi = 0.5 + 0.5 * N.y;
  vec3 fill = mix(vec3(0.05, 0.06, 0.08), vec3(0.10, 0.11, 0.14), hemi);

  vec3 color = u_color * (u_ambient + diff * u_lightColor + fill);
  color += spec * u_lightColor;

  // gamma
  color = pow(color, vec3(1.0 / 2.2));
  outColor = vec4(color, 1.0);
}
`;
