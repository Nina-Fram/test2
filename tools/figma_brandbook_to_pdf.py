#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Optional

import requests
from pypdf import PdfReader, PdfWriter


FIGMA_API = "https://api.figma.com/v1"


class FigmaError(RuntimeError):
    pass


@dataclass(frozen=True)
class ExportNode:
    id: str
    name: str
    x: Optional[float]
    y: Optional[float]


def _env(name: str) -> Optional[str]:
    v = os.getenv(name)
    return v.strip() if v and v.strip() else None


def _node_id_from_urlish(s: str) -> str:
    # Figma node-id is commonly written as "188-1792" in URLs, API expects "188:1792".
    return s.replace("-", ":")


def figma_get(session: requests.Session, path: str, *, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{FIGMA_API}{path}"
    last_err: Optional[Exception] = None
    for i in range(5):
        try:
            r = session.get(url, params=params, timeout=180)
            if r.status_code >= 400:
                raise FigmaError(f"Figma API {r.status_code} for {url}: {r.text[:500]}")
            return r.json()
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            last_err = e
            time.sleep(1.5 * (2**i))
    raise FigmaError(f"Figma API request failed after retries for {url}") from last_err


def iter_children(node: dict[str, Any]) -> Iterable[dict[str, Any]]:
    children = node.get("children")
    if isinstance(children, list):
        for c in children:
            if isinstance(c, dict):
                yield c


def find_page_containing_node(file_doc: dict[str, Any], target_node_id: str) -> Optional[dict[str, Any]]:
    doc = file_doc.get("document", {})
    for page in iter_children(doc):
        if page.get("type") != "CANVAS":
            continue
        if _contains_node_recursive(page, target_node_id):
            return page
    return None


def _contains_node_recursive(node: dict[str, Any], target_node_id: str) -> bool:
    if node.get("id") == target_node_id:
        return True
    for child in iter_children(node):
        if _contains_node_recursive(child, target_node_id):
            return True
    return False


def collect_top_level_frames(page: dict[str, Any]) -> list[ExportNode]:
    out: list[ExportNode] = []
    for child in iter_children(page):
        if child.get("type") != "FRAME":
            continue
        bb = child.get("absoluteBoundingBox") or {}
        x = bb.get("x") if isinstance(bb, dict) else None
        y = bb.get("y") if isinstance(bb, dict) else None
        out.append(
            ExportNode(
                id=str(child.get("id")),
                name=str(child.get("name") or ""),
                x=float(x) if isinstance(x, (int, float)) else None,
                y=float(y) if isinstance(y, (int, float)) else None,
            )
        )
    return out


def sort_nodes_reading_order(nodes: list[ExportNode]) -> list[ExportNode]:
    if any(n.x is not None and n.y is not None for n in nodes):
        # Primarily sort by Y then X for reading order on a page-like canvas.
        return sorted(
            nodes,
            key=lambda n: (
                1 if (n.y is None or n.x is None) else 0,
                n.y if n.y is not None else 0.0,
                n.x if n.x is not None else 0.0,
                n.name.lower(),
                n.id,
            ),
        )
    return nodes


def chunked(xs: list[str], n: int) -> Iterable[list[str]]:
    for i in range(0, len(xs), n):
        yield xs[i : i + n]


def download_with_retries(url: str, out_path: Path, *, attempts: int = 4) -> None:
    last_err: Optional[Exception] = None
    for i in range(attempts):
        try:
            with requests.get(url, stream=True, timeout=120) as r:
                r.raise_for_status()
                out_path.parent.mkdir(parents=True, exist_ok=True)
                with out_path.open("wb") as f:
                    for chunk in r.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)
            return
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1.5 * (2**i))
    raise RuntimeError(f"Failed to download after {attempts} attempts: {url}") from last_err


def merge_pdfs(input_paths: list[Path], out_path: Path) -> None:
    writer = PdfWriter()
    for p in input_paths:
        reader = PdfReader(str(p))
        for page in reader.pages:
            writer.add_page(page)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("wb") as f:
        writer.write(f)


def try_compress_pdf(in_path: Path, out_path: Path, *, preset: str = "/ebook") -> bool:
    gs = shutil.which("gs")
    if not gs:
        return False
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        gs,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={preset}",
        "-dNOPAUSE",
        "-dBATCH",
        "-dQUIET",
        f"-sOutputFile={str(out_path)}",
        str(in_path),
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return out_path.exists() and out_path.stat().st_size > 0
    except Exception:  # noqa: BLE001
        return False


def try_qpdf_linearize(in_path: Path, out_path: Path) -> bool:
    qpdf = shutil.which("qpdf")
    if not qpdf:
        return False
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [qpdf, "--linearize", str(in_path), str(out_path)]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return out_path.exists() and out_path.stat().st_size > 0
    except Exception:  # noqa: BLE001
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Export a Figma brandbook (frames) to a single optimized PDF.")
    parser.add_argument("--file-key", default=_env("FIGMA_FILE_KEY") or "RE80iGfQWE0KX3jfLxCcp8")
    parser.add_argument("--start-node-id", default=_env("FIGMA_START_NODE_ID") or "188-1792")
    parser.add_argument("--out", default=_env("OUT_PDF") or "/opt/cursor/artifacts/invitro-brand-guidelines.pdf")
    parser.add_argument("--workdir", default=_env("WORKDIR") or "/tmp/figma_brandbook_export")
    parser.add_argument("--depth", type=int, default=int(_env("FIGMA_FILE_DEPTH") or "4"))
    parser.add_argument("--compress", action="store_true", default=True)
    args = parser.parse_args()

    token = _env("FIGMA_TOKEN")
    if not token:
        print("Missing FIGMA_TOKEN env var.", file=sys.stderr)
        return 2

    file_key = args.file_key
    start_node_id = _node_id_from_urlish(args.start_node_id)

    session = requests.Session()
    session.headers.update({"X-Figma-Token": token})

    file_doc = figma_get(session, f"/files/{file_key}", params={"depth": args.depth})
    page = find_page_containing_node(file_doc, start_node_id)
    if not page:
        # Fallback: export all pages.
        pages = [p for p in iter_children(file_doc.get("document", {})) if p.get("type") == "CANVAS"]
        if not pages:
            raise FigmaError("No pages (CANVAS) found in file document.")
        target_pages = pages
    else:
        target_pages = [page]

    nodes: list[ExportNode] = []
    for p in target_pages:
        page_nodes = sort_nodes_reading_order(collect_top_level_frames(p))
        nodes.extend(page_nodes)

    if not nodes:
        raise FigmaError("No top-level FRAME nodes found to export.")

    ids = [n.id for n in nodes]
    workdir = Path(args.workdir)
    pdf_dir = workdir / "pdf"
    pdf_dir.mkdir(parents=True, exist_ok=True)

    id_to_url: dict[str, str] = {}
    # Smaller batches are more reliable for large files (export URLs generation can be slow).
    for batch in chunked(ids, 10):
        resp = figma_get(
            session,
            f"/images/{file_key}",
            params={
                "ids": ",".join(batch),
                "format": "pdf",
                "use_absolute_bounds": "true",
            },
        )
        images = resp.get("images") or {}
        if not isinstance(images, dict):
            continue
        for k, v in images.items():
            if isinstance(k, str) and isinstance(v, str) and v:
                id_to_url[k] = v

    missing = [i for i in ids if i not in id_to_url]
    if missing:
        raise FigmaError(f"Missing export URLs for {len(missing)} node(s). Example: {missing[0]}")

    input_pdfs: list[Path] = []
    for idx, node in enumerate(nodes, start=1):
        url = id_to_url[node.id]
        safe_name = "".join(ch if ch.isalnum() or ch in (" ", "-", "_") else "_" for ch in node.name).strip()[:60]
        filename = f"{idx:03d}_{safe_name or node.id.replace(':','-')}.pdf"
        out_path = pdf_dir / filename
        if not (out_path.exists() and out_path.stat().st_size > 0):
            download_with_retries(url, out_path)
        input_pdfs.append(out_path)

    requested_out = Path(args.out)
    tmp_merged = workdir / "merged_raw.pdf"
    merge_pdfs(input_pdfs, tmp_merged)

    # Always prefer delivering a compressed PDF to keep it lightweight.
    final_out = requested_out
    final_compressed = requested_out.with_name(requested_out.stem + "_compressed.pdf")

    delivered_path = tmp_merged
    if args.compress:
        # Try /ebook first, fall back to /screen if still very large.
        tmp_ebook = workdir / "merged_ebook.pdf"
        ebook_ok = try_compress_pdf(tmp_merged, tmp_ebook, preset="/ebook")
        if ebook_ok:
            delivered_path = tmp_ebook
            if tmp_ebook.stat().st_size > 80 * 1024 * 1024:
                tmp_screen = workdir / "merged_screen.pdf"
                if try_compress_pdf(tmp_merged, tmp_screen, preset="/screen"):
                    delivered_path = tmp_screen

        # Linearize for faster viewing/downloading where supported.
        tmp_linear = workdir / "merged_linearized.pdf"
        if try_qpdf_linearize(delivered_path, tmp_linear):
            delivered_path = tmp_linear

    # Copy final outputs.
    final_out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(delivered_path, final_out)

    # Also write a separate explicitly-named compressed copy for convenience.
    final_compressed.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(final_out, final_compressed)

    print(f"OUT={final_out} size_bytes={final_out.stat().st_size}")
    print(f"OUT_COMPRESSED={final_compressed} size_bytes={final_compressed.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

