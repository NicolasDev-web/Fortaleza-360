import hashlib
import json
import tempfile
import unittest
from io import BytesIO
from pathlib import Path

from scripts.fetch_data import download_source


class FakeResponse(BytesIO):
    def __init__(self, payload: bytes) -> None:
        super().__init__(payload)
        self.headers = {"Content-Type": "application/json"}


class FetchDataTests(unittest.TestCase):
    def test_writes_raw_file_checksum_and_audit_metadata(self) -> None:
        payload = b'{"type":"FeatureCollection","features":[]}'

        def opener(request, timeout):  # type: ignore[no-untyped-def]
            self.assertIn("api/v1/geojson?id=824", request.full_url)
            self.assertEqual(timeout, 7)
            return FakeResponse(payload)

        with tempfile.TemporaryDirectory() as temporary_directory:
            result = download_source(
                "uaps",
                Path(temporary_directory),
                timeout=7,
                opener=opener,
                collected_at="2026-10-27T18:00:00Z",
            )

            self.assertEqual(result.raw_path.read_bytes(), payload)
            self.assertEqual(
                result.sha256,
                hashlib.sha256(payload).hexdigest(),
            )
            self.assertEqual(
                result.checksum_path.read_text(encoding="utf-8"),
                f"{result.sha256}  uaps.geojson\n",
            )

            metadata = json.loads(result.metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(metadata["source_id"], 824)
            self.assertEqual(metadata["sha256"], result.sha256)
            self.assertEqual(metadata["bytes"], len(payload))
            self.assertEqual(metadata["collected_at"], "2026-10-27T18:00:00Z")
            self.assertIn("atribuição obrigatória", metadata["license"])

    def test_cnes_source_records_its_own_license(self) -> None:
        class FtpResponse(BytesIO):
            headers = None

        def opener(request, timeout):  # type: ignore[no-untyped-def]
            self.assertTrue(request.full_url.startswith("ftp://ftp.datasus.gov.br/"))
            return FtpResponse(b"DEMO")

        with tempfile.TemporaryDirectory() as temporary_directory:
            result = download_source(
                "cnes-ce",
                Path(temporary_directory),
                opener=opener,
                collected_at="2026-10-27T18:00:00Z",
            )
            metadata = json.loads(result.metadata_path.read_text(encoding="utf-8"))

        self.assertEqual(metadata["organization"], "DATASUS/MS")
        self.assertIn("DATASUS", metadata["license"])
        self.assertIn("CNES", metadata["attribution"])
        self.assertIsNone(metadata["content_type"])


if __name__ == "__main__":
    unittest.main()
