export type CorridorMinutes = 10 | 20 | 30;
export type CorridorImage = { file: string; sha256: string; bytes: number; minutes: CorridorMinutes; width: number; height: number; bbox: [number, number, number, number] };

export function parseCorridorImage(value: unknown, minutes: CorridorMinutes): CorridorImage {
  const image = value as CorridorImage;
  if (!image || image.file !== `/data/corridor-central-${minutes}.png` || image.minutes !== minutes || !/^[a-f0-9]{64}$/.test(image.sha256) || !Number.isInteger(image.bytes) || image.bytes <= 0 || image.bytes > 3 * 1024 * 1024 || ![image.width, image.height].every(n => Number.isInteger(n) && n > 0 && n <= 4096) || !Array.isArray(image.bbox) || image.bbox.length !== 4 || !image.bbox.every(Number.isFinite) || image.bbox[0] >= image.bbox[2] || image.bbox[1] >= image.bbox[3] || Math.max(Math.abs(image.bbox[0]), Math.abs(image.bbox[2])) > 180 || Math.max(Math.abs(image.bbox[1]), Math.abs(image.bbox[3])) > 90) throw new Error("Imagem dos corredores inválida.");
  return image;
}
