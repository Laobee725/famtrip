
import React, { useState } from 'react';
import { Trip, ChecklistItem, ChecklistCategory, Member } from '../types';

interface ChecklistViewProps {
  trip: Trip;
  onUpdate: (updates: Partial<Trip>) => void;
}

const COLOR_OPTIONS = [
  'bg-[#FF9946]', 'bg-[#5096FF]', 'bg-[#46D38B]', 'bg-[#AF8BFF]', 'bg-[#FFC738]', 'bg-[#FF6B6B]',
  'bg-[#4FC3F7]', 'bg-[#BA68C8]', 'bg-[#FF8A65]', 'bg-[#AED581]', 'bg-[#90A4AE]', 'bg-[#F06292]',
  'bg-[#26A69A]', 'bg-[#7986CB]', 'bg-[#D4E157]', 'bg-[#FFD54F]', 'bg-[#A1887F]', 'bg-[#9CCC65]',
  'bg-[#00ACC1]', 'bg-[#8E24AA]', 'bg-[#C0392B]', 'bg-[#16A085]', 'bg-[#2C3E50]', 'bg-[#F39C12]'
];

const ICON_OPTIONS = [
  'fa-hotel', 'fa-passport', 'fa-users', 'fa-user', 'fa-cart-shopping', 'fa-suitcase', 
  'fa-camera', 'fa-plane', 'fa-medicine-bottle', 'fa-plug', 'fa-umbrella', 'fa-shirt',
  'fa-person-swimming', 'fa-mountain', 'fa-compass', 'fa-ticket', 'fa-credit-card', 
  'fa-charging-station', 'fa-wine-glass', 'fa-map-pin', 'fa-car', 'fa-glasses', 'fa-wifi', 
  'fa-battery-full', 'fa-baby-carriage', 'fa-baby', 'fa-paw', 'fa-bicycle', 'fa-bus', 
  'fa-train', 'fa-ship', 'fa-map', 'fa-headphones', 'fa-mobile-screen', 'fa-laptop', 'fa-wallet'
];

const ChecklistView: React.FC<ChecklistViewProps> = ({ trip, onUpdate }) => {
  const { checklist: items = [], checklistCategories: categories = [], members = [] } = trip;
  
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isBatchAddModalOpen, setIsBatchAddModalOpen] = useState(false);
  const [batchTargetCatId, setBatchTargetCatId] = useState<string | null>(null);
  const [batchInput, setBatchInput] = useState('');
  const [batchAssigneeIds, setBatchAssigneeIds] = useState<string[]>([]);
  
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingCat, setEditingCat] = useState<ChecklistCategory | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);

  const [catToDelete, setCatToDelete] = useState<ChecklistCategory | null>(null);

  const toggleCollapse = (id: string) => {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedIds(next);
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCats = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCats.length) return;
    [newCats[index], newCats[targetIndex]] = [newCats[targetIndex], newCats[index]];
    onUpdate({ checklistCategories: newCats });
  };

  const handleSaveCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const label = fd.get('label') as string;
    const icon = fd.get('icon') as string;
    const color = fd.get('color') as string;
    if (!label) return;
    if (editingCat) {
      const updated = categories.map(c => c.id === editingCat.id ? { ...c, label, icon, color } : c);
      onUpdate({ checklistCategories: updated });
    } else {
      const newCat: ChecklistCategory = { id: `cat_${Date.now()}`, label, en: '', icon, color };
      onUpdate({ checklistCategories: [...categories, newCat] });
    }
    setIsCatModalOpen(false);
    setEditingCat(null);
  };

  const handleBatchAdd = () => {
    if (!batchTargetCatId || !batchInput.trim()) return;
    const lines = batchInput.split('\n').filter(line => line.trim() !== '');
    const newItems: ChecklistItem[] = lines.map(line => ({
      id: `${Date.now()}-${Math.random()}`,
      category: batchTargetCatId,
      title: line.trim(),
      isDone: false,
      assigneeIds: batchAssigneeIds
    }));
    onUpdate({ checklist: [...items, ...newItems] });
    setIsBatchAddModalOpen(false);
    setBatchInput('');
    setBatchTargetCatId(null);
    setBatchAssigneeIds([]);
    const next = new Set(collapsedIds);
    next.delete(batchTargetCatId);
    setCollapsedIds(next);
  };

  const toggleItem = (id: string) => {
    onUpdate({ checklist: items.map(i => i.id === id ? { ...i, isDone: !i.isDone } : i) });
  };

  const deleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onUpdate({ checklist: items.filter(i => i.id !== id) });
  };

  const updateItemTitle = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    onUpdate({ checklist: items.map(i => i.id === id ? { ...i, title: newTitle.trim() } : i) });
    setEditingItemId(null);
  };

  const toggleAssignee = (itemId: string, memberId: string) => {
    const updated = items.map(i => {
      if (i.id !== itemId) return i;
      const ids = i.assigneeIds || [];
      const nextIds = ids.includes(memberId) ? ids.filter(id => id !== memberId) : [...ids, memberId];
      return { ...i, assigneeIds: nextIds };
    });
    onUpdate({ checklist: updated });
  };

  const confirmDeleteCategory = () => {
    if (!catToDelete) return;
    onUpdate({
      checklistCategories: categories.filter(c => c.id !== catToDelete.id),
      checklist: items.filter(i => i.category !== catToDelete.id)
    });
    setCatToDelete(null);
  };

  return (
    <div className="min-h-screen p-5 pb-48 animate-fadeIn space-y-6 bg-[#F0F4F7] text-left overflow-x-hidden">
      <header className="px-1 mt-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] font-black text-[#00A5BF] tracking-[0.2em] mb-1 uppercase">PACKING LIST</p>
            <h2 className="text-3xl font-black text-stone-900 tracking-tighter leading-none">準備清單</h2>
          </div>
          <button 
            onClick={() => { setEditingCat(null); setIsCatModalOpen(true); }}
            className="w-10 h-10 rounded-full bg-white text-[#00A5BF] shadow-lg border border-white flex items-center justify-center active:scale-95 transition-all hover:rotate-90"
            title="新增分類"
          >
            <i className="fa-solid fa-plus text-sm"></i>
          </button>
        </div>
        <button 
          onClick={() => setIsManageMode(!isManageMode)}
          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all shadow-sm ${
            isManageMode ? 'bg-[#00A5BF] text-white shadow-[#00A5BF]/20' : 'bg-white text-[#00A5BF] border border-stone-100'
          }`}
        >
          {isManageMode ? '完成設定' : '管理分類'}
        </button>
      </header>

      {categories.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-12 text-center border-2 border-dashed border-gray-100 animate-fadeIn">
          <i className="fa-solid fa-clipboard-list text-5xl text-gray-100 mb-6"></i>
          <h4 className="text-lg font-black text-stone-800 mb-2 tracking-tight">清單目前是空的</h4>
          <p className="text-stone-300 font-bold mb-10 text-xs leading-relaxed">請先點擊上方「+」按鈕新增分類吧！</p>
          <button 
            onClick={() => { setEditingCat(null); setIsCatModalOpen(true); }}
            className="bg-[#00A5BF] text-white px-10 py-4 rounded-2xl font-black shadow-lg uppercase tracking-widest text-[11px] active:scale-95 transition-all"
          >
            + 建立第一個分類
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat, idx) => {
            const catItems = items.filter(i => i.category === cat.id);
            const isCollapsed = collapsedIds.has(cat.id);
            
            return (
              <div key={cat.id} className="space-y-2">
                <div 
                  onClick={() => !isManageMode && toggleCollapse(cat.id)}
                  className="group relative bg-white p-5 rounded-[2.5rem] shadow-sm border border-white flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4">
                    {isManageMode && (
                      <div className="flex flex-col gap-1 pr-3 border-r border-stone-50 mr-1">
                        <button onClick={(e) => { e.stopPropagation(); moveCategory(idx, 'up'); }} className="text-stone-300 hover:text-[#00A5BF]"><i className="fa-solid fa-caret-up text-[10px]"></i></button>
                        <button onClick={(e) => { e.stopPropagation(); moveCategory(idx, 'down'); }} className="text-stone-300 hover:text-[#00A5BF]"><i className="fa-solid fa-caret-down text-[10px]"></i></button>
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-[1.2rem] ${cat.color} flex items-center justify-center text-white shadow-md shrink-0`}>
                      <i className={`fa-solid ${cat.icon} text-2xl`}></i>
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-stone-800 leading-none">{cat.label}</h3>
                        <span className="text-[10px] bg-stone-50 text-stone-400 px-2 py-0.5 rounded-full font-black">{catItems.length}</span>
                      </div>
                      <p className="text-[9px] font-black text-stone-200 uppercase mt-1.5 tracking-widest">{catItems.filter(i=>i.isDone).length}/{catItems.length} 已確認</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isManageMode ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setIsCatModalOpen(true); }}
                          className="w-10 h-10 rounded-full bg-stone-50 text-[#00A5BF] flex items-center justify-center active:scale-90 transition-all border border-stone-100"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCatToDelete(cat); }}
                          className="w-10 h-10 rounded-full bg-red-50/50 text-red-500 flex items-center justify-center active:scale-90 transition-all border border-red-50"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setBatchTargetCatId(cat.id); setBatchAssigneeIds([]); setIsBatchAddModalOpen(true); }}
                          className="w-10 h-10 rounded-full bg-stone-50 text-stone-300 hover:bg-[#00A5BF] hover:text-white flex items-center justify-center active:scale-90 transition-all shadow-inner"
                        >
                          <i className="fa-solid fa-plus text-xs"></i>
                        </button>
                        <div className={`text-stone-200 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}>
                          <i className="fa-solid fa-chevron-down text-[10px]"></i>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {!isCollapsed && (
                  <div className="pl-2 space-y-2 animate-fadeIn">
                    {catItems.length > 0 ? (
                      catItems.map(item => {
                        const itemAssignees = members.filter(m => item.assigneeIds?.includes(m.id));
                        return (
                          <div key={item.id} className="space-y-2">
                            <div className="group relative bg-white/60 hover:bg-white p-4 rounded-[2rem] border border-white shadow-sm flex items-center justify-between transition-all">
                              <div className="flex items-center gap-4 flex-grow">
                                <div 
                                  onClick={() => toggleItem(item.id)}
                                  className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                                    item.isDone ? 'bg-[#00A5BF] border-[#00A5BF] shadow-lg shadow-[#00A5BF]/20' : 'border-stone-100 bg-white'
                                  }`}
                                >
                                  {item.isDone && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                                </div>

                                {editingItemId === item.id ? (
                                  <input 
                                    autoFocus
                                    className="bg-transparent border-b-2 border-[#00A5BF] font-black text-stone-700 outline-none w-full text-sm"
                                    defaultValue={item.title}
                                    onBlur={(e) => updateItemTitle(item.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && updateItemTitle(item.id, e.currentTarget.value)}
                                  />
                                ) : (
                                  <span 
                                    onClick={() => setEditingItemId(item.id)}
                                    className={`text-sm font-black transition-all cursor-text flex-grow text-left ${
                                      item.isDone ? 'text-stone-300 line-through' : 'text-stone-700'
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pr-1">
                                 <div 
                                   onClick={() => setAssigningItemId(assigningItemId === item.id ? null : item.id)}
                                   className="flex -space-x-3 cursor-pointer active:scale-95 transition-all"
                                 >
                                    {itemAssignees.length > 0 ? (
                                      itemAssignees.map(m => (
                                        <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white bg-stone-50 overflow-hidden shadow-sm flex items-center justify-center text-[#00A5BF]">
                                          {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black">{m.name[0]}</span>}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="w-8 h-8 rounded-full border border-dashed border-stone-200 flex items-center justify-center text-stone-300 text-[10px]">
                                         <i className="fa-solid fa-user-plus scale-75"></i>
                                      </div>
                                    )}
                                 </div>
                                 <button 
                                  onClick={(e) => deleteItem(e, item.id)}
                                  className="w-8 h-8 flex items-center justify-center text-stone-200 hover:text-red-400 opacity-0 group-hover:opacity-100 active:scale-90 transition-all"
                                >
                                  <i className="fa-solid fa-trash-can text-xs"></i>
                                </button>
                              </div>
                            </div>
                            
                            {assigningItemId === item.id && (
                              <div className="bg-white p-6 rounded-[2.5rem] flex flex-wrap gap-2 animate-fadeIn border border-white mx-3 shadow-inner">
                                 <span className="text-[10px] font-black text-stone-400 uppercase w-full mb-2 tracking-widest pl-2">指派給...</span>
                                 {members.map(m => {
                                   const isSelected = item.assigneeIds?.includes(m.id);
                                   return (
                                     <button 
                                       key={m.id}
                                       onClick={() => toggleAssignee(item.id, m.id)}
                                       className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all border ${isSelected ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-100 text-stone-400'}`}
                                     >
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-stone-50 flex items-center justify-center">
                                          {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" /> : <span className="text-[8px] font-black">{m.name[0]}</span>}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider">{m.name}</span>
                                     </button>
                                   );
                                 })}
                                 <button onClick={() => setAssigningItemId(null)} className="ml-auto text-[#00A5BF] px-4 py-2 text-[10px] font-black uppercase">完成設定</button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      !isManageMode && (
                        <div className="py-2 px-8">
                          <p className="text-[10px] font-black text-stone-200 uppercase tracking-[0.2em] italic">暫無清單項目</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 刪除確認視窗 */}
      {catToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setCatToDelete(null)}></div>
          <div className="relative w-full max-w-xs bg-white rounded-[3rem] p-10 shadow-2xl animate-slideUp text-center border border-white/20">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h4 className="text-xl font-black text-stone-800 mb-3 tracking-tighter">確定要刪除分類嗎？</h4>
            <p className="text-[11px] text-stone-400 font-bold leading-relaxed mb-8 px-2">
              「{catToDelete.label}」及其下的所有項目將被永久移除。
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDeleteCategory} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-[11px] shadow-lg active:scale-95 transition-all uppercase tracking-widest">確定刪除</button>
              <button onClick={() => setCatToDelete(null)} className="w-full bg-stone-100 text-stone-400 py-4 rounded-2xl font-black text-[11px] active:scale-95 transition-all uppercase tracking-widest">取消返回</button>
            </div>
          </div>
        </div>
      )}

      {/* 批次新增項目 Modal */}
      {isBatchAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => setIsBatchAddModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[3.5rem] p-10 shadow-2xl animate-slideUp text-left overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-stone-900 tracking-tighter">批次新增清單</h3>
              <button onClick={() => setIsBatchAddModalOpen(false)} className="text-stone-300"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <p className="text-[10px] font-black text-stone-300 uppercase mb-4 tracking-widest leading-relaxed">每一行輸入一個項目，我們將自動為您分行</p>
            <textarea 
              autoFocus rows={6} value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
              placeholder="護照&#10;充電器&#10;行動電源..."
              className="w-full bg-stone-50 rounded-[2rem] p-6 font-black text-stone-700 border-none outline-none focus:ring-2 focus:ring-[#00A5BF] resize-none mb-8 text-sm placeholder:text-stone-200"
            ></textarea>
            <div className="mb-8">
               <label className="text-[10px] font-black text-stone-300 uppercase mb-4 block tracking-widest">預設指派成員</label>
               <div className="flex flex-wrap gap-2">
                  {members.map(m => {
                    const isSelected = batchAssigneeIds.includes(m.id);
                    return (
                      <button 
                        key={m.id}
                        onClick={() => setBatchAssigneeIds(prev => isSelected ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all ${isSelected ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-100 text-stone-400'}`}
                      >
                         <div className="w-5 h-5 rounded-full overflow-hidden bg-stone-50 flex items-center justify-center">
                           {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" /> : <span className="text-[8px] font-black">{m.name[0]}</span>}
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-wider">{m.name}</span>
                      </button>
                    );
                  })}
               </div>
            </div>
            <button onClick={handleBatchAdd} className="w-full bg-stone-900 text-white py-5 rounded-full font-black text-[11px] shadow-xl active:scale-95 transition-all tracking-[0.2em] uppercase">確認新增至分類</button>
          </div>
        </div>
      )}

      {/* 編輯/新增分類 Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-md" onClick={() => setIsCatModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[4rem] p-10 shadow-2xl animate-slideUp text-left overflow-y-auto max-h-[85vh] no-scrollbar">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-2xl font-black text-stone-900 tracking-tighter">{editingCat ? '編輯清單分類' : '新增清單分類'}</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-stone-300"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-stone-300 uppercase block tracking-widest mb-4">分類名稱 (Label)</label>
                <input name="label" required defaultValue={editingCat?.label} placeholder="例如：藥妝、隨身包" className="w-full bg-stone-50 rounded-2xl px-6 py-5 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF] text-sm shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-300 uppercase mb-4 block tracking-widest">選擇圖示 (Icon)</label>
                <div className="grid grid-cols-6 gap-3 max-h-48 overflow-y-auto no-scrollbar py-2 px-1">
                  {ICON_OPTIONS.map(icon => (
                    <label key={icon} className="cursor-pointer">
                      <input type="radio" name="icon" value={icon} defaultChecked={editingCat ? editingCat.icon === icon : icon === 'fa-hotel'} className="hidden peer" />
                      <div className="w-full aspect-square bg-stone-50 rounded-2xl flex items-center justify-center text-stone-200 peer-checked:bg-[#00A5BF] peer-checked:text-white transition-all shadow-sm">
                        <i className={`fa-solid ${icon} text-lg`}></i>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-300 uppercase mb-4 block tracking-widest">主題配色 (Theme Color)</label>
                <div className="grid grid-cols-8 gap-3 max-h-32 overflow-y-auto no-scrollbar py-2 px-1">
                  {COLOR_OPTIONS.map(color => (
                    <label key={color} className="cursor-pointer">
                      <input type="radio" name="color" value={color} defaultChecked={editingCat ? editingCat.color === color : color === 'bg-[#FF9946]'} className="hidden peer" />
                      <div className={`w-full aspect-square rounded-xl ${color} border-4 border-transparent peer-checked:border-white peer-checked:shadow-lg transition-all`}></div>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-stone-900 text-white py-6 rounded-full font-black text-[11px] shadow-xl active:scale-95 transition-all tracking-[0.2em] uppercase">儲存分類變更</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistView;
