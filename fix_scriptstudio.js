const fs = require('fs');

const file = 'src/components/workspace/ScriptStudio.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import React,")) {
  code = code.replace(/import \{ useState, useEffect \} from 'react';/, "import React, { useState, useEffect } from 'react';");
}

// Fix header
const badHeader = `<div style={{ padding: '0.75rem 1rem', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <input type="checkbox" style={{ cursor: 'pointer', width: '16px', height: '16px' }}
      onChange={(e) => {
        const rowIds = dataRows.map((_, i) => \`\${script.id}_row\${i}\`);
        if (e.target.checked) {
          setSelectedRows(prev => Array.from(new Set([...prev, ...rowIds])));
        } else {
          setSelectedRows(prev => prev.filter(id => !rowIds.includes(id)));
        }
      }}
      checked={dataRows.length > 0 && dataRows.every((_, i) => selectedRows.includes(\`\${script.id}_row\${i}\`))}
    />
  </div>

                          <div key={cIdx} style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: '#475569', borderRight: cIdx < headerRow.length - 1 ? '1px solid #e2e8f0' : 'none', textAlign: (headerRow.length === 4 && cIdx === 0) ? 'center' : 'left' }}>`;

const goodHeader = `<React.Fragment key={cIdx}>
  {cIdx === 0 && (
    <div style={{ padding: '0.75rem 1rem', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <input type="checkbox" style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        onChange={(e) => {
          const rowIds = dataRows.map((_, i) => \`\${script.id}_row\${i}\`);
          if (e.target.checked) {
            setSelectedRows(prev => Array.from(new Set([...prev, ...rowIds])));
          } else {
            setSelectedRows(prev => prev.filter(id => !rowIds.includes(id)));
          }
        }}
        checked={dataRows.length > 0 && dataRows.every((_, i) => selectedRows.includes(\`\${script.id}_row\${i}\`))}
      />
    </div>
  )}
  <div style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: '#475569', borderRight: cIdx < headerRow.length - 1 ? '1px solid #e2e8f0' : 'none', textAlign: (headerRow.length === 4 && cIdx === 0) ? 'center' : 'left' }}>`;

code = code.replace(badHeader, goodHeader);

// Fix row ending tag for header map
code = code.replace(
/                          <\/div>\n                        \}\)\}/g,
"                          </div>\n                          </React.Fragment>\n                        ))}"
);

// Fix data row
const badData = `<div style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
    <input type="checkbox" style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '4px' }}
      checked={selectedRows.includes(\`\${script.id}_row\${dataRowIdx}\`)}
      onChange={(e) => {
        const id = \`\${script.id}_row\${dataRowIdx}\`;
        if (e.target.checked) setSelectedRows(prev => [...prev, id]);
        else setSelectedRows(prev => prev.filter(r => r !== id));
      }}
    />
  </div>

                                <div key={cIdx} style={{ padding: '1rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, borderRight: cIdx < headerRow.length - 1 ? '1px solid #e2e8f0' : 'none', wordBreak: 'break-word', textAlign: (headerRow.length === 4 && cIdx === 0) ? 'center' : 'left' }}>`;

const goodData = `<React.Fragment key={cIdx}>
  {cIdx === 0 && (
    <div style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <input type="checkbox" style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '4px' }}
        checked={selectedRows.includes(\`\${script.id}_row\${dataRowIdx}\`)}
        onChange={(e) => {
          const id = \`\${script.id}_row\${dataRowIdx}\`;
          if (e.target.checked) setSelectedRows(prev => [...prev, id]);
          else setSelectedRows(prev => prev.filter(r => r !== id));
        }}
      />
    </div>
  )}
  <div style={{ padding: '1rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, borderRight: cIdx < headerRow.length - 1 ? '1px solid #e2e8f0' : 'none', wordBreak: 'break-word', textAlign: (headerRow.length === 4 && cIdx === 0) ? 'center' : 'left' }}>`;

code = code.replace(badData, goodData);

// Fix row ending tag for data map
code = code.replace(
/                                <\/div>\n                              \}\)\}/g,
"                                </div>\n                                </React.Fragment>\n                              ))}"
);


fs.writeFileSync(file, code);
