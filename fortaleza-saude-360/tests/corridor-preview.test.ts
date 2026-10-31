import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { parseCorridorImage, type CorridorMinutes } from "@/lib/corridor-preview";

it("as três imagens reais têm caixa comum, PNG íntegro e pixels cumulativos", () => {
  const meta = JSON.parse(readFileSync("public/data/corridor-preview.json", "utf8"));
  let count = 0;
  for (const minutes of [10, 20, 30] as CorridorMinutes[]) {
    const raw = meta.images.find((image: { minutes: number }) => image.minutes === minutes);
    const image = parseCorridorImage(raw, minutes);
    const bytes = readFileSync(`public${image.file}`);
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(bytes.length).toBe(image.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(image.sha256);
    expect(bytes.readUInt32BE(16)).toBe(image.width);
    expect(bytes.readUInt32BE(20)).toBe(image.height);
    expect(image.bbox).toEqual(meta.images[0].bbox);
    expect(raw.included_pixels).toBeGreaterThan(count);
    count = raw.included_pixels;
    expect(() => parseCorridorImage({ ...raw, file: "https://example.invalid/pixel.png" }, minutes)).toThrow();
    expect(() => parseCorridorImage({ ...raw, width: 100000 }, minutes)).toThrow();
  }
  expect(meta.max_pixel_size_m).toBe(12);
});
