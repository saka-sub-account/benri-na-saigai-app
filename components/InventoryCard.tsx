import React from 'react';
import { InventoryItem } from '../types';
import { Droplets, Flame, AlertTriangle, Minus, Plus, RefreshCcw } from 'lucide-react';

interface InventoryCardProps {
  item: InventoryItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  isEmergency: boolean;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({ item, onUpdateQuantity, onUpdateItem, isEmergency }) => {
  const getDaysUntilExpiry = (dateStr: string) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysUntilExpiry(item.expiryDate);
  
  // Status Color Logic
  let statusColor = isEmergency ? 'bg-stone-800' : 'bg-white';
  let badgeColor = 'bg-green-100 text-green-800';
  let borderColor = 'border-transparent';
  let daysLabel = `あと ${daysLeft} 日`;

  if (daysLeft < 30) {
    badgeColor = 'bg-yellow-100 text-yellow-800';
  }
  if (daysLeft < 0) {
    badgeColor = 'bg-stone-200 text-stone-600';
    daysLabel = '期限切れ';
  } else if (daysLeft < 7) {
    badgeColor = 'bg-red-100 text-red-800';
    borderColor = 'border-red-400';
  }

  // Emergency Mode Highlighting
  const isEmergencySafe = (!item.requiresFire && !item.requiresWater) || (item.category === 'water');
  const totalCalories = (item.calories || 0) * item.quantity;
  const currentMax = item.maxQuantity || 0;

  return (
    <div className={`relative flex flex-col p-4 rounded-xl shadow-sm border ${borderColor} ${statusColor} transition-all`}>
      {/* Header Info */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className={`font-bold text-lg leading-tight ${isEmergency ? 'text-white' : 'text-stone-900'}`}>{item.name}</h3>
          <p className={`text-xs mt-1 ${isEmergency ? 'text-stone-400' : 'text-stone-500'}`}>
             期限: {item.expiryDate}
          </p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${badgeColor}`}>
          {daysLabel}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {item.requiresFire && (
           <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${isEmergency ? 'bg-red-900/50 text-red-200 border-red-800' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
             <Flame size={10} /> 要加熱
           </span>
        )}
        {item.requiresWater && (
           <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${isEmergency ? 'bg-blue-900/50 text-blue-200 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
             <Droplets size={10} /> 要水
           </span>
        )}
      </div>

      {/* Rolling Stock Settings Area */}
      {!isEmergency && (
        <div className="bg-stone-50 rounded-lg p-2 mb-4 border border-stone-100 flex items-center justify-between">
          <button 
            onClick={() => onUpdateItem(item.id, { isRollingStock: !item.isRollingStock })}
            className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${item.isRollingStock ? 'bg-blue-100 text-blue-700 font-bold' : 'text-stone-400 hover:bg-stone-200'}`}
          >
            <RefreshCcw size={14} className={item.isRollingStock ? "" : "opacity-50"} />
            <span className="text-xs">{item.isRollingStock ? "自動補充 ON" : "自動補充 OFF"}</span>
          </button>

          {item.isRollingStock && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-500 font-medium">目標数</span>
              <input 
                type="number" 
                min="1"
                value={currentMax}
                onChange={(e) => onUpdateItem(item.id, { maxQuantity: parseInt(e.target.value) || 0 })}
                className="w-14 text-center text-sm border border-stone-300 rounded focus:ring-1 focus:ring-brand-500 outline-none bg-white text-stone-900 py-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Quantity Controls */}
      <div className="mt-auto flex items-center justify-between">
        <div className={`text-xs font-medium ${isEmergency ? 'text-stone-300' : 'text-stone-500'}`}>
           {totalCalories > 0 ? `${totalCalories.toLocaleString()} kcal` : ''}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onUpdateQuantity(item.id, -1)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm active:scale-95 ${isEmergency ? 'bg-stone-700 text-white hover:bg-stone-600' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
          >
            <Minus size={16} />
          </button>
          <div className="text-center w-8">
             <span className={`font-bold text-xl ${isEmergency ? 'text-white' : 'text-stone-800'}`}>
                {item.quantity}
             </span>
             <span className="text-[10px] block text-stone-400 -mt-1">{item.unit}</span>
          </div>
          <button 
            onClick={() => onUpdateQuantity(item.id, 1)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm active:scale-95 ${isEmergency ? 'bg-stone-700 text-white hover:bg-stone-600' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      {/* Survival Badge for Emergency Mode */}
      {isEmergency && isEmergencySafe && (
        <div className="absolute -top-2 -left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 border border-green-400 z-10">
           <AlertTriangle size={10} /> そのまま喫食可
        </div>
      )}
    </div>
  );
};