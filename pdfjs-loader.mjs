// PDF.js 6.5.438 legacy. Publicar con los dos archivos locales PDF.js.
// Siempre notifica el fin de la carga (correcto o erroneo) con evento propio.
const version = '6.5.438';
const localPdf = './pdfjs/pdf.min.mjs';
const localWorker = './pdfjs/pdf.worker.min.mjs';
const cdnBase = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + version + '/legacy/build/';
const attempt = new URL(import.meta.url).searchParams.get('attempt') || '1';
async function checkWorker(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (r.ok && !(r.headers.get('content-type') || '').toLowerCase().includes('text/html')) return;
  } catch (err) { /* Some WebView/proxies disallow HEAD. */ }
  // Try a small GET; servers may ignore Range and return the full file.
  const r = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
  if (!r.ok) throw new Error('Worker HTTP ' + r.status);
  const ct = (r.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/html')) throw new Error('Worker devolvio HTML y no JavaScript');
  await r.arrayBuffer();
}
async function run() {
  window.pdfjsLib = null;
  window.pdfjsSource = '';
  window.pdfjsWorkerURL = '';
  window.pdfjsLoadError = '';
  try {
    // Verificar ambos ficheros antes de elegir el origen local.
    await checkWorker(localWorker);
    const lib = await import(localPdf + '?attempt=' + attempt);
    if (lib.version !== version) throw new Error('Version API local distinta: ' + lib.version);
    window.pdfjsLib = lib;
    window.pdfjsSource = 'local';
    window.pdfjsWorkerURL = new URL(localWorker, import.meta.url).href;
  } catch (localError) {
    try {
      await checkWorker(cdnBase + 'pdf.worker.min.mjs');
      const lib = await import(cdnBase + 'pdf.min.mjs?attempt=' + attempt);
      if (lib.version !== version) throw new Error('Version API CDN distinta: ' + lib.version);
      window.pdfjsLib = lib;
      window.pdfjsSource = 'CDN (respaldo; no concluyente si bloqueado)';
      window.pdfjsWorkerURL = cdnBase + 'pdf.worker.min.mjs';
    } catch (cdnError) {
      window.pdfjsLoadError = 'Local: ' + String(localError) + '; CDN: ' + String(cdnError);
    }
  }
  window.dispatchEvent(new Event('pda-pdfjs-ready'));
}
run().catch(function(err) {
  window.pdfjsLoadError = 'Error inesperado: ' + String(err);
  window.dispatchEvent(new Event('pda-pdfjs-ready'));
});
