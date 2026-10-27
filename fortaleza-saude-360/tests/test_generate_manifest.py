import hashlib
import json
from pathlib import Path

from scripts.generate_manifest import generate_manifest, write_manifest

SOURCE_FILES = {
    "facilities": "uaps.geojson",
    "neighborhoods": "neighborhoods.geojson",
    "municipal-boundary": "municipal-boundary.geojson",
}


def test_every_public_layer_has_source_license_and_checksum(tmp_path: Path) -> None:
    raw_dir = tmp_path / "raw"
    public_dir = tmp_path / "public"
    raw_dir.mkdir()
    public_dir.mkdir()

    for index, (layer_id, source_file) in enumerate(SOURCE_FILES.items(), start=1):
        public_file = public_dir / f"{layer_id}.geojson"
        public_file.write_text(
            json.dumps(
                {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "geometry": {
                                "type": "Point",
                                "coordinates": [-38.5, -3.8],
                            },
                            "properties": {"id": f"demo-{index}"},
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        metadata = {
            "source_id": index,
            "organization": "DEMO",
            "reference_year": 2026,
            "page_url": f"https://example.invalid/{index}",
            "download_url": f"https://example.invalid/{index}.geojson",
            "collected_at": "2026-10-27T18:00:00Z",
            "sha256": "raw-demo",
            "license": "DEMO — atribuição obrigatória",
            "attribution": "Fonte DEMO",
        }
        (raw_dir / f"{source_file}.metadata.json").write_text(
            json.dumps(metadata),
            encoding="utf-8",
        )

    manifest = generate_manifest(
        raw_dir,
        public_dir,
        generated_at="2026-10-27T19:00:00Z",
    )
    output_path = public_dir / "manifest.json"
    write_manifest(manifest, output_path)

    assert {layer["id"] for layer in manifest["layers"]} == set(SOURCE_FILES)
    for layer in manifest["layers"]:
        file_bytes = (public_dir / f"{layer['id']}.geojson").read_bytes()
        assert layer["sha256"] == hashlib.sha256(file_bytes).hexdigest()
        assert layer["source"]["license"]
        assert layer["source"]["page_url"]
        assert layer["limitations"]
    assert json.loads(output_path.read_text(encoding="utf-8")) == manifest
