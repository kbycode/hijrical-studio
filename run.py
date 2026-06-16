#!/usr/bin/env python3
"""
Dev convenience launcher: ``python run.py`` (optionally ``--port N
--no-browser``).

It lets you run the studio straight from a clone without installing it. If the
``hijrical`` package isn't installed but a sibling source checkout exists
(``../hijrical/hijrical``), it is added to the path automatically.

For normal use after ``pip install hijrical-studio`` just run the
``hijrical-studio`` command or ``python -m hijrical_studio``.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # make the local `hijrical_studio` package importable

try:
    import hijrical  # noqa: F401
except ModuleNotFoundError:
    sibling = os.path.join(os.path.dirname(HERE), "hijrical")
    if os.path.isdir(os.path.join(sibling, "hijrical")):
        sys.path.insert(0, sibling)

from hijrical_studio.server import main  # noqa: E402

if __name__ == "__main__":
    main()
