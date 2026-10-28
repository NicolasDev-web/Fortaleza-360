import hashlib
import json
from pathlib import Path

import pytest

from scripts.generate_manifest import generate_manifest, write_manifest

SOURCE_FILES = {
    "facilities": "uaps.geojson",
    "upas": "upas.geojson",
    "hospitals": "hospitals.geojson",
    "neighborhoods": "neighborhoods.geojson",
    "municipal-boundary": "municipal-boundary.geojson",
}

DEMO_PROPERTIES = {
    "facilities": {"id": "demo-1", "name": "UAPS DEMO"},
    "upas": {"id": "upa-demo", "type": "UPA"},
    "hospitals": {"id": "hospital-demo", "type": "HOSPITAL"},
    "neighborhoods": {"code": "DEMO", "name": "Bairro DEMO"},
    "municipal-boundary": {"id": 1, "nome": "Município DEMO"},
}


def _write_fixtures(
    raw_dir: Path,
    public_dir: Path,
    properties: dict[str, dict[str, object]] = DEMO_PROPERTIES,
) -> None:
    raw_dir.mkdir()
    public_dir.mkdir()
    for index, (layer_id, source_file) in enumerate(SOURCE_FILES.items(), start=1):
        (public_dir / f"{layer_id}.geojson").write_text(
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
                            "properties": properties[layer_id],
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


def test_every_public_layer_has_source_license_and_checksum(tmp_path: Path) -> None:
    raw_dir = tmp_path / "raw"
    public_dir = tmp_path / "public"
    _write_fixtures(raw_dir, public_dir)

    manifest = generate_manifest(
        raw_dir,
        public_dir,
        generated_at="2026-10-27T19:00:00Z",
    )
    output_path = public_dir / "manifest.json"
    write_manifest(manifest, output_path)

    assert manifest["mode"] == "official"
    assert manifest["notice"]
    assert {layer["id"] for layer in manifest["layers"]} == set(SOURCE_FILES)
    for layer in manifest["layers"]:
        file_bytes = (public_dir / f"{layer['id']}.geojson").read_bytes()
        assert layer["sha256"] == hashlib.sha256(file_bytes).hexdigest()
        assert layer["title"]
        assert layer["source"]["license"]
        assert layer["source"]["terms_url"].startswith("https://")
        assert layer["source"]["page_url"]
        assert layer["source"]["catalog_updated_at"] or layer["source"].get(
            "catalog_update_note"
        )
        assert layer["limitations"]
        assert set(layer["dictionary"]) == set(layer["properties"])
        assert all(layer["dictionary"].values())
    assert json.loads(output_path.read_text(encoding="utf-8")) == manifest


def test_undocumented_property_blocks_manifest(tmp_path: Path) -> None:
    raw_dir = tmp_path / "raw"
    public_dir = tmp_path / "public"
    properties = {
        **DEMO_PROPERTIES,
        "facilities": {"id": "demo-1", "campo_demo_sem_dicionario": "DEMO"},
    }
    _write_fixtures(raw_dir, public_dir, properties)

    with pytest.raises(ValueError, match="campo_demo_sem_dicionario"):
        generate_manifest(raw_dir, public_dir, generated_at="2026-10-27T19:00:00Z")
