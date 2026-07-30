'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { NotebookPen, X } from 'lucide-react';

interface ProjectNotesWidgetProps {
  projectId: string;
}

export default function ProjectNotesWidget({ projectId }: ProjectNotesWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadNote() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setContent(data.content);
          setNoteId(data.id);
        }
      } catch (e) {
        console.warn('Failed to load notes', e);
      }
      setIsLoading(false);
    }
    
    if (projectId) {
      loadNote();
    }
  }, [projectId, supabase]);

  const saveNote = async (textToSave: string) => {
    setIsSaving(true);
    try {
      if (noteId) {
        await supabase
          .from('notes')
          .update({ content: textToSave, updated_at: new Date().toISOString() })
          .eq('id', noteId);
      } else {
        const { data } = await supabase
          .from('notes')
          .insert({
            project_id: projectId,
            content: textToSave,
          })
          .select()
          .single();
          
        if (data) {
          setNoteId(data.id);
        }
      }
    } catch (e) {
      console.warn('Failed to save note', e);
    }
    setIsSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newContent);
    }, 1000);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      fontFamily: 'inherit'
    }}>
      {isOpen && (
        <div style={{
          marginBottom: '16px',
          width: '320px',
          height: '384px',
          backgroundColor: '#FFF9C4',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #fef08a',
          animation: 'slideUp 0.2s ease-out forwards'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#fef08a',
            padding: '8px 12px',
            borderBottom: '1px solid #fde047'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <NotebookPen size={16} color="#854d0e" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#713f12' }}>Заметки проекта</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#a16207' }}>
                {isSaving ? 'Сохранение...' : (content ? 'Сохранено' : '')}
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ 
                  color: '#854d0e', 
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, padding: '12px', display: 'flex' }}>
            {isLoading ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a16207' }}>
                <span style={{ fontSize: '14px' }}>Загрузка...</span>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={handleChange}
                placeholder="Here you can write your notes..."
                autoFocus
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'transparent',
                  resize: 'none',
                  outline: 'none',
                  border: 'none',
                  color: '#422006',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              />
            )}
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            textarea::placeholder { color: rgba(133, 77, 14, 0.4); }
          `}} />
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          backgroundColor: '#facc15',
          color: '#422006',
          padding: '12px 20px',
          borderRadius: '9999px',
          boxShadow: '0 4px 14px 0 rgba(250, 204, 21, 0.39)',
          transition: 'all 0.2s ease',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          fontSize: '15px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.backgroundColor = '#fde047';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = '#facc15';
        }}
      >
        <NotebookPen size={20} />
        <span>Notes</span>
      </button>
    </div>
  );
}
