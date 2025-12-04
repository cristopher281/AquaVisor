#!/usr/bin/env node
/*
  migrate-ml-to-l.js

  Script de migración seguro para convertir valores almacenados en mililitros (mL)
  a litros (L) dentro de los archivos JSON en `server/data`.

  Uso:
    node migrate-ml-to-l.js           # modo preview (no aplica cambios)
    node migrate-ml-to-l.js --apply   # aplicar cambios (hace backup)
    node migrate-ml-to-l.js --apply --threshold=500  # umbral en mL
    node migrate-ml-to-l.js --apply --force         # forzar conversión sin umbral

  Comportamiento:
  - Detecta claves comunes: caudal_min, total_acumulado, caudal, total, *_ml
  - Si el valor numérico es mayor que --threshold (default 1000) se divide por 1000
    y se redondea a 3 decimales.
  - En modo --apply realiza backup del archivo con sufijo `.bak.TIMESTAMP`.
  - Imprime un reporte con archivos y conteos de cambios.

*/

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opts = {
  apply: args.includes('--apply'),
  force: args.includes('--force'),
  threshold: 1000,
};

for (const a of args) {
  if (a.startsWith('--threshold=')) {
    const v = parseFloat(a.split('=')[1]);
    if (!isNaN(v)) opts.threshold = v;
  }
}

const dataDir = path.join(__dirname, 'data');
const targetKeys = new Set([
  'caudal_min',
  'total_acumulado',
  'caudal',
  'total',
  'flow_ml',
  'volume_ml',
  'total_ml',
  'caudal_ml',
]);

function isNumeric(n) {
  return typeof n === 'number' && isFinite(n);
}

function shouldConvert(key, value) {
  if (!isNumeric(value)) return false;
  if (opts.force) return targetKeys.has(key) || /_ml$/.test(key);
  if (targetKeys.has(key) || /_ml$/.test(key)) {
    // Convierte sólo si el valor parece estar en mL (umbral)
    return Math.abs(value) >= opts.threshold;
  }
  return false;
}

function traverseAndConvert(obj, stats, pathParts = []) {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => traverseAndConvert(v, stats, pathParts.concat([`[${i}]`] )));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const fullPath = pathParts.concat([key]).join('.');
      if (isNumeric(val) && shouldConvert(key, val)) {
        const old = val;
        const converted = +(val / 1000).toFixed(3);
        obj[key] = converted;
        stats.changes.push({ path: fullPath, key, old, new: converted });
      } else if (typeof val === 'object' && val !== null) {
        traverseAndConvert(val, stats, pathParts.concat([key]));
      }
    }
  }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    return { file: filePath, error: 'JSON parse error' };
  }
  const stats = { file: filePath, changes: [] };
  traverseAndConvert(data, stats);
  return { file: filePath, data, stats };
}

function backupFile(filePath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = `${filePath}.bak.${ts}`;
  fs.copyFileSync(filePath, dest);
  return dest;
}

function main() {
  if (!fs.existsSync(dataDir)) {
    console.error('No existe el directorio data:', dataDir);
    process.exit(1);
  }
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No se encontraron archivos JSON en', dataDir);
    return;
  }

  const results = [];
  for (const f of files) {
    const filePath = path.join(dataDir, f);
    const res = processFile(filePath);
    results.push(res);
  }

  // Report preview
  let totalChanges = 0;
  console.log('\nResumen de migración (preview):');
  for (const r of results) {
    if (r.error) {
      console.log('-', path.basename(r.file), '->', r.error);
      continue;
    }
    const count = r.stats.changes.length;
    totalChanges += count;
    console.log(`- ${path.basename(r.file)}: ${count} cambio(s)`);
    if (count > 0 && count <= 10) {
      r.stats.changes.forEach(c => console.log(`   * ${c.path}: ${c.old} -> ${c.new}`));
    } else if (count > 10) {
      console.log('   * (muestra) ', r.stats.changes.slice(0,5).map(c => `${c.path}: ${c.old} -> ${c.new}`).join('; '));
    }
  }
  console.log(`Total cambios detectados: ${totalChanges}`);

  if (!opts.apply) {
    console.log('\nModo PREVIEW. Ejecuta con --apply para aplicar cambios.');
    return;
  }

  // Apply changes with backups
  for (const r of results) {
    if (r.error) continue;
    if (r.stats.changes.length === 0) continue;
    const orig = r.file;
    const bak = backupFile(orig);
    fs.writeFileSync(orig, JSON.stringify(r.data, null, 2), 'utf8');
    console.log(`Escrito ${path.basename(orig)} (backup: ${path.basename(bak)}) - ${r.stats.changes.length} cambio(s)`);
  }
  console.log('\nMigración completada. Revisa backups en el mismo directorio con sufijo .bak.TIMESTAMP');
}

main();
