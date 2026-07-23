"""Historical entry retained; v0.9.10 supersedes row-gradient midpoint guides.

Run the current single-layer guide and bidirectional reveal smoke so legacy
release workflows continue to exercise the strongest outline contract.
"""
from pathlib import Path
from runpy import run_path

run_path(str(Path(__file__).with_name('smoke-v0910-outline-guides-sync.py')), run_name='__main__')
