// Expand an HTML table's rowspan/colspan geometry without assigning semantic labels.
// Research-only helper: never treats expanded cells as verified racer metrics.
export function expandTableGrid(tableHtml) {
  if (typeof tableHtml !== 'string' || tableHtml.length > 2_000_000) throw Error('invalid_html');
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const grid = [];
  for (let ri = 0; ri < rows.length; ri++) {
    const line = grid[ri] ?? (grid[ri] = []);
    const cells = [...rows[ri][1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
    let col = 0;
    for (const cell of cells) {
      while (line[col] !== undefined) col++;
      const attr = cell[2];
      const getSpan = name => {
        const match = attr.match(new RegExp('\\b' + name + '\\s*=\\s*["\\\']?(\\d+)', 'i'));
        const n = match ? Number(match[1]) : 1;
        if (!Number.isInteger(n) || n < 1 || n > 100) throw Error('invalid_' + name);
        return n;
      };
      const rowspan = getSpan('rowspan'), colspan = getSpan('colspan');
      const value = { tag: cell[1].toLowerCase(), html: cell[3], originRow: ri, originCol: col };
      for (let r = ri; r < ri + rowspan; r++) {
        const target = grid[r] ?? (grid[r] = []);
        for (let c = col; c < col + colspan; c++) {
          if (target[c] !== undefined) throw Error('overlapping_cells');
          target[c] = value;
        }
      }
      col += colspan;
    }
  }
  const width = Math.max(0, ...grid.map(row => row.length));
  if (width > 100 || grid.length > 500) throw Error('table_too_large');
  if (grid.some(row => row.length !== width || row.some(cell => cell === undefined))) throw Error('incomplete_grid');
  return grid;
}
