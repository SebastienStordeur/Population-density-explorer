import * as d3 from "d3";
import { LatLng } from "leaflet";
import { FC, memo, useRef, useEffect } from "react";
import { useMap } from "react-leaflet";

interface GeoJsonFeature {
  geometries: d3.GeoGeometryObjects[];
  geometry: {
    coordinates: number[][][];
    type: string;
  };
  id: number;
  properties: {
    NAME: string;
    ISO_3_CODE: string;
    ISO_2_CODE: string;
    AREA: string;
    NAME_1: string;
    [key: string]: string;
  };
  type: string;
}

interface GeoData {
  type: string;
  properties: {
    [key: string]: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

interface Data {
  country: string;
  population?: number;
  density?: number | null;
  temperature?: number | null;
}

interface LayerProps {
  geoData: {
    type: string;
    features: GeoJsonFeature[];
  };
  data: Data[];
  type: DataProperty;
}

type DataProperty = "temperature" | "density" | "population";

const Layer: FC<LayerProps> = ({ geoData, data, type }) => {
  const map = useMap();
  const d3Container = useRef<SVGSVGElement | null>(null);

  function getDatas(feature: GeoData): number {
    const countryData = data.find((d: any) => d.country === feature.properties.NAME);
    return countryData && countryData[type] ? +countryData[type]! : 0;
  }

  useEffect(() => {
    function updateLayer() {
      const svg = d3.select(d3Container.current);
      const transform = d3.geoTransform({
        point: function (x, y) {
          const point = map.latLngToLayerPoint(new LatLng(y, x));
          this.stream.point(point.x, point.y);
        },
      });

      const d3Path = d3.geoPath().projection(transform);
      const displayableDatas = data.map((t) => t[type]).filter((desiredData): desiredData is number => desiredData !== null);
      const maxData = d3.quantile(displayableDatas.sort(d3.ascending), 0.85) || 0; //TODO ADJUST value
      const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([0, maxData]);

      const update = svg.selectAll("path").data(geoData.features);
      update
        .enter()
        .append("path")
        .attr("fill", (geoData: GeoData) => {
          const color = colorScale(getDatas(geoData));
          return color;
        });

      function updatePaths() {
        update.attr("d", (d) => d3Path(d));
      }

      map.on("moveend", updatePaths);
      updatePaths();

      return () => {
        map.off("moveend", updatePaths);
      };
    }
    updateLayer();
  }, []);

  return <svg ref={d3Container} className="layer" />;
};

export default memo(Layer);
