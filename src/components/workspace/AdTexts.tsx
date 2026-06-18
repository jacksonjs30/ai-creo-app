'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Sparkles,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Info,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Platform = 'meta' | 'google' | 'tiktok' | 'other';
type Language = 'uk' | 'en' | 'ru';

interface AdVariant {
  variantIndex: number;
  structure: string;
  // Meta / Other
  primaryText?: string;
  headline?: string;
  // Google
  description?: string;
  // TikTok
  hook?: string;
  caption?: string;
  // Meta info
  usedPains?: string[];
  usedOutcomes?: string[];
  // UI state
  hasError?: boolean;
}

// Only string fields of AdVariant that the user can edit
type EditableAdField = 'primaryText' | 'headline' | 'description' | 'hook' | 'caption';

interface AdTextsProps {
  id: string;
  avatars: any[];
  projectBrief: any;
  initialAvatarIdx?: number;
}

// ─────────────────────────────────────────────
// Platform configs
// ─────────────────────────────────────────────

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'meta', label: 'Meta (Facebook / Instagram)' },
  { value: 'google', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok / Reels / Shorts' },
  { value: 'other', label: 'Другое' },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'uk', label: 'Українська' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

const STRUCTURE_COLORS: Record<string, string> = {
  PAS: '#f59e0b',
  'Hook→Value→CTA': '#3b82f6',
  AIDA: '#8b5cf6',
  BAB: '#10b981',
};

// ─────────────────────────────────────────────
// Helper: extract project brief fields
// ─────────────────────────────────────────────

function getBriefFields(brief: any) {
  if (!brief) return { productDescription: '', keyOutcome: '' };
  const productDescription =
    brief.description || brief.productDescription || brief.briefText || '';
  const keyOutcome =
    brief.keyOutcome || brief.mainResult || brief.bigResult || brief.outcome || '';
  return { productDescription, keyOutcome };
}

// ─────────────────────────────────────────────
// Helper: get char count warning for Google
// ─────────────────────────────────────────────

function googleCharWarning(text: string, limit: number): string | null {
  if (!text) return null;
  const len = text.length;
  if (len > limit) return `⚠ ${len}/${limit} символов (лимит превышен)`;
  if (len > limit * 0.9) return `${len}/${limit} символов`;
  return null;
}

// ─────────────────────────────────────────────
// VariantCard component
// ─────────────────────────────────────────────

interface VariantCardProps {
  variant: AdVariant | null;
  index: number;
  platform: Platform;
  avatarName: string;
  localRefinement: string;
  onLocalRefinementChange: (val: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onFieldChange: (field: EditableAdField, value: string) => void;
}

function VariantCard({
  variant,
  index,
  platform,
  avatarName,
  localRefinement,
  onLocalRefinementChange,
  onRegenerate,
  isRegenerating,
  onFieldChange,
}: VariantCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleCopyAll = () => {
    if (!variant) return;
    let text = '';
    if (platform === 'meta' || platform === 'other') {
      if (variant.headline) text += `${variant.headline}\n\n`;
      if (variant.primaryText) text += variant.primaryText;
    } else if (platform === 'google') {
      if (variant.headline) text += `Headline: ${variant.headline}\n`;
      if (variant.description) text += `Description: ${variant.description}`;
    } else if (platform === 'tiktok') {
      if (variant.hook) text += `Hook: ${variant.hook}\n\n`;
      if (variant.caption) text += `Caption: ${variant.caption}`;
    }
    handleCopy(text, 'all');
  };

  const structureColor = variant?.structure
    ? STRUCTURE_COLORS[variant.structure] || '#64748b'
    : '#64748b';

  const isEmpty = !variant;
  const hasError = variant?.hasError;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f1f5f9',
          background: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {index}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
              Вариант {index}
            </div>
            {variant?.structure && (
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: structureColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: '1px',
                }}
              >
                {variant.structure}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {variant && !hasError && (
            <button
              onClick={handleCopyAll}
              className="btn btn-secondary"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="Скопировать весь вариант"
            >
              {copiedField === 'all' ? (
                <CheckCircle2 size={14} color="#22c55e" />
              ) : (
                <Copy size={14} />
              )}
              {copiedField === 'all' ? 'Скопировано' : 'Скопировать'}
            </button>
          )}
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: isRegenerating ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
            {isRegenerating ? 'Генерация…' : 'Перегенерировать'}
          </button>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '1.25rem' }}>
        {/* Local refinement field */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.4rem',
            }}
          >
            Уточнить этот вариант
          </label>
          <textarea
            value={localRefinement}
            onChange={(e) => onLocalRefinementChange(e.target.value)}
            placeholder="Например: сделать более эмоциональным, добавить цифры, изменить CTA..."
            rows={2}
            style={{
              width: '100%',
              fontSize: '0.8rem',
              resize: 'vertical',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '0.5rem 0.75rem',
              fontFamily: 'inherit',
              color: '#0f172a',
              background: '#fafafa',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {/* Content area */}
        {isEmpty && !isRegenerating ? (
          <EmptyCardPlaceholder />
        ) : isRegenerating ? (
          <LoadingCardPlaceholder />
        ) : hasError ? (
          <ErrorCardPlaceholder onRetry={onRegenerate} />
        ) : (
          <VariantContent
            variant={variant!}
            platform={platform}
            avatarName={avatarName}
            copiedField={copiedField}
            onCopy={handleCopy}
            onFieldChange={onFieldChange}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VariantContent — platform-specific fields
// ─────────────────────────────────────────────

interface VariantContentProps {
  variant: AdVariant;
  platform: Platform;
  avatarName: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
  onFieldChange: (field: EditableAdField, value: string) => void;
}

function VariantContent({ variant, platform, avatarName, copiedField, onCopy, onFieldChange }: VariantContentProps) {
  // Auto-resize textarea to fit content
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const renderField = (
    label: string,
    value: string | undefined,
    fieldKey: EditableAdField,
    options?: { charLimit?: number }
  ) => {
    if (value === undefined || value === null) return null;
    const currentVal = value;
    const warning = options?.charLimit ? googleCharWarning(currentVal, options.charLimit) : null;
    const isOver = !!(warning && currentVal.length > (options?.charLimit ?? Infinity));
    const isMultiline = fieldKey === 'primaryText' || fieldKey === 'caption';

    return (
      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.35rem',
          }}
        >
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {warning && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: isOver ? '#ef4444' : '#f59e0b',
                  fontWeight: 600,
                }}
              >
                {warning}
              </span>
            )}
            <button
              onClick={() => onCopy(currentVal, String(fieldKey))}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copiedField === String(fieldKey) ? '#22c55e' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                transition: 'color 0.2s',
              }}
              title="Скопировать"
            >
              {copiedField === String(fieldKey) ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
        <textarea
          value={currentVal}
          rows={isMultiline ? 5 : 2}
          onChange={(e) => {
            onFieldChange(fieldKey, e.target.value);
            autoResize(e.target);
          }}
          onFocus={(e) => autoResize(e.target)}
          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
          style={{
            width: '100%',
            background: '#f8fafc',
            border: `1px solid ${isOver ? '#fca5a5' : '#e2e8f0'}`,
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            color: '#1e293b',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: isMultiline ? '100px' : '44px',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            outline: 'none',
            overflowY: 'hidden',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLTextAreaElement).style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.borderColor = isOver ? '#fca5a5' : '#e2e8f0';
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLTextAreaElement).style.borderColor = 'var(--primary)';
            (e.target as HTMLTextAreaElement).style.boxShadow = '0 0 0 2px rgba(59,130,246,0.15)';
          }}
          onBlurCapture={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.borderColor = isOver ? '#fca5a5' : '#e2e8f0';
            el.style.boxShadow = 'none';
          }}
        />
      </div>
    );
  };

  return (
    <div>
      {(platform === 'meta' || platform === 'other') && (
        <>
          {renderField('Headline', variant.headline, 'headline')}
          {renderField('Primary Text', variant.primaryText, 'primaryText')}
        </>
      )}

      {platform === 'google' && (
        <>
          {renderField('Headline', variant.headline, 'headline', { charLimit: 30 })}
          {renderField('Description', variant.description, 'description', { charLimit: 90 })}
        </>
      )}

      {platform === 'tiktok' && (
        <>
          {renderField('Hook', variant.hook, 'hook')}
          {renderField('Caption', variant.caption, 'caption')}
        </>
      )}

      {/* Used pains/outcomes tags */}
      {((variant.usedPains && variant.usedPains.length > 0) ||
        (variant.usedOutcomes && variant.usedOutcomes.length > 0)) && (
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.75rem',
            color: '#94a3b8',
            lineHeight: 1.5,
          }}
        >
          <Info size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Основано на аватаре:{' '}
          <span style={{ color: '#64748b', fontWeight: 600 }}>«{avatarName}»</span>
          {variant.usedPains && variant.usedPains.length > 0 && (
            <>
              {' '}· Боли:{' '}
              {variant.usedPains.map((p, i) => (
                <span key={i}>
                  {p}
                  {i < variant.usedPains!.length - 1 ? ', ' : ''}
                </span>
              ))}
            </>
          )}
          {variant.usedOutcomes && variant.usedOutcomes.length > 0 && (
            <>
              {' '}· Результат:{' '}
              {variant.usedOutcomes.map((o, i) => (
                <span key={i}>
                  {o}
                  {i < variant.usedOutcomes!.length - 1 ? ', ' : ''}
                </span>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Placeholder states
// ─────────────────────────────────────────────

function EmptyCardPlaceholder() {
  return (
    <div
      style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px dashed #cbd5e1',
      }}
    >
      <FileText size={28} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
      <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
        Нажмите «Сгенерировать», чтобы получить текст
      </p>
    </div>
  );
}

function LoadingCardPlaceholder() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[80, 60, 90, 50].map((w, i) => (
        <div
          key={i}
          style={{
            height: '16px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            width: `${w}%`,
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

function ErrorCardPlaceholder({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        padding: '1.5rem',
        textAlign: 'center',
        background: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fca5a5',
      }}
    >
      <AlertCircle size={24} color="#ef4444" style={{ margin: '0 auto 0.5rem' }} />
      <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: 600 }}>
        Ошибка генерации
      </p>
      <button
        onClick={onRetry}
        className="btn btn-secondary"
        style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
      >
        <RefreshCw size={14} /> Попробовать ещё раз
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main AdTexts component
// ─────────────────────────────────────────────

export default function AdTexts({ id, avatars, projectBrief, initialAvatarIdx }: AdTextsProps) {
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number | null>(
    initialAvatarIdx !== undefined && initialAvatarIdx !== null ? initialAvatarIdx : null
  );
  const [platform, setPlatform] = useState<Platform>('meta');
  const [language, setLanguage] = useState<Language>('uk');
  const [globalRefinement, setGlobalRefinement] = useState('');
  const [variants, setVariants] = useState<(AdVariant | null)[]>([null, null, null]);
  const [localRefinements, setLocalRefinements] = useState<string[]>(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Sync initialAvatarIdx if it changes (e.g. navigating from avatar card)
  useEffect(() => {
    if (initialAvatarIdx !== undefined && initialAvatarIdx !== null) {
      setSelectedAvatarIdx(initialAvatarIdx);
    }
  }, [initialAvatarIdx]);

  const selectedAvatar = selectedAvatarIdx !== null ? avatars[selectedAvatarIdx] : null;
  const { productDescription, keyOutcome } = getBriefFields(projectBrief);
  const productName =
    projectBrief?.productName ||
    projectBrief?.name ||
    (typeof projectBrief?.product === 'string' ? projectBrief.product : '') ||
    'Продукт';

  // ── Generate all 3 variants ──
  const handleGenerate = useCallback(async () => {
    if (!selectedAvatar) return;
    setIsGenerating(true);
    setGlobalError(null);
    setVariants([null, null, null]);

    try {
      const res = await fetch('/api/generate-ad-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDescription,
          keyOutcome,
          avatarData: selectedAvatar,
          platform,
          language,
          globalRefinement: globalRefinement.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setGlobalError(data.error || 'Ошибка генерации. Попробуйте ещё раз.');
        setVariants([
          { variantIndex: 1, structure: 'PAS', hasError: true },
          { variantIndex: 2, structure: 'Hook→Value→CTA', hasError: true },
          { variantIndex: 3, structure: 'AIDA', hasError: true },
        ]);
        return;
      }

      const newVariants: (AdVariant | null)[] = [null, null, null];
      (data.variants as AdVariant[]).forEach((v) => {
        const idx = v.variantIndex - 1;
        if (idx >= 0 && idx < 3) newVariants[idx] = v;
      });
      setVariants(newVariants);
      // Reset local refinements on fresh generation
      setLocalRefinements(['', '', '']);
    } catch (e: any) {
      setGlobalError(e.message || 'Сетевая ошибка');
      setVariants([
        { variantIndex: 1, structure: 'PAS', hasError: true },
        { variantIndex: 2, structure: 'Hook→Value→CTA', hasError: true },
        { variantIndex: 3, structure: 'AIDA', hasError: true },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedAvatar, platform, language, globalRefinement, productName, productDescription, keyOutcome]);

  // ── Regenerate one variant ──
  const handleRegenerate = useCallback(
    async (cardIdx: number) => {
      if (!selectedAvatar) return;
      setRegeneratingIdx(cardIdx);
      setGlobalError(null);

      // Choose a structure different from the current one if possible
      const currentStructure = variants[cardIdx]?.structure;
      const allStructures = ['PAS', 'Hook→Value→CTA', 'AIDA', 'BAB'];
      const remaining = allStructures.filter((s) => s !== currentStructure);
      const newStructure = remaining[Math.floor(Math.random() * remaining.length)];

      try {
        const res = await fetch('/api/generate-ad-texts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName,
            productDescription,
            keyOutcome,
            avatarData: selectedAvatar,
            platform,
            language,
            globalRefinement: globalRefinement.trim() || undefined,
            localRefinement: localRefinements[cardIdx].trim() || undefined,
            variantIndex: cardIdx + 1,
            structureOverride: newStructure,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setVariants((prev) => {
            const next = [...prev];
            next[cardIdx] = { ...(next[cardIdx] || { variantIndex: cardIdx + 1, structure: newStructure }), hasError: true };
            return next;
          });
          return;
        }

        const newVariant: AdVariant | undefined = data.variants?.[0];
        if (newVariant) {
          setVariants((prev) => {
            const next = [...prev];
            next[cardIdx] = { ...newVariant, hasError: false };
            return next;
          });
        }
      } catch (e: any) {
        setVariants((prev) => {
          const next = [...prev];
          next[cardIdx] = {
            ...(next[cardIdx] || { variantIndex: cardIdx + 1, structure: newStructure }),
            hasError: true,
          };
          return next;
        });
      } finally {
        setRegeneratingIdx(null);
      }
    },
    [
      selectedAvatar,
      platform,
      language,
      globalRefinement,
      localRefinements,
      variants,
      productName,
      productDescription,
      keyOutcome,
    ]
  );

  const updateLocalRefinement = (idx: number, val: string) => {
    setLocalRefinements((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  // Update a single field inside a specific variant (for manual editing)
  const updateVariantField = (cardIdx: number, field: EditableAdField, value: string) => {
    setVariants((prev) => {
      const next = [...prev];
      const existing = next[cardIdx];
      if (existing) next[cardIdx] = { ...existing, [field]: value };
      return next;
    });
  };

  const canGenerate = selectedAvatar !== null && !isGenerating;

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <FileText size={22} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            Тексты объявлений
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '2px' }}>
            Генерация 3 вариантов рекламного текста на основе данных аватара
          </p>
        </div>
      </div>

      {/* Filters panel */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Avatar select */}
        <div className="form-group">
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Аватар / Сегмент *
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedAvatarIdx !== null ? String(selectedAvatarIdx) : ''}
              onChange={(e) =>
                setSelectedAvatarIdx(e.target.value === '' ? null : Number(e.target.value))
              }
              style={{
                width: '100%',
                padding: '0.625rem 2rem 0.625rem 0.75rem',
                borderRadius: '8px',
                border: `1px solid ${selectedAvatarIdx === null ? '#f59e0b' : '#e2e8f0'}`,
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                background: 'white',
                appearance: 'none',
                cursor: 'pointer',
                color: selectedAvatarIdx === null ? '#94a3b8' : '#0f172a',
                transition: 'border-color 0.2s',
              }}
            >
              <option value="">— Выберите сегмент —</option>
              {avatars.map((avatar, idx) => (
                <option key={idx} value={String(idx)}>
                  {avatar.segmentName || `Сегмент #${idx + 1}`}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              style={{
                position: 'absolute',
                right: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
          </div>
          {selectedAvatar && (
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.75rem',
                color: '#64748b',
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as any,
              }}
            >
              {selectedAvatar.summary || selectedAvatar.portrait?.substring(0, 120) + '…'}
            </div>
          )}
        </div>

        {/* Platform select */}
        <div className="form-group">
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Платформа
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              style={{
                width: '100%',
                padding: '0.625rem 2rem 0.625rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                background: 'white',
                appearance: 'none',
                cursor: 'pointer',
                color: '#0f172a',
              }}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              style={{
                position: 'absolute',
                right: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Language select */}
        <div className="form-group">
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Язык
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              style={{
                width: '100%',
                padding: '0.625rem 2rem 0.625rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                background: 'white',
                appearance: 'none',
                cursor: 'pointer',
                color: '#0f172a',
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              style={{
                position: 'absolute',
                right: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Global refinement */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '2px' }}>
            Задать уточнения для генерации
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
            Необязательно. Если заполните, сервис учтёт эти пожелания поверх данных аватара и продукта.
          </div>
        </div>
        <textarea
          value={globalRefinement}
          onChange={(e) => setGlobalRefinement(e.target.value)}
          placeholder="Например: сделать упор на экономию времени; сделать текст более провокационным и дерзким; добавить социальное доказательство..."
          rows={3}
          style={{
            width: '100%',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '0.75rem',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            color: '#0f172a',
            background: '#fafafa',
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Generate button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {!selectedAvatar && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              background: '#fefce8',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#92400e',
            }}
          >
            <Info size={15} />
            Выберите сегмент, под который нужно сгенерировать текст объявления.
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.875rem 2rem',
            borderRadius: '10px',
            border: 'none',
            background: canGenerate
              ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
              : '#e2e8f0',
            color: canGenerate ? 'white' : '#94a3b8',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            boxShadow: canGenerate ? '0 4px 15px rgba(59,130,246,0.35)' : 'none',
            transition: 'all 0.2s',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            if (canGenerate) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Генерация текстов…
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Сгенерировать 3 текста объявления
            </>
          )}
        </button>

        <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', maxWidth: '480px' }}>
          Тексты пишутся на основе брифа, аватара и результатов исследования аудитории для этого продукта.
        </p>
      </div>

      {/* Global error */}
      {globalError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#dc2626',
          }}
        >
          <AlertCircle size={16} />
          {globalError}
        </div>
      )}

      {/* Variant cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {[0, 1, 2].map((cardIdx) => (
          <VariantCard
            key={cardIdx}
            variant={variants[cardIdx]}
            index={cardIdx + 1}
            platform={platform}
            avatarName={selectedAvatar?.segmentName || ''}
            localRefinement={localRefinements[cardIdx]}
            onLocalRefinementChange={(val) => updateLocalRefinement(cardIdx, val)}
            onRegenerate={() => handleRegenerate(cardIdx)}
            isRegenerating={regeneratingIdx === cardIdx}
            onFieldChange={(field, value) => updateVariantField(cardIdx, field as EditableAdField, value)}
          />
        ))}
      </div>
    </div>
  );
}
