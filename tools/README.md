# Tools

## `figma_brandbook_to_pdf.py`

Exports top-level `FRAME` nodes from a Figma file into a single PDF and produces a size-optimized output.

### Requirements

- `FIGMA_TOKEN` environment variable (Figma Personal Access Token)

### Usage

```bash
python3 tools/figma_brandbook_to_pdf.py --compress
```

### Common options

- `--file-key` (default: `RE80iGfQWE0KX3jfLxCcp8`)
- `--start-node-id` (default: `188-1792`, will be converted to `188:1792` for the API)
- `--out` (default: `/opt/cursor/artifacts/invitro-brand-guidelines.pdf`)
- `--workdir` (default: `/tmp/figma_brandbook_export`)

