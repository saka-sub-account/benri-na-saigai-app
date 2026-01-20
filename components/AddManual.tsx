import React, { useState, useEffect } from 'react';
import { InventoryItem, CategoryType } from '../types';
import { Button } from './Button';
import { X } from 'lucide-react';

interface AddManualProps {
  initialData?: Partial<InventoryItem>;
  onSave: (item: InventoryItem) => void;
  onCancel: () => void;
  isEmergency: boolean;
}

export const AddManual: React.FC<AddManualProps> = ({ initialData, onSave, onCancel, isEmergency }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [unit, setUnit] = useState(initialData?.unit || '個');
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate || '');
  const [category, setCategory] = useState<CategoryType>(initialData?.category || 'staple');
  const [isRollingStock, setIsRollingStock] = useState(true);
  const [maxQuantity, setMaxQuantity] = useState(initialData?.maxQuantity || 5); // Default target
  const [notes, setNotes] = useState('');

  // Auto-fill expiry if not present (simple default)
  useEffect(() => {
    if (!expiryDate) {
       const d = new Date();
       d.setFullYear(d.getFullYear() + 1);
       setExpiryDate(d.toISOString().split('T')[0]);
    }
  }, [expiryDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: crypto.randomUUID(),
      name,
      quantity,
      maxQuantity,
      unit,
      expiryDate,
      category,
      isRollingStock,
      notes,
      location: 'pantry',
      requiresFire: false, // Default
      requiresWater: false, // Default
      calories: 0
    });
  };

  const inputClass = `w-full p-3 rounded-lg border focus:ring-2 outline-none transition-all ${isEmergency ? 'bg-stone-800 border-stone-700 text-white focus:ring-emergency-500' : 'bg-white border-stone-200 text-stone-900 focus:ring-brand-500'}`;
  const labelClass = `block text-sm font-medium mb-1 ${isEmergency ? 'text-stone-300' : 'text-stone-600'}`;

  return (
    <div className={`p-4 pb-24 h-full overflow-y-auto ${isEmergency ? 'bg-stone-900' : 'bg-stone-50'}`}>
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
           <h2 className={`text-2xl font-bold ${isEmergency ? 'text-white' : 'text-stone-800'}`}>アイテム追加</h2>
           <button onClick={onCancel} className={`p-2 rounded-full ${isEmergency ? 'text-white hover:bg-white/10' : 'text-stone-500 hover:bg-black/5'}`}>
             <X size={24} />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>商品名</label>
            <input 
              required
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className={inputClass}
              placeholder="例: ツナ缶"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className={labelClass}>数量</label>
                <input 
                  type="number" 
                  min="1"
                  value={quantity} 
                  onChange={e => setQuantity(parseInt(e.target.value))} 
                  className={inputClass}
                />
             </div>
             <div>
                <label className={labelClass}>単位</label>
                <input 
                  type="text" 
                  value={unit} 
                  onChange={e => setUnit(e.target.value)} 
                  className={inputClass}
                  placeholder="例: 缶, 袋"
                />
             </div>
          </div>

          <div>
             <label className={labelClass}>賞味期限</label>
             <input 
               type="date" 
               value={expiryDate} 
               onChange={e => setExpiryDate(e.target.value)} 
               className={inputClass}
             />
          </div>

          <div>
             <label className={labelClass}>カテゴリ</label>
             <select 
               value={category} 
               onChange={e => setCategory(e.target.value as CategoryType)} 
               className={inputClass}
             >
                <option value="staple">主食 (米・パンなど)</option>
                <option value="water">水・飲料</option>
                <option value="main">主菜 (肉・魚など)</option>
                <option value="side">副菜 (野菜・スープなど)</option>
                <option value="hygiene">衛生用品</option>
                <option value="other">その他</option>
             </select>
          </div>
          
          <div className={`p-4 rounded-lg border ${isEmergency ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
             <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className={`font-medium ${isEmergency ? 'text-white' : 'text-stone-900'}`}>ローリングストック</h4>
                    <p className={`text-xs ${isEmergency ? 'text-stone-400' : 'text-stone-500'}`}>消費分を自動で補充リストへ</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isRollingStock} onChange={e => setIsRollingStock(e.target.checked)} className="sr-only peer" />
                    <div className={`w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isEmergency ? 'peer-checked:bg-emergency-600' : 'peer-checked:bg-brand-500'}`}></div>
                </label>
             </div>
             
             {isRollingStock && (
                 <div className="flex items-center gap-4 mt-2 border-t pt-2 border-dashed border-stone-300">
                    <label className={`${labelClass} mb-0`}>目標備蓄数 (Max)</label>
                    <input 
                        type="number"
                        min="1"
                        value={maxQuantity}
                        onChange={e => setMaxQuantity(parseInt(e.target.value))}
                        className={`w-20 p-2 rounded text-center border outline-none ${isEmergency ? 'bg-stone-700 border-stone-600' : 'bg-stone-50 border-stone-300'}`}
                    />
                 </div>
             )}
          </div>

          <div>
             <label className={labelClass}>メモ</label>
             <textarea 
               value={notes}
               onChange={e => setNotes(e.target.value)}
               className={inputClass}
               rows={3}
               placeholder="保管場所、味、調理方法など"
             />
          </div>

          <div className="pt-4">
             <Button type="submit" className="w-full" size="lg" isEmergency={isEmergency}>
               在庫に保存
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
};