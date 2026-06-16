"""Static front-end assets and the transport-neutral :mod:`studio_api` layer.

This package doubles as the deployable web root: the GitHub Pages build publishes
this directory as-is (Pyodide fetches ``studio_api.py`` at runtime), and the
local server in :mod:`hijrical_studio.server` serves the same files.
"""
