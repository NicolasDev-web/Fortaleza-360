"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildBasemapStyle, hasWebGL, type Camera } from "@/lib/basemap";

export type BasemapStatus = "loading" | "ready" | "failed" | "unsupported";

const LOAD_TIMEOUT_MS = 15000;
let protocolRegistered = false;

type BasemapProps = {
  camera: Camera;
  onStatusChange: (status: BasemapStatus) => void;
};

/**
 * Ruas do OpenStreetMap sob o mapa SVG. Não recebe eventos: o SVG continua
 * dono do enquadramento e a câmera daqui só o acompanha. Sem WebGL ou com
 * falha dos tiles, o componente some e o SVG segue sozinho.
 */
export function Basemap({ camera, onStatusChange }: BasemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cameraRef = useRef(camera);
  const statusRef = useRef(onStatusChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    cameraRef.current = camera;
    statusRef.current = onStatusChange;
  });

  useEffect(() => {
    if (!hasWebGL()) {
      statusRef.current("unsupported");
      return;
    }

    let active = true;
    let map: MapLibreMap | null = null;
    let loaded = false;
    statusRef.current("loading");

    const fail = () => {
      if (!active) return;
      active = false;
      window.clearTimeout(timeout);
      map?.remove();
      mapRef.current = null;
      setReady(false);
      statusRef.current("failed");
    };
    const timeout = window.setTimeout(fail, LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const [maplibregl, { Protocol }] = await Promise.all([
          import("maplibre-gl"),
          import("pmtiles"),
        ]);
        if (!active || !containerRef.current) return;
        if (!protocolRegistered) {
          // O MapLibre 6 resolve o worker por URL dinâmica, que o bundler não segue.
          maplibregl.setWorkerUrl(
            new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
          );
          maplibregl.addProtocol("pmtiles", new Protocol().tile);
          protocolRegistered = true;
        }

        const instance = new maplibregl.Map({
          container: containerRef.current,
          style: buildBasemapStyle(window.location.origin),
          ...cameraRef.current,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
        });
        map = instance;
        mapRef.current = instance;
        instance.on("load", () => {
          if (!active) return;
          loaded = true;
          window.clearTimeout(timeout);
          instance.jumpTo(cameraRef.current);
          setReady(true);
          statusRef.current("ready");
        });
        // Antes de carregar, qualquer erro derruba o basemap; depois, só os dos tiles
        // (glyph ausente, por exemplo, apenas omite um rótulo).
        instance.on("error", (event) => {
          const sourceId = (event as { sourceId?: string }).sourceId;
          if (!loaded || sourceId === "protomaps") fail();
        });
      } catch {
        fail();
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(timeout);
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  const [lon, lat] = camera.center;
  useEffect(() => {
    mapRef.current?.jumpTo({ center: [lon, lat], zoom: camera.zoom });
  }, [lon, lat, camera.zoom]);

  return (
    <div aria-hidden="true" className={`basemap${ready ? " is-ready" : ""}`} ref={containerRef} />
  );
}

export function BasemapCredit({ status }: { status: BasemapStatus | null }) {
  if (status === "ready") {
    return (
      <p className="basemap-credit">
        Ruas:{" "}
        <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">
          © colaboradores do OpenStreetMap
        </a>{" "}
        (ODbL) ·{" "}
        <a href="https://protomaps.com" rel="noreferrer" target="_blank">
          Protomaps
        </a>
      </p>
    );
  }
  if (status === "failed" || status === "unsupported") {
    return (
      <p className="basemap-credit is-fallback" role="status">
        Mapa de ruas indisponível; exibindo os contornos oficiais.
      </p>
    );
  }
  return null;
}
