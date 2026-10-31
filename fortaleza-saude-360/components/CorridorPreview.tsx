"use client";

import { useEffect, useState } from "react";
import { project, type ProjectionParams } from "@/lib/geo";
import { parseCorridorImage, type CorridorImage, type CorridorMinutes } from "@/lib/corridor-preview";

export function CorridorPreview({ minutes, projection, labelX, labelY, unit }: { minutes: CorridorMinutes; projection: ProjectionParams; labelX: number; labelY: number; unit: number }) {
  const [image, setImage] = useState<{ descriptor: CorridorImage; url: string } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      try {
        const response = await fetch("/data/manifest.json", { signal: controller.signal, credentials: "omit" });
        if (!response.ok) throw new Error("manifesto");
        const manifest = await response.json();
        const descriptor = parseCorridorImage(manifest.corridor_preview?.images?.find((item: { minutes: number }) => item.minutes === minutes), minutes);
        const png = await fetch(descriptor.file, { signal: controller.signal, credentials: "omit" });
        if (!png.ok) throw new Error("download");
        const bytes = await png.arrayBuffer();
        if (bytes.byteLength !== descriptor.bytes) throw new Error("tamanho");
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const sha = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
        if (sha !== descriptor.sha256 || new Uint8Array(bytes)[0] !== 137) throw new Error("checksum");
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
        setImage({ descriptor, url: objectUrl });
      } catch { if (!controller.signal.aborted) setError(true); }
    }
    void load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [minutes]);
  if (error || !image || image.descriptor.minutes !== minutes) return <g className="corridor-message" role={error ? "alert" : "status"}>
    <text x={labelX} y={labelY} fontSize={12 * unit}>{error ? "Falha ao carregar corredores." : "Carregando corredores…"}</text>
    {error ? <text x={labelX} y={labelY + 18 * unit} fontSize={11 * unit}>Desative e ative a camada para repetir.</text> : null}
  </g>;
  const bbox = image.descriptor.bbox;
  const [x, y] = project(projection, [bbox[0], bbox[3]]);
  const [right, bottom] = project(projection, [bbox[2], bbox[1]]);
  return <g className="corridor-image" role="img" aria-label={`Corredores modelados de até ${minutes} minutos a 4,8 km/h; base de UAPS, aproximação visual`}>
    <image data-corridor-minutes={minutes} href={image.url} x={x} y={y} width={right - x} height={bottom - y} preserveAspectRatio="none" onError={() => setError(true)} />
  </g>;
}
