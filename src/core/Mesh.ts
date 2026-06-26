/**
 * GPU-side mesh: owns a VAO with position/normal buffers and a world transform.
 * Geometry can be replaced at any time via `setGeometry`; the buffers grow as
 * needed. Each Mesh has a colour and an "isPart" flag used by the CutManager
 * to distinguish original objects from cut fragments.
 */

import { m4Identity, m4Translation, type Mat4 } from "../math/Mat4";
import type { Vec3 } from "../math/Vec3";
import { v3 } from "../math/Vec3";
import type { Geometry } from "../geometry/Geometry";
import { geometryBounds } from "../geometry/Geometry";

let __nextMeshId = 1;

export class Mesh {
  readonly id: number;
  readonly gl: WebGL2RenderingContext;
  geometry: Geometry;
  position: Vec3 = v3(0, 0, 0);
  color: Vec3 = v3(0.78, 0.82, 0.9);
  visible = true;
  /** True for cut fragments (drag-targets). False for original primitives. */
  isPart = false;

  private vao: WebGLVertexArrayObject;
  private positionBuffer: WebGLBuffer;
  private normalBuffer: WebGLBuffer;
  private vertexCount: number;

  private readonly modelMatrix: Mat4 = m4Identity();

  constructor(gl: WebGL2RenderingContext, geometry: Geometry) {
    this.id = __nextMeshId++;
    this.gl = gl;
    this.geometry = geometry;

    const vao = gl.createVertexArray();
    const pbuf = gl.createBuffer();
    const nbuf = gl.createBuffer();
    if (!vao || !pbuf || !nbuf) throw new Error("Failed to allocate mesh GL objects");
    this.vao = vao;
    this.positionBuffer = pbuf;
    this.normalBuffer = nbuf;
    this.vertexCount = geometry.positions.length / 3;
    this.uploadGeometry();
  }

  /** Replace geometry and re-upload to GPU. Used by MeshCutter for new parts. */
  setGeometry(geometry: Geometry): void {
    this.geometry = geometry;
    this.vertexCount = geometry.positions.length / 3;
    this.uploadGeometry();
  }

  /** Centre the geometry around its own bounds — used so cut parts pivot
   *  around their own centroid rather than the original mesh origin. */
  recenterGeometry(): void {
    const b = geometryBounds(this.geometry);
    const cx = b.center.x;
    const cy = b.center.y;
    const cz = b.center.z;
    const p = this.geometry.positions;
    for (let i = 0; i < p.length; i += 3) {
      p[i] -= cx;
      p[i + 1] -= cy;
      p[i + 2] -= cz;
    }
    // shift mesh world position so vertices end up at the same world coords
    this.position = {
      x: this.position.x + cx,
      y: this.position.y + cy,
      z: this.position.z + cz,
    };
    this.uploadGeometry();
  }

  /** Build & cache the world matrix. Currently translation-only. */
  getModelMatrix(): Mat4 {
    m4Translation(this.position, this.modelMatrix);
    return this.modelMatrix;
  }

  bind(): void {
    this.gl.bindVertexArray(this.vao);
  }

  draw(): void {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.normalBuffer);
    gl.deleteVertexArray(this.vao);
  }

  private uploadGeometry(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.geometry.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.geometry.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }
}
