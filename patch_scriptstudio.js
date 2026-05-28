const fs = require('fs');
const file = 'src/components/workspace/ScriptStudio.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add state variables for mass selection and modal
const stateVars = `
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [generationModal, setGenerationModal] = useState<{
    isOpen: boolean;
    selectedIds: {script: any, rowIdx: number, cells: string[]}[];
    quantity: number;
    useBrandColors: boolean;
    userNotes: string;
  } | null>(null);
`;
code = code.replace(/const \[rowNotes, setRowNotes\] = useState<Record<string, string>>\(\{\}\);/, "const [rowNotes, setRowNotes] = useState<Record<string, string>>({});\n" + stateVars);

// 2. Modify execute function to use modal
const executeGeneration = `
  const handleOpenGenModal = (script: any, rowIdx: number, cells: string[]) => {
    setGenerationModal({
      isOpen: true,
      selectedIds: [{script, rowIdx, cells}],
      quantity: 1,
      useBrandColors: false,
      userNotes: ''
    });
  };

  const handleOpenMassGenModal = () => {
    // Find all selected rows
    const selectedData: {script: any, rowIdx: number, cells: string[]}[] = [];
    filteredScripts.forEach(s => {
      const parsed = parseTableRows(s.content);
      parsed.forEach((row, rIdx) => {
        if (selectedRows.includes(\`\${s.id}_row\${rIdx}\`)) {
          selectedData.push({ script: s, rowIdx: rIdx, cells: row });
        }
      });
    });
    if (selectedData.length === 0) return;
    setGenerationModal({
      isOpen: true,
      selectedIds: selectedData,
      quantity: 1,
      useBrandColors: false,
      userNotes: ''
    });
  };

  const confirmGeneration = async () => {
    if (!generationModal) return;
    setGenerationModal({...generationModal, isOpen: false});
    const { selectedIds, quantity, useBrandColors, userNotes } = generationModal;

    for (const item of selectedIds) {
      // Small delay to prevent rate limit
      await new Promise(r => setTimeout(r, 1000));
      
      const finalNotes = (useBrandColors ? "Используй брендовые цвета. " : "") + userNotes;
      const prevNotes = rowNotes[\`\${item.script.id}_row\${item.rowIdx}\`] || '';
      
      const combinedNotes = finalNotes ? \`\${prevNotes}\\n\${finalNotes}\`.trim() : prevNotes;

      setIsGeneratingImage({ scriptId: item.script.id, rowIdx: item.rowIdx, action: 'add' });
      try {
        const designBrief = item.cells[item.cells.length - 1] || '';
        const scriptText = item.cells.join('\\n');
        
        const res = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: id,
            scriptId: \`\${item.script.id}_row\${item.rowIdx}\`,
            cells: item.cells,
            scriptText,
            designBrief,
            avatarName: item.script.avatarName,
            productName: item.script.productName || project?.name,
            action: 'add',
            count: quantity,
            userNotes: combinedNotes,
            logoUrl: project?.logoUrl,
            logoPosition: project?.logoPosition
          })
        });

        const data = await res.json();
        if (!res.ok) {
          alert('Ошибка для строки: ' + data.error);
          continue;
        }

        const newRowImages = item.script.rowImages || {};
        newRowImages[item.rowIdx] = [...(newRowImages[item.rowIdx] || []), ...data.urls];

        const newScripts = [...scripts];
        const sIdx = newScripts.findIndex(s => s.id === item.script.id);
        if (sIdx !== -1) {
          newScripts[sIdx] = { ...newScripts[sIdx], rowImages: newRowImages };
          setScripts(newScripts);
          localStorage.setItem(\`projectScripts_\${id}\`, JSON.stringify(newScripts));
        }
      } catch (err: any) {
        console.error(err);
      }
    }
    setIsGeneratingImage(null);
    setSelectedRows([]); // clear selection
  };
`;
code = code.replace(/const parseTableRows =/, executeGeneration + '\n  const parseTableRows =');

// 3. Update the handleGenerateRowImage usages to use the modal instead
code = code.replace(/<button[^>]*onClick=\{\(\) => handleGenerateRowImage\(script, dataRowIdx, row\)\}[^>]*>([\s\S]*?)<\/button>/g, '<button onClick={() => handleOpenGenModal(script, dataRowIdx, row)} disabled={isAnyGen} style={{ display: \'flex\', alignItems: \'center\', gap: \'0.4rem\', padding: \'0.4rem 0.8rem\', fontSize: \'0.75rem\', fontWeight: 600, background: \'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)\', color: \'white\', border: \'none\', borderRadius: \'6px\', cursor: isAnyGen ? \'not-allowed\' : \'pointer\', opacity: isAnyGen ? 0.6 : 1 }}>$1</button>');

// 4. Update table headers to include checkbox
code = code.replace(/gridTemplateColumns: headerRow\.length === 4 \? '60px 1\.25fr 2fr 3\.5fr' : headerRow\.length === 3 \? '1\.25fr 2fr 3\.5fr' : `repeat\(\$\{headerRow\.length\}, 1fr\)`/g, 
  "gridTemplateColumns: headerRow.length === 4 ? '40px 60px 1.25fr 2fr 3.5fr' : headerRow.length === 3 ? '40px 1.25fr 2fr 3.5fr' : `40px repeat(${headerRow.length}, 1fr)`");

const headerCheckbox = `
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
`;
code = code.replace(/<div key=\{cIdx\} style=\{\{ padding: '0\.75rem 1rem'/, headerCheckbox + "\n                          <div key={cIdx} style={{ padding: '0.75rem 1rem'");

// 5. Update data row layout
code = code.replace(/<div style=\{\{ display: 'grid', gridTemplateColumns: headerRow\.length === 4 \? '60px 1\.25fr 2fr 3\.5fr' : headerRow\.length === 3 \? '1\.25fr 2fr 3\.5fr' : `repeat\(\$\{headerRow\.length\}, 1fr\)`/g,
  "<div style={{ display: 'grid', gridTemplateColumns: headerRow.length === 4 ? '40px 60px 1.25fr 2fr 3.5fr' : headerRow.length === 3 ? '40px 1.25fr 2fr 3.5fr' : `40px repeat(${headerRow.length}, 1fr)`");

const rowCheckbox = `
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
`;
code = code.replace(/<div key=\{cIdx\} style=\{\{ padding: '1rem', fontSize: '0\.9rem'/, rowCheckbox + "\n                                <div key={cIdx} style={{ padding: '1rem', fontSize: '0.9rem'");


// 6. Add modal and floating action bar at the bottom
const modalHTML = `
      {/* Floating Action Bar */}
      {selectedRows.length > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: 'white', padding: '1rem 2rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 50 }}>
          <span style={{ fontWeight: 600 }}>Выбрано креативов: {selectedRows.length}</span>
          <button onClick={handleOpenMassGenModal} style={{ background: '#3b82f6', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '99px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ImageIcon size={18} />
            Сгенерировать выбранные
          </button>
        </div>
      )}

      {/* Generation Modal */}
      {generationModal?.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '500px', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: '#1e293b' }}>
              Настройки генерации ({generationModal.selectedIds.length} шт.)
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Количество вариантов (каждого)</label>
                <span style={{ fontWeight: 800, color: '#3b82f6' }}>{generationModal.quantity}</span>
              </div>
              <input 
                type="range" min="1" max="4" 
                value={generationModal.quantity} 
                onChange={e => setGenerationModal({...generationModal, quantity: parseInt(e.target.value)})}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
                <input 
                  type="checkbox" 
                  checked={generationModal.useBrandColors}
                  onChange={e => setGenerationModal({...generationModal, useBrandColors: e.target.checked})}
                />
                Использовать брендовые цвета (из параметров)
              </label>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                Уточнения для ИИ (опционально)
              </label>
              <textarea 
                placeholder="Например: светлый фон, минималистичный стиль, фотореализм..."
                value={generationModal.userNotes}
                onChange={e => setGenerationModal({...generationModal, userNotes: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '80px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setGenerationModal(null)}
                style={{ padding: '0.75rem 1.5rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button 
                onClick={confirmGeneration}
                style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ImageIcon size={18} />
                Начать генерацию
              </button>
            </div>
          </div>
        </div>
      )}
`;
code = code.replace(/<style jsx global>/, modalHTML + "\n      <style jsx global>");

fs.writeFileSync(file, code);
