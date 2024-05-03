import {
  booleans,
  geometries,
  primitives,
  maths,
  modifiers,
  transforms,
  measurements,
} from "@jscad/modeling";
import { stlSerializer } from "@jscad/io";
import type { Geom3 } from "@jscad/modeling/src/geometries/types";
import { Vec3 } from "@jscad/modeling/src/maths/vec3";

import QuickHull, { isPointInsideHull } from "quickhull3d/dist/QuickHull";

export const exportToSTL = (
  geomArray: Geom3[],
  size: Vec3,
  center: Vec3,
  group = false
) => {
  const cuboid = primitives.cuboid({
    center,
    size,
  });

  let totalVolume = 0;
  const filterGeom = geomArray.filter((geom) => {
    const volume = measurements.measureVolume(geom);
    totalVolume += volume;
    return volume > 1;
  });

  console.log("volume fraction = " + totalVolume / 40 ** 3);
  const stlData = group;
  stlSerializer.serialize({ binary: true }, [filterGeom, cuboid]);

  download(stlData);
};

const download = (content: any) => {
  const blob = new Blob(content, { type: "application/stl" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;
  link.download = "sample.stl";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

  //@ts-ignore
  return modifiers.generalize(
    { simplify: true, snap: true, triangulate: true },
    ...newGeometries
  ) as Geom3[];
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

export const mergeCloseVertices = (
  geometry: Geom3,
  tolerance: number
): Geom3 | undefined => {
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

  return rebuildWithConvexHull(vertices);
};

export const removeIntersectionBetweenGeometries = (
  geom: Geom3,
  geomArray: Geom3[]
) => {
  return booleans.subtract(geom, ...geomArray);
};
export const createBoundingBoxCuboid = (geom: Geom3) => {
  const tolerance = 0.001;
  const [min, max] = measurements.measureBoundingBox(geom);
  const size: Vec3 = [
    Math.abs(max[0] - min[0]) + tolerance,
    Math.abs(max[1] - min[1]) + tolerance,
    Math.abs(max[2] - min[2]) + tolerance,
  ];
  const center: Vec3 = [
    min[0] + (size[0] - tolerance) / 2,
    min[1] + (size[1] - tolerance) / 2,
    min[2] + (size[2] - tolerance) / 2,
  ];
  return transforms.translate(center, primitives.cuboid({ size: size }));
};

export const rebuildWithConvexHull = (input: Geom3 | Vec3[]) => {
  const vertices: Vec3[] =
    "polygons" in input
      ? input.polygons.map((polygon) => polygon.vertices).flat()
      : input;

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
