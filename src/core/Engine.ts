/**
 * Now we render the engine — owns the GL context, manages canvas resize,
 * compiles the standard programs, and draws a Scene every frame.
 */

import { m3Create, m3NormalFromMat4 } from "../math/Mat3";
import type { Scene } from "./Scene";
import { Shader } from "./Shader";
import { PHONG_FRAG, PHONG_VERT } from "../shaders/phong";
import { GRID_FRAG, GRID_VERT } from "../shaders/grid";

export class Engine {
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;

  private readonly phong: Shader;
  private readonly grid: Shader;
  private readonly gridVAO: WebGLVertexArrayObject;
  private readonly normalMatrix = m3Create();

  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      throw new Error("WebGL2 is not supported in this browser");
    }
    this.gl = gl;

    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);
    // gl.cullFace(gl.BACK);
    // gl.frontFace(gl.CCW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.043, 0.051, 0.07, 1);

    this.phong = new Shader(gl, PHONG_VERT, PHONG_FRAG);
    this.grid = new Shader(gl, GRID_VERT, GRID_FRAG);

    // Big quad on Y = 0 in world space — covers the visible floor
    const s = 100;
    const verts = new Float32Array([
      -s, 0, -s,  s, 0, -s,  s, 0,  s,
      -s, 0, -s,  s, 0,  s, -s, 0,  s,
    ]);
    const vao = gl.createVertexArray();
    const buf = gl.createBuffer();
    if (!vao || !buf) throw new Error("Failed to alloc grid VAO");
    this.gridVAO = vao;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const w = Math.floor(this.canvas.clientWidth * this.dpr);
    const h = Math.floor(this.canvas.clientHeight * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Render one frame. */
  render(scene: Scene): void {
    const gl = this.gl;
    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    scene.camera.update(this.canvas.width, this.canvas.height);
    const eye = scene.camera.getEye();

    // ---- objects ----
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    //gl.enable(gl.CULL_FACE);

    this.phong.use();
    this.phong.setMat4("u_view", scene.camera.viewMatrix);
    this.phong.setMat4("u_proj", scene.camera.projMatrix);
    this.phong.setVec3("u_cameraPos", eye);
    this.phong.setVec3("u_lightDir", scene.lighting.direction);
    this.phong.setVec3("u_lightColor", scene.lighting.color);
    this.phong.setVec3("u_ambient", scene.lighting.ambient);
    this.phong.setFloat("u_shininess", 48);
    this.phong.setFloat("u_specularStrength", 0.35);

    for (const mesh of scene.meshes) {
      if (!mesh.visible) continue;
      const model = mesh.getModelMatrix();
      m3NormalFromMat4(model, this.normalMatrix);
      this.phong.setMat4("u_model", model);
      this.phong.setMat3("u_normalMatrix", this.normalMatrix);
      this.phong.setVec3("u_color", mesh.color);
      mesh.bind();
      mesh.draw();
    }

    // ---- grid ----
    //gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.depthMask(false); // grid is translucent — write color but not depth
    this.grid.use();
    this.grid.setMat4("u_view", scene.camera.viewMatrix);
    this.grid.setMat4("u_proj", scene.camera.projMatrix);
    this.grid.setVec3("u_cameraPos", eye);
    gl.bindVertexArray(this.gridVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    //gl.enable(gl.CULL_FACE);
  }
}
