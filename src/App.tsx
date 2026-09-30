import React, { useEffect, useState } from 'react';
import { translations } from './locales';
import MexcPositionCard, { Position } from './components/PositionCard';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

const API_URL = "https://slovesny.ru/api-trade/";
type Language = 'ru' | 'en' | 'es' | 'zh' | 'tr' | 'de';

export default function App() {
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'sub'>('status');
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [lang, setLang] = useState<Language>('ru');

  const [isLifetime, setIsLifetime] = useState<boolean>(true);
  const [isReferral, setIsReferral] = useState<boolean>(false);
  const [showTrialModal, setShowTrialModal] = useState<boolean>(false);

  // 💡 Добрая фича: Telegram Haptic Feedback (нативный виброотклик в WebApp)
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (['light', 'medium', 'heavy'].includes(type)) {
        tg.HapticFeedback.impactOccurred(type);
      } else {
        tg.HapticFeedback.notificationOccurred(type);
      }
    }
  };

  // Хелпер для ввода чисел: разрешает пустую строку и убирает ведущие нули ("05" -> "5")
  const handleNumberChange = (setter: (val: any) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val !== '' && !val.includes('.')) {
      val = val.replace(/^0+(?=\d)/, '');
    }
    setter(val);
  };

  // --- НАСТРОЙКИ ТОРГОВЛИ ---
  const [isPaper, setIsPaper] = useState<boolean>(true);
  const [risk, setRisk] = useState<number | string>(10);
  const [leverage, setLeverage] = useState<number | string>(10);
  const [useMaxLeverage, setUseMaxLeverage] = useState<boolean>(true);
  const [maxPositions, setMaxPositions] = useState<number | string>(3);

  // Ключи
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');

  // Статус с бэкенда
  const [balance, setBalance] = useState<string | null>(null);
  const [activeSignalsCount, setActiveSignalsCount] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);

  // Рассчитываем валидацию
  const isRiskInvalid = risk === '' || isNaN(Number(risk)) || Number(risk) <= 0;
  const isMaxPositionsInvalid = maxPositions === '' || isNaN(Number(maxPositions)) || Number(maxPositions) <= 0;
  const isLeverageInvalid = !useMaxLeverage && (leverage === '' || isNaN(Number(leverage)) || Number(leverage) <= 0);
  const isApiInvalid = !isPaper && (!apiKey?.toString().trim() || !apiSecret?.toString().trim());

  // Общий флаг невалидности
  const isFormInvalid = isRiskInvalid || isMaxPositionsInvalid || isLeverageInvalid || isApiInvalid;

  // Функция перевода
  const t = (key: keyof typeof translations['ru']): string => {
    return translations[lang]?.[key] || translations['en']?.[key] || translations['ru']?.[key] || key;
  };

  const safeAlert = (msg: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.showAlert) tg.showAlert(msg);
    else alert(msg);
  };

  const [savedSettings, setSavedSettings] = useState<any>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      if (tg.setHeaderColor) tg.setHeaderColor('secondary_bg_color');
      if (tg.setBackgroundColor) tg.setBackgroundColor('bg_color');
      tg.ready();
      tg.expand();
      if (typeof tg.disableVerticalSwipes === 'function') {
        tg.disableVerticalSwipes();
      }

      const userLang = tg.initDataUnsafe?.user?.language_code;
      if (userLang && userLang in translations) {
        setLang(userLang as Language);
      }
    }

    const fetchSettings = async () => {
      try {
        const initData = tg?.initData || '';

        const res = await fetch(`${API_URL}user/settings`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${initData}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            const u = data.user;

            setSavedSettings(u);

            // Проверяем пожизненный доступ и статус реферала
            const rawLifetime = u.is_lifetime ?? u.isLifetime;
            setIsLifetime(rawLifetime !== undefined ? Boolean(Number(rawLifetime)) : true);

            const rawReferral = u.is_referral ?? u.isReferral ?? u.is_ref ?? u.isRef;
            setIsReferral(rawReferral !== undefined ? Boolean(Number(rawReferral)) : false);

            const rawPaper = u.is_paper_trading ?? u.isPaperTrading ?? u.is_paper ?? u.isPaper;
            const fetchedIsPaper = rawPaper !== undefined ? Boolean(Number(rawPaper)) : true;

            const rawRisk = u.risk_per_trade_usdt ?? u.riskPerTradeUsdt ?? u.risk ?? 10;
            const rawLeverage = u.leverage ?? 10;
            const rawMaxPositions = u.max_open_positions ?? u.maxOpenPositions ?? 3;
            const rawUseMaxLeverage = u.use_max_leverage ?? u.useMaxLeverage;

            setIsPaper(fetchedIsPaper);
            setRisk(Number(rawRisk));
            setLeverage(Number(rawLeverage));
            setMaxPositions(Number(rawMaxPositions));
            setUseMaxLeverage(
              rawUseMaxLeverage !== undefined ? Boolean(Number(rawUseMaxLeverage)) : true
            );

            setApiKey(u.api_key || u.apiKey || '');
            setApiSecret(u.api_secret_encrypted || u.api_secret || u.apiSecret || '');

            if (u.wallet_balance !== undefined) setBalance(u.wallet_balance);
            if (u.active_positions_count !== undefined) setActiveSignalsCount(u.active_positions_count);

            if (Array.isArray(u.positions)) {
              setPositions(u.positions);
            }

            if (!fetchedIsPaper && (!u.api_key || !(u.api_secret_encrypted || u.api_secret))) {
              setActiveTab('settings');
            }
          } else {
            setActiveTab('settings');
          }
        } else {
          setActiveTab('settings');
        }
      } catch (e) {
        console.error('Ошибка загрузки профиля:', e);
        setActiveTab('settings');
      } fontally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const applySettingsToForm = (data: any) => {
    const rawPaper = data.is_paper_trading ?? data.isPaperTrading ?? data.is_paper ?? data.isPaper;
    setIsPaper(rawPaper !== undefined ? Boolean(Number(rawPaper)) : true);
    setRisk(Number(data.risk_per_trade_usdt ?? data.riskPerTradeUsdt ?? data.risk ?? 10));
    setLeverage(Number(data.leverage ?? 10));
    setMaxPositions(Number(data.max_open_positions ?? data.maxOpenPositions ?? 3));
    
    const rawUseMax = data.use_max_leverage ?? data.useMaxLeverage;
    setUseMaxLeverage(rawUseMax !== undefined ? Boolean(Number(rawUseMax)) : true);
    
    setApiKey(data.api_key || data.apiKey || '');
    setApiSecret(data.api_secret_encrypted || data.api_secret || data.apiSecret || '');
  };

  useEffect(() => {
    if (activeTab === 'settings' && savedSettings) {
      applySettingsToForm(savedSettings);
    }
  }, [activeTab]);

  const handleSaveSettings = async () => {
    triggerHaptic('medium');
    try {
      const initData = window.Telegram?.WebApp?.initData || '';

      const payload = {
        is_paper_trading: isPaper ? 1 : 0,
        risk_per_trade_usdt: risk,
        leverage: leverage,
        use_max_leverage: useMaxLeverage ? 1 : 0,
        max_open_positions: maxPositions,
        api_key: apiKey,
        api_secret: apiSecret
      };

      const res = await fetch(`${API_URL}user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${initData}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP: ${res.status}`);

      const data = await res.json();
      if (data.success) {
        triggerHaptic('success');
        safeAlert(t('saveSuccess'));
        setActiveTab('status');
        setSavedSettings(payload);
      } else {
        triggerHaptic('error');
        safeAlert(data.error || t('saveError'));
      }
    } catch (err) {
      triggerHaptic('error');
      safeAlert(t('networkError'));
    }
  };

  const handleCreateInvoice = async () => {
    triggerHaptic('medium');
    setSubLoading(true);
    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData || '';

      const res = await fetch(`${API_URL}create-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${initData}`
        },
        body: JSON.stringify({ amount: 100, asset: 'USDT' })
      });

      if (!res.ok) throw new Error(`HTTP: ${res.status}`);

      const data = await res.json();
      const payUrl = data.pay_url || data.url || data.invoiceUrl || data.result?.pay_url || data.invoice?.pay_url;

      if (data.success !== false && payUrl) {
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(payUrl);
        } else if (tg?.openLink) {
          tg.openLink(payUrl);
        } else {
          window.open(payUrl, '_blank');
        }
      } else {
        triggerHaptic('error');
        safeAlert(data.error || t('invoiceError'));
      }
    } catch (err) {
      console.error('Ошибка оплаты:', err);
      triggerHaptic('error');
      safeAlert(t('networkError'));
    } finally {
      setSubLoading(false);
    }
  };

  const isPaperMode = savedSettings 
    ? Boolean(Number(savedSettings.is_paper_trading ?? savedSettings.isPaperTrading ?? savedSettings.is_paper ?? 1))
    : Boolean(isPaper);

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-full app-bg flex flex-col font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="w-full px-5 py-4 app-bar border-b flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-emerald-500/20">
            U
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-[var(--text-h)]">UPTRADE CRYPTO</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] text-[var(--text)] font-medium">{t('subtitle')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => {
              triggerHaptic('light');
              setLang(e.target.value as Language);
            }}
            className="app-input border text-[11px] rounded-lg px-2 py-1 outline-none uppercase font-bold focus:border-emerald-500 text-[var(--text-h)]"
          >
            <option value="ru" className="app-bg">RU</option>
            <option value="en" className="app-bg">EN</option>
            <option value="es" className="app-bg">ES</option>
            <option value="zh" className="app-bg">ZH</option>
            <option value="tr" className="app-bg">TR</option>
            <option value="de" className="app-bg">DE</option>
          </select>

          {/* Плашку триал НЕ показываем, если uid реферал */}
          {!isReferral && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowTrialModal(true);
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer active:scale-95"
            >
              {t('trialBadge')}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main 
        style={{ paddingTop: 'calc(var(--tg-safe-area-inset-top, 0px) + 18px)' }}
        className="flex-1 w-full overflow-y-auto overscroll-contain p-4 space-y-4 pb-24 no-scrollbar"
      >
        {/* TAB 1: STATUS */}
        {activeTab === 'status' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Блок баланса */}
            <div className="p-5 rounded-2xl app-card border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
              <span className="text-xs text-[var(--text)] font-medium">{t('accountBalance')}</span>
              
              <div className="text-3xl font-extrabold mt-1 text-[var(--text-h)] tracking-tight">
                {isPaperMode ? '∞' : (balance ? `$${balance}` : t('hiddenBalance'))}{' '}
                <span className="text-sm font-normal text-[var(--text)]">USDT</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[var(--border)] text-xs">
                <div>
                  <span className="text-[var(--text)] block">{t('modeLabel')}</span>
                  <span className={`font-semibold ${isPaperMode ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {isPaperMode ? t('demoMode') : t('realMode')}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text)] block">{t('riskPerTrade')}</span>
                  <span className="font-semibold text-[var(--text-h)]">${risk} USDT</span>
                </div>
              </div>
            </div>

            {/* Блок активных позиций (Карточки MEXC) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-sm text-[var(--text-h)]">{t('activePositions')}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] font-mono">
                  {(positions || []).length} / {maxPositions} {t('openCount')}
                </span>
              </div>

              {(!positions || positions.length === 0) ? (
                <div className="text-center py-8 border border-dashed rounded-xl app-card">
                  <p className="text-xs text-[var(--text)]">{t('noSignals')}</p>
                </div>
              ) : (
                positions.map((pos) => (
                  <MexcPositionCard key={pos.id || pos.symbol} pos={pos} />
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-5 rounded-2xl app-card border space-y-5">

              {/* Режим: Демо / Реал */}
              <div>
                <h3 className="font-bold text-sm text-[var(--text-h)] mb-3">{t('botModeHeader')}</h3>
                <div className="grid grid-cols-2 app-input p-1 rounded-xl border">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsPaper(true);
                    }}
                    className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      isPaper ? 'bg-[var(--bg)] text-amber-500 shadow border border-[var(--border)]' : 'text-[var(--text)] hover:text-[var(--text-h)]'
                    }`}
                  >
                    {t('demoBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsPaper(false);
                    }}
                    className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      !isPaper ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-[var(--text)] hover:text-[var(--text-h)]'
                    }`}
                  >
                    {t('realBtn')}
                  </button>
                </div>
              </div>

              {/* Управление рисками */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-[var(--text-h)]">{t('riskManagementHeader')}</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--text)] font-medium block mb-1.5">{t('riskInputLabel')}</label>
                    <input
                      type="number"
                      value={risk}
                      onChange={handleNumberChange(setRisk)}
                      placeholder="10"
                      className={`w-full app-input border rounded-xl p-3 text-sm font-semibold outline-none transition-all text-[var(--text-h)] ${
                        isRiskInvalid 
                          ? 'border-red-500 bg-red-500/5 focus:border-red-500' 
                          : 'focus:border-emerald-500 border-[var(--border)]'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[var(--text)] font-medium block mb-1.5">{t('maxPositionsLabel')}</label>
                    <input
                      type="number"
                      value={maxPositions}
                      onChange={handleNumberChange(setMaxPositions)}
                      placeholder="3"
                      className={`w-full app-input border rounded-xl p-3 text-sm font-semibold outline-none transition-all text-[var(--text-h)] ${
                        isMaxPositionsInvalid 
                          ? 'border-red-500 bg-red-500/5 focus:border-red-500' 
                          : 'focus:border-emerald-500 border-[var(--border)]'
                      }`}
                    />
                  </div>
                </div>

                {/* Тумблер максимального плеча */}
                <div className="flex items-center justify-between app-input p-3 rounded-xl border">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-h)] block">{t('useMaxLeverageLabel')}</span>
                    <span className="text-[10px] text-[var(--text)] block mt-0.5">{t('useMaxLeverageDesc')}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setUseMaxLeverage(!useMaxLeverage);
                    }}
                    className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${
                      useMaxLeverage ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${useMaxLeverage ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Ручное плечо */}
                {!useMaxLeverage && (
                  <div className="animate-fadeIn">
                    <label className="text-[11px] text-[var(--text)] font-medium block mb-1.5">{t('leverageInputLabel')}</label>
                    <input
                      type="number"
                      value={leverage}
                      onChange={handleNumberChange(setLeverage)}
                      placeholder="10"
                      className={`w-full app-input border rounded-xl p-3 text-sm font-semibold outline-none transition-all text-[var(--text-h)] ${
                        isLeverageInvalid 
                          ? 'border-red-500 bg-red-500/5 focus:border-red-500' 
                          : 'focus:border-emerald-500 border-[var(--border)]'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* API Ключи */}
              {!isPaper && (
                <div className="pt-2 border-t border-[var(--border)] animate-fadeIn space-y-3">
                  <h4 className="font-bold text-xs text-amber-500">{t('mexcApiHeader')}</h4>

                  <div>
                    <label className="text-[11px] text-[var(--text)] font-medium block mb-1">{t('apiKeyLabel')}</label>
                    <input
                      type="text"
                      placeholder="mx0glk..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className={`w-full app-input border rounded-xl p-3 text-xs font-mono outline-none transition-all text-[var(--text-h)] ${
                        !isPaper && !apiKey?.toString().trim()
                          ? 'border-red-500 bg-red-500/5 focus:border-red-500'
                          : 'focus:border-emerald-500 border-[var(--border)]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[var(--text)] font-medium block mb-1">{t('apiSecretLabel')}</label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        placeholder="••••••••••••••••"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        className={`w-full app-input border rounded-xl p-3 pr-10 text-xs font-mono outline-none transition-all text-[var(--text-h)] ${
                          !isPaper && !apiSecret?.toString().trim()
                            ? 'border-red-500 bg-red-500/5 focus:border-red-500'
                            : 'focus:border-emerald-500 border-[var(--border)]'
                        }`}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setShowSecret(!showSecret);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text)] hover:text-[var(--text-h)] text-xs"
                      >
                        {showSecret ? '👁️' : '🔒'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isFormInvalid}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500 text-slate-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.99]"
              >
                {t('saveBtn')}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTION */}
        {activeTab === 'sub' && (
          <div className="p-6 rounded-2xl app-card border text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
              ⚡
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-h)]">{t('vipTitle')}</h3>
              <p className="text-xs text-[var(--text)] mt-1 max-w-xs mx-auto">
                {t('vipDesc')}
              </p>
            </div>

            <div className="py-2">
              <span className="text-4xl font-black text-[var(--text-h)]">$100</span>
              <span className="text-xs text-[var(--text)]"> {t('perMonth')}</span>
            </div>

            <button
              type="button"
              onClick={handleCreateInvoice}
              disabled={subLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {subLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                t('payBtn')
              )}
            </button>
          </div>
        )}
      </main>

      {/* МОДАЛЬНОЕ ОКНО ТРИАЛА */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md app-card rounded-2xl border border-[var(--border)] p-6 space-y-5 shadow-2xl relative text-left">
            <button 
              onClick={() => {
                triggerHaptic('light');
                setShowTrialModal(false);
              }}
              className="absolute top-4 right-4 text-xs opacity-60 hover:opacity-100 p-1 font-bold text-[var(--text-h)]"
            >
              ✕
            </button>

            <div className="text-center space-y-2 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto text-2xl font-bold">
                🚀
              </div>
              <h3 className="text-base font-bold text-[var(--text-h)] leading-snug">
                Нравится наш торговый алгоритм?
              </h3>
              <p className="text-xs text-[var(--text)] leading-relaxed">
                Спасибо! Автор проекта — партнер биржи MEXC. Чтобы продолжить использование по истечению триала, Вы можете:
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {/* Кнопка 1: Создать новый аккаунт MEXC */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    // Укажите вашу реальную реферальную ссылку MEXC
                    const referralLink = "https://www.mexc.com/register?inviteCode=YOUR_MEXC_CODE";
                    const tg = window.Telegram?.WebApp;
                    if (tg?.openLink) {
                      tg.openLink(referralLink);
                    } else {
                      window.open(referralLink, '_blank');
                    }
                  }}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  🔗 Создать новый аккаунт MEXC
                </button>
                <p className="text-[10px] text-[var(--text)] text-center px-2 leading-tight opacity-80">
                  По реферальной ссылке, размер комиссий не увеличится по сравнению с обычной торговлей через API
                </p>
              </div>

              <div className="relative flex py-0.5 items-center">
                <div className="flex-grow border-t border-[var(--border)]"></div>
                <span className="flex-shrink mx-2 text-[10px] text-[var(--text)] opacity-50 uppercase font-bold">или</span>
                <div className="flex-grow border-t border-[var(--border)]"></div>
              </div>

              {/* Кнопка 2: Заплатить 100$ */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    setShowTrialModal(false);
                    setActiveTab('sub');
                  }}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  💳 Заплатить 100$
                </button>
                <p className="text-[10px] text-[var(--text)] text-center px-2 leading-tight opacity-80">
                  И торговать на своем текущем аккаунте
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="shrink-0 w-full app-bar backdrop-blur-md border-t flex justify-around p-2 z-20">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('status');
          }}
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-all ${
            activeTab === 'status' ? 'text-emerald-500 font-bold' : 'text-[var(--text)] hover:text-[var(--text-h)]'
          }`}
        >
          <span className="text-base">📊</span>
          <span>{t('tabStatus')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('settings');
          }}
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-all ${
            activeTab === 'settings' ? 'text-emerald-500 font-bold' : 'text-[var(--text)] hover:text-[var(--text-h)]'
          }`}
        >
          <span className="text-base">⚙️</span>
          <span>{t('tabSettings')}</span>
        </button>

        {!isLifetime && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('sub');
            }}
            className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'sub' ? 'bg-amber-500 text-slate-950' : 'text-amber-500 font-semibold'
            }`}
          >
            {t('subTab')}
          </button>
        )}
      </nav>
    </div>
  );
}