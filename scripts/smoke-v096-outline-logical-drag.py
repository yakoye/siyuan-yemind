"""Compatibility entry for the current outline/right-logical drag regression.

The v0.9.6 smoke encoded the earlier neutral-gap behavior where no guide was
shown. The current interaction intentionally keeps a continuous green parent
guide and uses nearest-node local zones. Delegate to the current superset so
this historical command remains a valid release gate.
"""
from pathlib import Path
import runpy

runpy.run_path(
    str(Path(__file__).with_name("smoke-v097-nearest-logical-drag.py")),
    run_name="__main__",
)
