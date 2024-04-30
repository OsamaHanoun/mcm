import {
  booleans,
  geometries,
  primitives,
  maths,
  measurements,
  hulls,
} from "@jscad/modeling";
import { stlSerializer } from "@jscad/io";
import { Geom3, Poly3 } from "@jscad/modeling/src/geometries/types";
import { Vec3 } from "@jscad/modeling/src/maths/vec3";

import QuickHull from "quickhull3d/dist/QuickHull";

export const exportToSTL = (geometries: Geom3[], size: Vec3, center: Vec3) => {
  const cuboid = primitives.cuboid({
    center,
    size,
  });

  const stlData1 = stlSerializer.serialize({ binary: false }, [
    booleans.scission(geometries),
    cuboid,
  ]);

  // const stlData2 = stlSerializer.serialize({ binary: false }, cuboid)[0];

  console.log(stlData1[0]);
};

export const removeGeometriesOutsideCuboid = (
  geometries: Geom3[],
  size: Vec3,
  center: Vec3
) => {
  const cuboid = primitives.cuboid({ center, size });
  const newGeometries: Geom3[] = geometries.map((geom) => {
    const intersectionGeom = booleans.intersect(cuboid, geom);
    return intersectionGeom;
  });

  return newGeometries;
};

export const createGeometry = (
  vertices: number[],
  indices: number[]
): Geom3 => {
  const polygons = convertToPolygons(vertices, indices);
  return geometries.geom3.create(polygons);
};

const convertToPolygons = (vertices: number[], indices: number[]) => {
  let polygons = [];

  for (let i = 0; i < indices.length; i += 3) {
    const points = [
      maths.vec3.fromValues(
        vertices[indices[i] * 3],
        vertices[indices[i] * 3 + 1],
        vertices[indices[i] * 3 + 2]
      ),
      maths.vec3.fromValues(
        vertices[indices[i + 2] * 3],
        vertices[indices[i + 2] * 3 + 1],
        vertices[indices[i + 2] * 3 + 2]
      ),
      maths.vec3.fromValues(
        vertices[indices[i + 1] * 3],
        vertices[indices[i + 1] * 3 + 1],
        vertices[indices[i + 1] * 3 + 2]
      ),
    ];

    polygons.push(geometries.poly3.fromPoints(points));
  }
  return polygons;
};

const hashVertex = (vertex: Vec3, tolerance: number) => {
  const scaled = maths.vec3.scale(maths.vec3.create(), vertex, 1 / tolerance);
  return `${Math.floor(scaled[0])},${Math.floor(scaled[1])},${Math.floor(
    scaled[2]
  )}`;
};

export const mergeVertices = (geometry: Geom3, tolerance: number): Vec3[] => {
  const vertices: Vec3[] = [];
  const hashTable: Map<string, number[]> = new Map<string, number[]>();

  geometries.geom3.toPolygons(geometry).forEach((polygon) => {
    polygon.vertices.map((vertex) => {
      const key = hashVertex(vertex, tolerance);
      const value = hashTable.get(key);

      if (value) {
        for (let i = 0; i < value.length; i++) {
          const existedVertex = vertices[value[i]];

          if (maths.vec3.distance(existedVertex, vertex) < tolerance) {
            return value[i]; // return existing vertex index
          }
        }
      }

      // No close vertex found, add new one
      vertices.push(vertex);

      if (!value) {
        hashTable.set(key, []);
      }

      const newVertexIndex = vertices.length - 1;
      hashTable.get(key)?.push(newVertexIndex);
    });
  });

  return vertices;
};

export const rebuildWithConvexHull = (geom: Geom3) => {
  const vertices: Vec3[] = geom.polygons
    .map((polygon) => polygon.vertices)
    .flat();

  if (vertices.length > 3) {
    const quickHull = new QuickHull(vertices);
    quickHull.build();
    const verticesHull = quickHull.vertices.map((vertex: any) => vertex.point);
    const facesHull = quickHull.collectFaces();
    const polygonsHull = facesHull.map((face: number[]) =>
      geometries.poly3.create(face.map((idx: number) => verticesHull[idx]))
    );

    return geometries.geom3.create(polygonsHull);
  }
};
