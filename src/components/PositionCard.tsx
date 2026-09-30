import React from 'react';

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT' | 'BUY' | 'SELL';
  leverage: number;
  marginType?: 'Cross' | 'Isolated';
  size: number;
  margin: number;
  marginRatio?: number;
  entryPrice: number;
  markPrice: number;
  liqPrice: number;
  pnl: number;
  pnlPercent: number;
  tp?: number | null;
  sl?: number | null;
  realizedPnl?: number;
}

export const MexcPositionCard: React.FC<{ pos: Position }> = ({ pos }) => {
  const isLong = pos.side === 'LONG' || pos.side === 'BUY';
  const isProfit = pos.pnl >= 0;

  return (
    <div className="w-full bg-[#131823] border border-slate-800/80 rounded-2xl p-4 space-y-3 font-sans shadow-lg text-slate-200">
      
      {/* 1. Шапка: Направление, Пара, Плечо */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded flex items-center justify-center font-extrabold text-xs ${
            isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isLong ? 'B' : 'S'}
          </span>
          <span className="font-bold text-sm text-white tracking-wide">{pos.symbol} Perpetual</span>
        </div>

        <span className="bg-[#1c2434] text-slate-400 text-[11px] px-2 py-0.5 rounded font-medium border border-slate-800">
          {pos.marginType || 'Cross'} {pos.leverage}X &gt;
        </span>
      </div>

      {/* 2. Нереализованный PnL (Главные цифры) */}
      <div className="flex justify-between items-baseline pt-1">
        <span className="text-[11px] text-slate-400 font-medium border-b border-dashed border-slate-600">
          Unrealized PNL (USDT)
        </span>
        <div className={`text-base font-extrabold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
          {isProfit ? `+${pos.pnl.toFixed(4)}` : pos.pnl.toFixed(4)}
          <span className="text-xs ml-1">
            [{isProfit ? `+${pos.pnlPercent.toFixed(2)}` : pos.pnlPercent.toFixed(2)}%]
          </span>
        </div>
      </div>

      {/* 3. Сетка метрик (3 колонки) */}
      <div className="grid grid-cols-3 gap-y-2.5 gap-x-1 pt-1 text-left">
        <div>
          <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-700 block mb-0.5">Size (USDT)</span>
          <span className="text-xs font-semibold font-mono text-slate-100">{pos.size.toLocaleString()}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-700 block mb-0.5">Margin (USDT)</span>
          <span className="text-xs font-semibold font-mono text-slate-100">{pos.margin.toFixed(2)}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-700 block mb-0.5">Margin Ratio</span>
          <span className="text-xs font-semibold font-mono text-slate-100">{pos.marginRatio ? `${pos.marginRatio.toFixed(2)}%` : '--'}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-700 block mb-0.5">Avg. Price</span>
          <span className="text-xs font-semibold font-mono text-slate-100">{pos.entryPrice}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-700 block mb-0.5">Fair Price</span>
          <span className="text-xs font-semibold font-mono text-slate-100">{pos.markPrice}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-700 block mb-0.5">Liq. Price</span>
          <span className="text-xs font-semibold font-mono text-amber-400">{pos.liqPrice || '--'}</span>
        </div>
      </div>

      {/* 4. TP / SL */}
      <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">TP/SL</span>
          <span className="font-mono text-slate-300 font-semibold">
            {pos.tp ? pos.tp : '--'} / <span className="text-rose-400">{pos.sl ? pos.sl : '--'}</span>
          </span>
        </div>

        {pos.realizedPnl !== undefined && (
          <div className="text-slate-400">
            Realized PNL <span className={`font-mono font-semibold ${pos.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pos.realizedPnl >= 0 ? `+${pos.realizedPnl}` : pos.realizedPnl}
            </span>
          </div>
        )}
      </div>

    </div>
  );
};

export default MexcPositionCard;