/* ============================================================
   boot.js -- pick the API backend, then let app.js take over.

   * If a live API server answers POST /api/ping -> server mode (fetch).
   * Otherwise (e.g. GitHub Pages) -> load Pyodide, micropip-install the real
     `hijrical` package from PyPI, and run `studio_api.handle` entirely in the
     browser. No backend, no build step -- works because hijrical is pure Python.
   ============================================================ */
(function () {
  "use strict";

  const PYODIDE_VERSION = "0.27.2";
  const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;

  function serverCall(name, body) {
    return fetch("/api/" + name, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(r => r.json());
  }

  function setStatus(msg) {
    const el = document.getElementById("bootStatus");
    if (el) el.textContent = msg;
  }
  function overlay(show) {
    const el = document.getElementById("bootOverlay");
    if (el) el.hidden = !show;
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.onload = resolve;
      s.onerror = () => reject(new Error("yüklenemedi: " + src));
      document.head.appendChild(s);
    });
  }

  async function bootPyodide() {
    overlay(true);
    setStatus("Python çalışma zamanı indiriliyor…");
    await loadScript(PYODIDE_URL);
    const pyodide = await loadPyodide();
    setStatus("hijrical paketi PyPI'dan kuruluyor…");
    await pyodide.loadPackage("micropip");
    await pyodide.runPythonAsync('import micropip\nawait micropip.install("hijrical>=1.3.0")');
    setStatus("API hazırlanıyor…");
    const src = await (await fetch("studio_api.py")).text();
    pyodide.FS.writeFile("studio_api.py", src);
    pyodide.runPython("import studio_api");
    window.__pyodide = pyodide;
    overlay(false);
    return function pyodideCall(name, body) {
      pyodide.globals.set("_hj_name", name);
      pyodide.globals.set("_hj_body", JSON.stringify(body || {}));
      const out = pyodide.runPython("studio_api.handle(_hj_name, _hj_body)");
      return Promise.resolve(JSON.parse(out));
    };
  }

  window.HJ_BACKEND_READY = (async function () {
    // Prefer a live API server if one is hosting us.
    try {
      const r = await fetch("/api/ping", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (r.ok) {
        const j = await r.json();
        if (j && j.ok) { window.HJ_CALL = serverCall; window.HJ_MODE = "server"; return "server"; }
      }
    } catch (_) { /* no server -> fall through to Pyodide */ }

    try {
      window.HJ_CALL = await bootPyodide();
      window.HJ_MODE = "pyodide";
      return "pyodide";
    } catch (e) {
      setStatus("Yüklenemedi: " + e.message + " — sayfayı yenilemeyi deneyin.");
      throw e;
    }
  })();
})();
