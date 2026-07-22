"""Compatibility entry for the current tree-drag regression.

The original v0.9.5 canvas expectations used a neutral gap with no guide and
small edge hotspots. v0.9.7 intentionally replaced that interaction with a
continuous candidate-parent guide and nearest-node local drop zones. Keep this
historical command useful by delegating to the current superset regression.
"""
from pathlib import Path
import runpy

runpy.run_path(
    str(Path(__file__).with_name("smoke-v097-nearest-logical-drag.py")),
    run_name="__main__",
)
