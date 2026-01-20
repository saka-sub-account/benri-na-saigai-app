import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, ChefHat, ShoppingCart, Home, ScanLine, ArrowLeft, ExternalLink, Loader2, Package, Check, Plus, Camera, CheckCircle2 } from 'lucide-react';
import { InventoryItem, ShoppingItem, ViewState } from './types';
import { InventoryCard } from './components/InventoryCard';
import { Scanner } from './components/Scanner';
import { AddManual } from './components/AddManual';
import { Button } from './components/Button';
import { HomeDashboard } from './components/HomeDashboard';
import { getAdvisorSuggestion, getRestockDetails, getEmergencyActions } from './services/geminiService';

const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: '保存水 (2L)', quantity: 6, maxQuantity: 12, unit: '本', expiryDate: '2025-05-10', category: 'water', isRollingStock: true, location: 'pantry', requiresFire: false, requiresWater: false, calories: 0 },
  { id: '2', name: 'アルファ米', quantity: 5, maxQuantity: 10, unit: '袋', expiryDate: '2024-12-01', category: 'staple', isRollingStock: true, location: 'pantry', requiresFire: true, requiresWater: true, calories: 300 },
  { id: '3', name: 'ツナ缶', quantity: 3, maxQuantity: 6, unit: '缶', expiryDate: '2026-08-20', category: 'main', isRollingStock: true, location: 'pantry', requiresFire: false, requiresWater: false, calories: 150 },
  { id: '4', name: '栄養バー', quantity: 2, maxQuantity: 5, unit: '本', expiryDate: '2024-03-15', category: 'other', isRollingStock: false, location: 'emergency_bag', requiresFire: false, requiresWater: false, calories: 200 },
];

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [view, setView] = useState<ViewState>('home'); // Default to home
  const [isEmergency, setIsEmergency] = useState(false);
  const [scannedData, setScannedData] = useState<Partial<InventoryItem> | null>(null);
  
  // Save Notification State
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  
  // Advisor State
  const [advice, setAdvice] = useState<{title: string, description: string, itemsUsed: string[]}[]>([]);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  
  // Emergency Actions State
  const [emergencyActions, setEmergencyActions] = useState<string[]>([]);

  // --- Logic ---

  // 自動補充ロジック: 在庫変更を監視し、不足分を買い物リストへ同期
  useEffect(() => {
    let updatedList = [...shoppingList];
    let hasChanges = false;
    const itemsToFetchAI: string[] = [];

    inventory.forEach(invItem => {
        if (invItem.isRollingStock) {
            const max = invItem.maxQuantity || 0;
            const current = invItem.quantity;
            const deficit = Math.max(0, max - current);

            // 買い物リスト内の既存の未チェック項目を探す
            const idx = updatedList.findIndex(si => si.name === invItem.name && !si.checked);

            if (deficit > 0) {
                if (idx >= 0) {
                    // 既存あり: 数量が違う場合のみ更新
                    if (updatedList[idx].quantity !== deficit) {
                        updatedList[idx] = { ...updatedList[idx], quantity: deficit };
                        hasChanges = true;
                    }
                } else {
                    // 新規追加
                    const newItem: ShoppingItem = {
                        id: crypto.randomUUID(),
                        name: invItem.name,
                        quantity: deficit,
                        addedAt: new Date().toISOString(),
                        checked: false,
                        isLoading: true,
                        aiReason: "目標数を下回っています"
                    };
                    updatedList.push(newItem);
                    itemsToFetchAI.push(invItem.name);
                    hasChanges = true;
                }
            } else {
                // 不足なし(充足した): リストにあれば削除 (自動クリーンアップ)
                if (idx >= 0) {
                    updatedList.splice(idx, 1);
                    hasChanges = true;
                }
            }
        }
    });

    if (hasChanges) {
        setShoppingList(updatedList);
        // 新規追加アイテムに対してAI検索を実行
        itemsToFetchAI.forEach(name => {
            getRestockDetails(name).then(details => {
                setShoppingList(currentList => currentList.map(item => {
                    if (item.name === name && item.isLoading) {
                        return {
                            ...item,
                            isLoading: false,
                            amazonQuery: details.searchQuery,
                            aiReason: details.reason
                        };
                    }
                    return item;
                }));
            }).catch(e => {
                 console.error(e);
                 setShoppingList(currentList => currentList.map(item => {
                    if (item.name === name && item.isLoading) {
                        return { ...item, isLoading: false, aiReason: "自動追加" };
                    }
                    return item;
                }));
            });
        });
    }
    // shoppingListを依存配列に入れるとループする可能性があるため、inventoryのみ監視し、
    // 内部でfunctional updateや現在値のコピーを使用する設計とするが、
    // ここではupdatedListを作成時にshoppingListを参照しているため、
    // 本来は依存配列が必要だが、無限ループ防止のためロジック内で完結させる。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory]);

  const handleUpdateQuantity = (id: string, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleUpdateItem = (id: string, updates: Partial<InventoryItem>) => {
      setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const toggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleScanComplete = (data: Partial<InventoryItem>) => {
    setScannedData(data);
    setView('add');
  };

  const handleSaveItem = (newItem: InventoryItem) => {
    setInventory(prev => [newItem, ...prev]);
    setScannedData(null);
    setView('inventory');
  };
  
  const handleSaveSettings = () => {
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 2000);
  };

  const fetchAdvice = async () => {
    setLoadingAdvice(true);
    const suggestions = await getAdvisorSuggestion(inventory, isEmergency);
    setAdvice(suggestions);
    setLoadingAdvice(false);
  };
  
  const fetchEmergencyActions = async () => {
    setEmergencyActions([]); // Clear old
    const actions = await getEmergencyActions(inventory);
    setEmergencyActions(actions);
  };

  useEffect(() => {
    if (view === 'advisor') {
      fetchAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isEmergency]);
  
  // Trigger Emergency AI Analysis when mode switches
  useEffect(() => {
    if (isEmergency) {
       fetchEmergencyActions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmergency]);

  // --- Theme Classes ---
  const bgClass = isEmergency ? 'bg-stone-900' : 'bg-stone-50';
  const textClass = isEmergency ? 'text-stone-100' : 'text-stone-800';
  const navClass = isEmergency ? 'bg-stone-800 border-t border-stone-700' : 'bg-white border-t border-stone-200';
  const headerClass = isEmergency ? 'bg-emergency-600 text-white shadow-red-900/50' : 'bg-white text-stone-800 shadow-sm';

  // --- Renders ---

  const renderContent = () => {
    switch(view) {
      case 'home':
        return <HomeDashboard inventory={inventory} isEmergency={isEmergency} onNavigate={setView} aiActions={emergencyActions} />;

      case 'scan':
        return <Scanner onScanComplete={handleScanComplete} onClose={() => setView('inventory')} isEmergency={isEmergency} />;
      
      case 'add':
        return <AddManual 
          initialData={scannedData || {}} 
          onSave={handleSaveItem} 
          onCancel={() => { setScannedData(null); setView('inventory'); }} 
          isEmergency={isEmergency}
        />;

      case 'shopping':
        return (
          <div className="p-4 space-y-4 pb-24">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">自動補充リスト</h2>
                <div className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                   <Wifi size={10} /> AI Agent Active
                </div>
             </div>
             <p className={`text-sm mb-4 ${isEmergency ? 'text-stone-400' : 'text-stone-500'}`}>
               目標備蓄数を下回っているアイテムが自動で追加されています。
             </p>

             {shoppingList.length === 0 ? (
               <div className="text-center py-16 opacity-50 border-2 border-dashed border-stone-300 rounded-xl">
                 <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                 <p>現在、補充が必要なアイテムはありません。</p>
                 <p className="text-sm mt-1">備蓄は十分です！</p>
               </div>
             ) : (
               shoppingList.map(item => (
                 <div key={item.id} className={`flex flex-col p-4 rounded-xl shadow-sm border transition-all ${item.checked ? 'opacity-50' : ''} ${isEmergency ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-3">
                           <input 
                             type="checkbox" 
                             checked={item.checked} 
                             onChange={() => toggleShoppingItem(item.id)}
                             className={`w-5 h-5 rounded cursor-pointer ${isEmergency ? 'accent-emergency-500' : 'accent-brand-500'}`}
                           />
                           <div>
                               <div className="flex items-baseline gap-2">
                                  <span className={`font-bold text-lg ${item.checked ? 'line-through' : ''}`}>{item.name}</span>
                                  <span className="text-sm font-bold bg-stone-100 text-stone-800 px-2 py-0.5 rounded-full">+{item.quantity}個</span>
                               </div>
                               {!item.checked && (
                                   <div className={`text-xs flex items-center gap-1 mt-0.5 ${item.isLoading ? 'text-brand-500' : 'text-stone-500'}`}>
                                      {item.isLoading ? (
                                        <><Loader2 size={10} className="animate-spin" /> AIが商品を検索中...</>
                                      ) : (
                                        <span className="text-orange-600 font-medium">{item.aiReason}</span>
                                      )}
                                   </div>
                               )}
                           </div>
                       </div>
                    </div>
                    
                    {!item.checked && (
                        <div className="mt-2 pl-8">
                            <a 
                                href={`https://www.amazon.co.jp/s?k=${encodeURIComponent(item.amazonQuery || item.name)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bold text-sm shadow-sm transition-transform active:scale-95 ${item.isLoading ? 'bg-stone-200 text-stone-400 pointer-events-none' : 'bg-[#FF9900] text-white hover:bg-[#ffad33]'}`}
                            >
                                <ShoppingCart size={16} />
                                {item.isLoading ? '準備中...' : 'Amazonで購入'}
                                <ExternalLink size={14} className="opacity-70" />
                            </a>
                        </div>
                    )}
                 </div>
               ))
             )}
          </div>
        );

      case 'advisor':
        return (
          <div className="p-4 space-y-6 pb-24">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">AI管理栄養士</h2>
              <Button size="sm" variant="secondary" onClick={fetchAdvice} isEmergency={isEmergency}>更新</Button>
            </div>
            
            {loadingAdvice ? (
              <div className="py-20 text-center animate-pulse">
                <ChefHat size={48} className="mx-auto mb-4 opacity-50" />
                <p>{isEmergency ? 'サバイバルマニュアル' : 'レシピブック'}を参照中...</p>
              </div>
            ) : (
              advice.map((rec, idx) => (
                <div key={idx} className={`p-5 rounded-xl border ${isEmergency ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-100'} shadow-sm`}>
                   <h3 className={`font-bold text-lg mb-2 ${isEmergency ? 'text-emergency-400' : 'text-brand-600'}`}>{rec.title}</h3>
                   <p className="text-sm opacity-80 mb-4 leading-relaxed">{rec.description}</p>
                   <div className="flex flex-wrap gap-2">
                      {rec.itemsUsed.map(i => (
                        <span key={i} className={`text-xs px-2 py-1 rounded-full ${isEmergency ? 'bg-stone-700' : 'bg-stone-100'}`}>
                          {i}
                        </span>
                      ))}
                   </div>
                </div>
              ))
            )}
          </div>
        );

      case 'inventory':
      default:
        return (
          <div className="p-4 pb-48">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {inventory.map(item => (
                <InventoryCard 
                  key={item.id} 
                  item={item} 
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdateItem={handleUpdateItem}
                  isEmergency={isEmergency}
                />
              ))}
            </div>
            
            {/* Save Notification Toast */}
            <div className={`fixed top-20 left-0 w-full flex justify-center z-50 transition-all duration-300 pointer-events-none ${showSaveNotification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <div className="bg-black/80 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 backdrop-blur-md shadow-xl">
                    <CheckCircle2 size={18} className="text-green-400" />
                    変更を保存しました
                </div>
            </div>
            
            <div className="fixed bottom-24 left-0 w-full px-4 flex flex-col gap-3 z-30 pointer-events-none">
                <div className="flex items-end gap-3 w-full pointer-events-auto">
                    {/* Camera Button (Small, Left) */}
                    <button 
                        onClick={() => setView('scan')} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 border mb-1 ${isEmergency ? 'bg-stone-800 border-stone-600 text-white' : 'bg-white border-stone-100 text-stone-600'}`}
                    >
                        <Camera size={20} />
                    </button>

                    {/* Action Group */}
                    <div className="flex-1 flex flex-col gap-2">
                         {/* Manual Add Button */}
                        <button 
                            onClick={() => setView('add')} 
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full shadow-md transition-transform active:scale-95 border ${isEmergency ? 'bg-stone-800 text-white border-stone-600' : 'bg-white text-stone-800 border-stone-100'}`}
                        >
                            <Plus size={16} className={isEmergency ? 'text-stone-400' : 'text-brand-500'} />
                            <span className="font-bold text-sm">手動で追加</span>
                        </button>

                         {/* Save Button */}
                        <Button 
                        size="md" 
                        onClick={handleSaveSettings}
                        className={`w-full shadow-lg transition-all active:scale-95 ${isEmergency ? 'bg-stone-700 hover:bg-stone-600' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
                        >
                        <Check size={18} /> 設定を保存
                        </Button>
                    </div>
                </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${bgClass} ${textClass}`}>
      {/* Header */}
      {view !== 'scan' && (
        <header className={`sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-md transition-colors duration-500 ${headerClass}`}>
           <div className="flex items-center gap-2">
             {view !== 'home' && (
               <button onClick={() => setView('home')} className="mr-1">
                 <ArrowLeft size={20} />
               </button>
             )}
             <span className="font-black text-xl tracking-tight">Stock<span className="font-light opacity-80">Manager</span></span>
           </div>
           
           <button 
             onClick={() => setIsEmergency(!isEmergency)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isEmergency ? 'bg-white text-red-600' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
           >
             <AlertTriangle size={14} className={isEmergency ? 'animate-pulse' : ''} />
             {isEmergency ? '緊急モード ON' : '通常モード'}
           </button>
        </header>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto h-full">
        {renderContent()}
      </main>

      {/* Bottom Nav */}
      {view !== 'scan' && view !== 'add' && (
        <nav className={`fixed bottom-0 w-full z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-colors duration-500 ${navClass}`}>
          <div className="max-w-3xl mx-auto flex justify-around items-center h-16 px-2 relative">
             <button 
               onClick={() => setView('home')}
               className={`flex flex-col items-center p-2 transition-colors ${view === 'home' ? (isEmergency ? 'text-emergency-500' : 'text-brand-600') : 'opacity-40 hover:opacity-100'}`}
             >
               <Home size={24} />
               <span className="text-[10px] font-medium mt-1">ホーム</span>
             </button>

             <button 
               onClick={() => setView('inventory')}
               className={`flex flex-col items-center p-2 transition-colors ${view === 'inventory' ? (isEmergency ? 'text-emergency-500' : 'text-brand-600') : 'opacity-40 hover:opacity-100'}`}
             >
               <Package size={24} />
               <span className="text-[10px] font-medium mt-1">在庫</span>
             </button>

             <button 
               onClick={() => setView('advisor')}
               className={`flex flex-col items-center p-2 transition-colors ${view === 'advisor' ? (isEmergency ? 'text-emergency-500' : 'text-brand-600') : 'opacity-40 hover:opacity-100'}`}
             >
               <ChefHat size={24} />
               <span className="text-[10px] font-medium mt-1">提案</span>
             </button>

             <button 
               onClick={() => setView('shopping')}
               className={`flex flex-col items-center p-2 transition-colors ${view === 'shopping' ? (isEmergency ? 'text-emergency-500' : 'text-brand-600') : 'opacity-40 hover:opacity-100'}`}
             >
               <div className="relative">
                 <ShoppingCart size={24} />
                 {shoppingList.filter(i => !i.checked).length > 0 && (
                   <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                     {shoppingList.filter(i => !i.checked).length}
                   </span>
                 )}
               </div>
               <span className="text-[10px] font-medium mt-1">買い物</span>
             </button>
          </div>
        </nav>
      )}
    </div>
  );
}