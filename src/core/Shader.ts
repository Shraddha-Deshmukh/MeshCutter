/**
 * Thin wrapper around a WebGLProgram. Caches uniform locations and exposes
 * typed setters. Uniforms are looked up lazily on first set.
 */

import type { Mat3 } from "../math/Mat3";
import type { Mat4 } from "../math/Mat4";
import type { Vec3 } from "../math/Vec3";

export class Shader {
  readonly program: WebGLProgram;
  private readonly gl: WebGL2RenderingContext;
  private readonly uniformLocs = new Map<string, WebGLUniformLocation | null>();
  private readonly attribLocs = new Map<string, number>();

  constructor(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ) {
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link failed: ${info}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.program = program;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  getAttribLocation(name: string): number {
    let loc = this.attribLocs.get(name);
    if (loc === undefined) {
      loc = this.gl.getAttribLocation(this.program, name);
      this.attribLocs.set(name, loc);
    }
    return loc;
  }

  private loc(name: string): WebGLUniformLocation | null {
    if (this.uniformLocs.has(name)) return this.uniformLocs.get(name) ?? null;
    const l = this.gl.getUniformLocation(this.program, name);
    this.uniformLocs.set(name, l);
    return l;
  }

  setMat4(name: string, m: Mat4): void {
    const l = this.loc(name);
    if (l) this.gl.uniformMatrix4fv(l, false, m);
  }

  setMat3(name: string, m: Mat3): void {
    const l = this.loc(name);
    if (l) this.gl.uniformMatrix3fv(l, false, m);
  }

  setVec3(name: string, v: Vec3): void {
    const l = this.loc(name);
    if (l) this.gl.uniform3f(l, v.x, v.y, v.z);
  }

  setFloat(name: string, v: number): void {
    const l = this.loc(name);
    if (l) this.gl.uniform1f(l, v);
  }

  setInt(name: string, v: number): void {
    const l = this.loc(name);
    if (l) this.gl.uniform1i(l, v);
  }
}

const compile = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(
      `Shader compile failed (${type === gl.VERTEX_SHADER ? "vs" : "fs"}): ${info}\n${source}`,
    );
  }
  return shader;
};
