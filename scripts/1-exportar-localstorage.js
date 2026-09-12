// Rode no console (F12) com o sistema HTML aberto.
// Baixa um arquivo backup-rhdp.json com tudo que ja foi lancado.
(() => {
  const K = 'nutrimax_rhdp_imperatriz_v2';
  const raw = localStorage.getItem(K);
  if (!raw) { console.error('Nada encontrado na chave ' + K); return; }
  const b = new Blob([raw], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'backup-rhdp.json';
  a.click();
  const d = JSON.parse(raw);
  console.table(Object.fromEntries(
    Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v])
  ));
})();
