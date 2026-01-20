import React from 'react';
import { InventoryItem } from '../types';
import { AlertTriangle, Clock, Activity, Battery, CheckCircle2, Plus, Zap, Info, Calendar } from 'lucide-react';
import { Button } from './Button';

interface HomeDashboardProps {
  inventory: InventoryItem[];
  isEmergency: boolean;
  onNavigate: (view: any) => void;
  aiActions: string[];
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ inventory, isEmergency, onNavigate, aiActions }) => {
  // Calculate expiry alerts
  const today = new Date();
  const expiringItems = inventory.filter(item => {
    const expiry = new Date(item.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return daysLeft <= 30 && item.quantity > 0;
  }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  // Calculate survival stats
  const totalCalories = inventory.reduce((acc, i) => acc + ((i.calories || 0) * i.quantity), 0);
  const daysSurvival = Math.floor(totalCalories / 2000); // Assume 2000kcal/day
  
  // Calculate rolling stock health
  const rollingStockItems = inventory.filter(i => i.isRollingStock);
  const lowStockItems = rollingStockItems.filter(i => i.quantity < (i.maxQuantity || 3));
  const stockHealth = rollingStockItems.length > 0 
    ? Math.round(((rollingStockItems.length - lowStockItems.length) / rollingStockItems.length) * 100)
    : 100;

  const mockNews = [
    { id: 1, title: 'VR型震災体験イベントのお知らせ', date: '2025/06/15', location: '中央防災館' },
    { id: 2, title: '夏場の備蓄食品管理について', date: '2025/06/01', location: 'コラム' },
    { id: 3, title: 'ローリングストック応援キャンペーン', date: '2025/05/20', location: 'お知らせ' },
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Hero Section */}
      <section className={`rounded-2xl p-6 text-white shadow-lg transition-all ${isEmergency ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-brand-500 to-brand-600'}`}>
        <div className="flex justify-between items-start mb-4">
           <div>
             <h2 className="text-lg font-medium opacity-90">{isEmergency ? '緊急サバイバル予測' : '現在の備蓄状況'}</h2>
             <p className="text-4xl font-bold mt-1">
               {daysSurvival}<span className="text-xl font-normal ml-1">日分</span>
             </p>
           </div>
           <Activity className="opacity-80" size={32} />
        </div>
        
        <div className="flex gap-4 mt-6">
           <div className="bg-white/20 rounded-lg p-3 flex-1 backdrop-blur-sm">
              <div className="flex items-center gap-1 text-xs opacity-80 mb-1"><Battery size={12} /> 総カロリー</div>
              <div className="font-bold text-lg">{totalCalories.toLocaleString()}</div>
           </div>
           <div className="bg-white/20 rounded-lg p-3 flex-1 backdrop-blur-sm">
              <div className="flex items-center gap-1 text-xs opacity-80 mb-1"><CheckCircle2 size={12} /> 備蓄充足率</div>
              <div className="font-bold text-lg">{stockHealth}%</div>
           </div>
        </div>
      </section>

      {/* Emergency Mode: AI Actions */}
      {isEmergency && (
        <section>
           <h3 className="font-bold text-lg flex items-center gap-2 text-white mb-3">
              <Zap size={20} className="text-yellow-400" />
              AI推奨アクション
           </h3>
           <div className="space-y-3">
              {aiActions.length > 0 ? aiActions.map((action, idx) => (
                 <div key={idx} className="bg-stone-800 border border-stone-700 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-yellow-500/20 text-yellow-500 p-1.5 rounded-full mt-0.5">
                       <AlertTriangle size={16} />
                    </div>
                    <p className="text-stone-200 font-bold">{action}</p>
                 </div>
              )) : (
                 <div className="text-stone-400 text-center py-4">
                    状況を分析中...
                 </div>
              )}
           </div>
        </section>
      )}

      {/* Normal Mode: Expiry Alerts */}
      {!isEmergency && (
        <section>
           <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg flex items-center gap-2 text-stone-800">
                 <Clock size={20} className="text-orange-500" />
                 消費期限アラート
              </h3>
              {expiringItems.length > 0 && (
                 <Button variant="ghost" size="sm" onClick={() => onNavigate('advisor')}>レシピを見る</Button>
              )}
           </div>
           
           {expiringItems.length === 0 ? (
              <div className="p-6 rounded-xl border bg-white border-stone-200 text-stone-500 text-center">
                 期限切れ間近のアイテムはありません。<br/>素晴らしい管理です！
              </div>
           ) : (
              <div className="space-y-3">
                 {expiringItems.slice(0, 3).map(item => {
                    const days = Math.ceil((new Date(item.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                       <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border bg-white border-orange-100 shadow-sm">
                          <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${days < 0 ? 'bg-stone-200 text-stone-500' : 'bg-orange-100 text-orange-600'}`}>
                                {days < 0 ? '!' : days}
                             </div>
                             <div>
                                <div className="font-bold text-stone-800">{item.name}</div>
                                <div className="text-xs text-stone-400">{item.expiryDate} まで</div>
                             </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-bold ${days < 7 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                             {days < 0 ? '期限切れ' : `あと${days}日`}
                          </span>
                       </div>
                    );
                 })}
                 {expiringItems.length > 3 && (
                    <button onClick={() => onNavigate('inventory')} className="w-full py-2 text-center text-sm text-stone-500 hover:text-brand-500">
                       他 {expiringItems.length - 3} 件を表示
                    </button>
                 )}
              </div>
           )}
        </section>
      )}

      {/* Normal Mode: News & Events */}
      {!isEmergency && (
        <section>
            <h3 className="font-bold text-lg flex items-center gap-2 text-stone-800 mb-3">
               <Info size={20} className="text-blue-500" />
               お知らせ・イベント
            </h3>
            <div className="space-y-3">
               {mockNews.map(news => (
                  <div key={news.id} className="bg-white border border-stone-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                     <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                        <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-600 font-medium">{news.location}</span>
                        <span className="flex items-center gap-1"><Calendar size={10} /> {news.date}</span>
                     </div>
                     <h4 className="font-bold text-stone-800">{news.title}</h4>
                  </div>
               ))}
            </div>
        </section>
      )}
      
      {/* Emergency Mode: Expiry (Secondary) */}
      {isEmergency && expiringItems.length > 0 && (
         <section>
            <h3 className="font-bold text-lg text-white mb-3">期限の近い食品 (優先消費)</h3>
            <div className="space-y-2">
                 {expiringItems.slice(0, 3).map(item => (
                    <div key={item.id} className="bg-stone-800 border border-stone-700 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-stone-200">{item.name}</span>
                        <span className="text-xs bg-red-900 text-red-100 px-2 py-1 rounded">{item.expiryDate}</span>
                    </div>
                 ))}
            </div>
         </section>
      )}
    </div>
  );
};