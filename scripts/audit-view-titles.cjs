const fs = require('fs');
const path = require('path');
function walk(d, out = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/View\.tsx$/.test(f.name)) out.push(p);
  }
  return out;
}
for (const f of walk('src/components')) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const idx = lines.findIndex((l) => /<h[123][ >]/.test(l));
  const rootCls = lines.findIndex((l) => /return \(/.test(l));
  console.log(
    path.basename(f).padEnd(30),
    idx >= 0 ? `L${idx + 1} ${lines[idx].trim().slice(0, 100)}` : 'AUCUN TITRE',
    '| lignes:', lines.length
  );
}
