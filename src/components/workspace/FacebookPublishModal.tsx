'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  adsets: AdSet[];
}

interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
}

interface FacebookPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  defaultHeadline?: string;
  defaultPrimaryText?: string;
}

export function FacebookPublishModal({ isOpen, onClose, imageUrl, defaultHeadline, defaultPrimaryText }: FacebookPublishModalProps) {
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedAdSet, setSelectedAdSet] = useState('');

  const [headline, setHeadline] = useState(defaultHeadline || '');
  const [primaryText, setPrimaryText] = useState(defaultPrimaryText || '');
  const [adName, setAdName] = useState('AI Creo Ad');

  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHeadline(defaultHeadline || '');
      setPrimaryText(defaultPrimaryText || '');
      fetchAccounts();
      setSuccess(false);
      setError('');
    }
  }, [isOpen, defaultHeadline, defaultPrimaryText]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    setError('');
    try {
      const res = await fetch('/api/facebook/adaccounts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch accounts');
      setAccounts(data);
    } catch (e: any) {
      if (e.message.includes('Facebook not connected')) {
        setError('Facebook Ads не подключен. Пожалуйста, подключите аккаунт в настройках.');
      } else {
        setError(e.message);
      }
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchCampaigns = async (actId: string) => {
    setLoadingCampaigns(true);
    setError('');
    try {
      const res = await fetch(`/api/facebook/campaigns?act_id=${actId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch campaigns');
      setCampaigns(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleAccountChange = (actId: string) => {
    setSelectedAccount(actId);
    setSelectedCampaign('');
    setSelectedAdSet('');
    if (actId) {
      fetchCampaigns(actId);
    } else {
      setCampaigns([]);
    }
  };

  const handlePublish = async () => {
    if (!selectedAccount || !selectedAdSet || !imageUrl) return;
    setIsPublishing(true);
    setError('');
    try {
      const res = await fetch('/api/facebook/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actId: selectedAccount,
          adsetId: selectedAdSet,
          imageUrl,
          headline,
          primaryText,
          name: adName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  const currentCampaign = campaigns.find(c => c.id === selectedCampaign);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Публикация в Facebook Ads
        </h2>

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle className="text-green-500 w-16 h-16 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Объявление успешно опубликовано!</h3>
            <p className="text-slate-600 mb-6">Оно добавлено в ваш рекламный кабинет со статусом "Черновик/Остановлено". Вы можете проверить и запустить его в Ads Manager.</p>
            <button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Закрыть</button>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg flex gap-3 text-sm">
                <AlertTriangle className="shrink-0" size={18} />
                <span>{error}</span>
                {error.includes('не подключен') && (
                  <a href="/api/auth/facebook" className="ml-auto underline font-medium">Подключить</a>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Left Column: Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Рекламный кабинет</label>
                  <select 
                    value={selectedAccount} 
                    onChange={e => handleAccountChange(e.target.value)}
                    className="w-full border-slate-300 rounded-lg shadow-sm text-sm"
                    disabled={loadingAccounts}
                  >
                    <option value="">Выберите кабинет...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.account_id})</option>
                    ))}
                  </select>
                </div>

                {selectedAccount && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Кампания</label>
                    <select 
                      value={selectedCampaign} 
                      onChange={e => { setSelectedCampaign(e.target.value); setSelectedAdSet(''); }}
                      className="w-full border-slate-300 rounded-lg shadow-sm text-sm"
                      disabled={loadingCampaigns}
                    >
                      <option value="">Выберите кампанию...</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedCampaign && currentCampaign && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Группа объявлений (Ad Set)</label>
                    <select 
                      value={selectedAdSet} 
                      onChange={e => setSelectedAdSet(e.target.value)}
                      className="w-full border-slate-300 rounded-lg shadow-sm text-sm"
                    >
                      <option value="">Выберите группу...</option>
                      {currentCampaign.adsets.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Название объявления</label>
                  <input type="text" value={adName} onChange={e => setAdName(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm text-sm" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Заголовок (Headline)</label>
                  <input type="text" value={headline} onChange={e => setHeadline(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Основной текст (Primary Text)</label>
                  <textarea rows={4} value={primaryText} onChange={e => setPrimaryText(e.target.value)} className="w-full border-slate-300 rounded-lg shadow-sm text-sm" />
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Предпросмотр</h4>
                
                <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden text-sm">
                  <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                    <div>
                      <div className="font-bold text-slate-800">Рекламодатель</div>
                      <div className="text-xs text-slate-500">Спонсировано</div>
                    </div>
                  </div>
                  
                  <div className="p-3 text-slate-800 whitespace-pre-wrap">
                    {primaryText || 'Здесь будет ваш рекламный текст...'}
                  </div>

                  {imageUrl ? (
                    <img src={imageUrl} alt="Creative" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-400">
                      Нет изображения
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-500 uppercase">ОТКРЫТЬ САЙТ</div>
                      <div className="font-bold text-slate-800">{headline || 'Ваш заголовок'}</div>
                    </div>
                    <div className="bg-slate-200 px-3 py-1.5 rounded text-slate-800 font-bold text-xs uppercase">
                      Подробнее
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm">Отмена</button>
              <button 
                onClick={handlePublish} 
                disabled={isPublishing || !selectedAccount || !selectedAdSet || !imageUrl || !!error}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
              >
                {isPublishing ? <Loader2 className="animate-spin" size={16} /> : null}
                Опубликовать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
