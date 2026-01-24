import React, { useState, useEffect } from 'react';
import { Trip, Expense, Member, ExpenseSplit } from '../types';

interface WalletViewProps {
  trip: Trip;
  onUpdate: (expenses: Expense[]) => void;
}

const CATEGORIES = [
  { id: 'food', icon: 'fa-utensils', label: '餐飲', color: 'bg-orange-400' },
  { id: 'transport', icon: 'fa-car', label: '交通', color: 'bg-blue-400' },
  { id: 'hotel', icon: 'fa-bed', label: '住宿', color: 'bg-indigo-400' },
  { id: 'shopping', icon: 'fa-bag-shopping', label: '購物', color: 'bg-pink-400' },
  { id: 'ticket', icon: 'fa-ticket', label: '門票', color: 'bg-emerald-400' },
  { id: 'fun', icon: 'fa-gamepad', label: '娛樂', color: 'bg-purple-400' },
  { id: 'medical', icon: 'fa-briefcase-medical', label: '醫藥', color: 'bg-red-400' },
  { id: 'others', icon: 'fa-receipt', label: '雜項', color: 'bg-gray-400' },
];

const CURRENCIES = [
  { id: 'JPY', symbol: '¥', label: '日圓' },
  { id: 'TWD', symbol: '$', label: '台幣' },
  { id: 'USD', symbol: '$', label: '美金' },
  { id: 'CNY', symbol: '¥', label: '人民幣' },
  { id: 'THB', symbol: '฿', label: '泰銖' },
];

const WalletView: React.FC<WalletViewProps> = ({ trip, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // 表單狀態
  const [form, setForm] = useState<{
    title: string;
    amount: string;
    currency: string;
    category: string;
    payerId: string;
    date: string;
    splits: { memberId: string; amount: string; selected: boolean }[];
  }>({
    title: '',
    amount: '',
    currency: 'JPY',
    category: 'food',
    payerId: trip.members[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    splits: trip.members.map(m => ({ memberId: m.id, amount: '0', selected: true }))
  });

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpenseId(expense.id);
      setForm({
        title: expense.title,
        amount: expense.amount.toString(),
        currency: expense.currency || 'JPY',
        category: expense.category,
        payerId: expense.payerId,
        date: expense.date,
        splits: trip.members.map(m => {
          const split = expense.splits.find(s => s.memberId === m.id);
          return {
            memberId: m.id,
            amount: split ? split.amount.toString() : '0',
            selected: !!split && split.amount > 0
          };
        })
      });
    } else {
      setEditingExpenseId(null);
      setForm({
        title: '',
        amount: '',
        currency: 'JPY',
        category: 'food',
        payerId: trip.members[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        splits: trip.members.map(m => ({ memberId: m.id, amount: '0', selected: true }))
      });
    }
    setIsModalOpen(true);
  };

  /**
   * 自動分攤邏輯優化：
   * 1. 統一支援 1 位小數點
   * 2. 採用「餘數補足」法，確保總額絕對平衡
   */
  const autoDistribute = (totalStr: string, currentSplits: typeof form.splits) => {
    const total = parseFloat(totalStr) || 0;
    const selectedMembers = currentSplits.filter(s => s.selected);
    const selectedCount = selectedMembers.length;
    
    if (selectedCount === 0) return currentSplits.map(s => ({ ...s, amount: '0' }));

    // 計算平均值，保留一位小數（直接捨去後面的位數）
    const avg = Math.floor((total / selectedCount) * 10) / 10;
    // 計算剩餘的差額（確保總額絕對不變）
    let remainder = Math.round((total - avg * selectedCount) * 10) / 10;

    return currentSplits.map(s => {
      if (!s.selected) return { ...s, amount: '0' };
      
      let finalAmt = avg;
      // 如果還有餘數，補在被選中的第一個成員身上
      if (remainder > 0) {
        finalAmt = Math.round((finalAmt + 0.1) * 10) / 10;
        remainder = Math.round((remainder - 0.1) * 10) / 10;
      }
      
      return { ...s, amount: finalAmt.toString() };
    });
  };

  const handleTotalAmountChange = (val: string) => {
    // 總金額輸入框直接更新字串，不准任何邏輯去動它
    const nextSplits = autoDistribute(val, form.splits);
    setForm({ ...form, amount: val, splits: nextSplits });
  };

  const toggleMemberSelection = (memberId: string) => {
    const nextSplits = form.splits.map(s => s.memberId === memberId ? { ...s, selected: !s.selected } : s);
    // 勾選變動時，依據「固定的總金額」重新分攤
    const updated = autoDistribute(form.amount, nextSplits);
    setForm({ ...form, splits: updated });
  };

  const handleSplitManualChange = (memberId: string, val: string) => {
    // 手動改某人的分攤金額，絕對不會影響到「總金額」
    setForm({
      ...form,
      splits: form.splits.map(s => s.memberId === memberId ? { ...s, amount: val } : s)
    });
  };

  const totalSplitAmount = form.splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  // 計算差距
  const diff = Math.round(((parseFloat(form.amount) || 0) - totalSplitAmount) * 10) / 10;
  // 判定是否平衡 (允許 0.05 以內的微小誤差)
  const isBalanced = Math.abs(diff) < 0.05;
  const isReadyToSave = isBalanced && (parseFloat(form.amount) || 0) > 0 && form.title.trim() !== '';

  const handleSave = () => {
    if (!isReadyToSave) return;
    const newExpense: Expense = {
      id: editingExpenseId || Date.now().toString(),
      title: form.title,
      amount: parseFloat(form.amount),
      currency: form.currency,
      category: form.category as any,
      payerId: form.payerId,
      date: form.date,
      splits: form.splits
        .filter(s => parseFloat(s.amount) > 0)
        .map(s => ({ memberId: s.memberId, amount: parseFloat(s.amount), ratio: 0 }))
    };

    let updatedExpenses;
    if (editingExpenseId) {
      updatedExpenses = trip.expenses.map(e => e.id === editingExpenseId ? newExpense : e);
    } else {
      updatedExpenses = [...trip.expenses, newExpense];
    }
    
    onUpdate(updatedExpenses);
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      onUpdate(trip.expenses.filter(e => e.id !== expenseToDelete.id));
      setExpenseToDelete(null);
      setIsModalOpen(false);
    }
  };

  const calculateMultiCurrencySettlement = () => {
    const currencies = [...new Set(trip.expenses.map(e => e.currency || 'JPY'))];
    return currencies.map(curr => {
      const balances: Record<string, number> = {};
      trip.members.forEach(m => balances[m.id] = 0);
      const currExpenses = trip.expenses.filter(e => (e.currency || 'JPY') === curr);
      currExpenses.forEach(ex => {
        balances[ex.payerId] += ex.amount;
        ex.splits.forEach(s => {
          balances[s.memberId] -= s.amount;
        });
      });
      const creditors = Object.entries(balances).filter(([_, b]) => b > 0.05).sort((a,b) => b[1] - a[1]);
      const debtors = Object.entries(balances).filter(([_, b]) => b < -0.05).sort((a,b) => a[1] - b[1]);
      const steps: { from: string; to: string; amount: number }[] = [];
      let i = 0, j = 0;
      const dCopy = debtors.map(d => [d[0], d[1]] as [string, number]);
      const cCopy = creditors.map(c => [c[0], c[1]] as [string, number]);
      while (i < dCopy.length && j < cCopy.length) {
        const amount = Math.min(-dCopy[i][1], cCopy[j][1]);
        steps.push({ from: dCopy[i][0], to: cCopy[j][0], amount });
        dCopy[i][1] += amount;
        cCopy[j][1] -= amount;
        if (Math.abs(dCopy[i][1]) < 0.05) i++;
        if (Math.abs(cCopy[j][1]) < 0.05) j++;
      }
      return { currency: curr, steps };
    }).filter(res => res.steps.length > 0);
  };

  const groupedExpenses = trip.expenses.reduce((groups: Record<string, Expense[]>, expense) => {
    const date = expense.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-6 pb-40 animate-fadeIn space-y-10 text-left bg-[#F0F4F7] min-h-screen">
      {/* 總覽區 */}
      <header className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-white">
        <p className="text-[10px] font-black text-[#00A5BF] opacity-60 mb-4 tracking-[0.2em] uppercase">Expense Summary</p>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {CURRENCIES.map(curr => {
            const sum = trip.expenses.filter(e => (e.currency || 'JPY') === curr.id).reduce((s, e) => s + e.amount, 0);
            if (sum === 0) return null;
            return (
              <div key={curr.id} className="flex flex-col">
                 <span className="text-[9px] font-black text-gray-300 uppercase">{curr.id} {curr.label}</span>
                 <p className="text-2xl font-black text-gray-800 tracking-tighter">{curr.symbol} {sum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</p>
              </div>
            );
          })}
          {trip.expenses.length === 0 && <p className="text-xl font-black text-gray-200">目前尚無支出</p>}
        </div>
      </header>

      <div className="flex justify-between items-center px-2">
        <h3 className="text-xl font-black text-gray-800 tracking-tighter">支出明細</h3>
        <div className="flex gap-3">
          <button onClick={() => setIsSettling(true)} className="bg-white text-gray-500 text-[10px] font-black px-6 py-3 rounded-2xl active:scale-95 transition-all shadow-sm border border-gray-100 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-scale-balanced"></i> 結算
          </button>
          <button onClick={() => openModal()} className="bg-[#00A5BF] text-white text-[10px] font-black px-6 py-3 rounded-2xl active:scale-95 transition-all shadow-lg uppercase tracking-widest">
            + 新增支出
          </button>
        </div>
      </div>

      {/* 支出列表 */}
      <div className="space-y-12">
        {sortedDates.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-30">
              <i className="fa-solid fa-receipt text-2xl text-gray-400"></i>
            </div>
            <p className="text-xs font-black text-gray-300 uppercase tracking-widest">尚未紀錄任何冒險開銷</p>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <span className="w-2 h-2 rounded-full bg-[#00A5BF] shadow-[0_0_10px_rgba(0,165,191,0.5)]"></span>
                <h4 className="text-sm font-black text-gray-800 tracking-widest uppercase">
                  {date.replace(/-/g, '.')}
                </h4>
                <div className="h-px flex-grow bg-gray-200/50"></div>
              </div>

              <div className="space-y-4 pl-4">
                {groupedExpenses[date].reverse().map(ex => {
                  const cat = CATEGORIES.find(c => c.id === ex.category);
                  const curr = CURRENCIES.find(c => c.id === ex.currency) || CURRENCIES[0];
                  return (
                    <div key={ex.id} onClick={() => openModal(ex)} className="bg-white p-5 rounded-[2.5rem] jp-shadow border border-white flex items-center justify-between group transition-all active:scale-[0.98] cursor-pointer">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-[1.25rem] ${cat?.color} flex items-center justify-center text-white shadow-lg`}>
                            <i className={`fa-solid ${cat?.icon} text-lg`}></i>
                          </div>
                          <div>
                            <h4 className="font-black text-gray-800 text-base leading-tight">{ex.title}</h4>
                            <p className="text-[10px] font-black text-gray-300 mt-1 uppercase tracking-widest">
                              {trip.members.find(m => m.id === ex.payerId)?.name} 付款
                            </p>
                          </div>
                       </div>
                       <div className="text-right">
                         <p className="text-lg font-black text-gray-800">{curr.symbol} {ex.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                         <p className="text-[9px] font-black text-[#00A5BF] uppercase tracking-tighter">{ex.splits.length} 人分攤 · {ex.currency}</p>
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新增/編輯 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[3.5rem] p-8 pb-12 shadow-2xl animate-slideUp max-h-[95vh] overflow-y-auto no-scrollbar text-left">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-gray-800 tracking-tighter">{editingExpenseId ? '編輯支出' : '新增支出'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
             </div>
             
             <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-gray-300 uppercase block mb-3 tracking-widest">標題</label>
                  <input autoFocus placeholder="例如：藥妝店購物" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" 
                         value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-3 tracking-widest">幣別</label>
                    <select className="w-full bg-gray-50 rounded-2xl px-4 py-4 font-black border-none text-xs outline-none focus:ring-2 focus:ring-[#00A5BF] appearance-none"
                            value={form.currency} onChange={e => {
                              // 切換幣別時，依據目前總額重新分攤 (會適用新的小數點規則)
                              const nextSplits = autoDistribute(form.amount, form.splits);
                              setForm({...form, currency: e.target.value, splits: nextSplits});
                            }}>
                      {CURRENCIES.map(c => <option key={c.id} value={c.id}>{c.id} ({c.symbol})</option>)}
                    </select>
                  </div>
                  <div className="col-span-8">
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-3 tracking-widest">總金額</label>
                    <input type="number" step="0.1" placeholder="0.0" className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" 
                           value={form.amount} onChange={e => handleTotalAmountChange(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-3 tracking-widest">付款人</label>
                    <select className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-black border-none text-xs outline-none focus:ring-2 focus:ring-[#00A5BF]" 
                           value={form.payerId} onChange={e => setForm({...form, payerId: e.target.value})}>
                      {trip.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-3 tracking-widest">日期</label>
                    <input type="date" className="w-full bg-gray-50 rounded-2xl px-3 py-4 font-black border-none text-[11px] outline-none" 
                           value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-gray-300 uppercase block mb-4 tracking-widest">分類</label>
                   <div className="grid grid-cols-4 gap-3">
                      {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setForm({...form, category: c.id})} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${form.category === c.id ? 'border-[#00A5BF] bg-[#00A5BF]/5' : 'border-transparent bg-gray-50'}`}>
                           <i className={`fa-solid ${c.icon} ${form.category === c.id ? 'text-[#00A5BF]' : 'text-gray-300'}`}></i>
                           <span className={`text-[9px] font-black ${form.category === c.id ? 'text-[#00A5BF]' : 'text-gray-300'}`}>{c.label}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest">分攤成員</label>
                      <div className={`text-[10px] font-black ${isBalanced ? 'text-[#00A5BF]' : 'text-red-500 animate-pulse'}`}>
                        {isBalanced ? '已平衡' : `待補足: ${diff > 0 ? '+' : ''}${diff}`}
                      </div>
                   </div>
                   <div className="bg-gray-50 rounded-[2.5rem] p-6 space-y-3">
                      {form.splits.map(s => {
                        const m = trip.members.find(mem => mem.id === s.memberId)!;
                        return (
                          <div key={s.memberId} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                             <div className="flex items-center gap-3">
                                <button onClick={() => toggleMemberSelection(s.memberId)} className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all shadow-md ${s.selected ? 'bg-[#00A5BF] scale-110' : 'bg-gray-200'}`}>
                                   <i className="fa-solid fa-check text-[10px]"></i>
                                </button>
                                <span className={`text-sm font-black ${s.selected ? 'text-gray-800' : 'text-gray-300'}`}>{m.name}</span>
                             </div>
                             <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">{CURRENCIES.find(c=>c.id===form.currency)?.symbol}</span>
                                <input type="number" step="0.1" className={`w-full bg-gray-50 rounded-xl pl-6 pr-3 py-2.5 font-black text-xs text-right outline-none focus:ring-2 focus:ring-[#00A5BF] transition-all ${s.selected ? 'text-gray-800' : 'text-gray-200'}`} 
                                       value={s.amount} onChange={e => handleSplitManualChange(s.memberId, e.target.value)} />
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>

                <div className="flex flex-col gap-4 pt-4">
                  <button disabled={!isReadyToSave} onClick={handleSave} className={`w-full py-5 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all uppercase tracking-[0.2em] ${isReadyToSave ? 'bg-[#00A5BF] text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                    儲存變更
                  </button>
                  {editingExpenseId && (
                    <button onClick={() => setExpenseToDelete(trip.expenses.find(e => e.id === editingExpenseId)!)} className="text-red-400 font-black text-[10px] uppercase tracking-widest pt-2 text-center">
                      <i className="fa-solid fa-trash-can mr-2"></i> 刪除此筆紀錄
                    </button>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 結算彈窗 */}
      {isSettling && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xl" onClick={() => setIsSettling(false)}></div>
          <div className="relative w-full max-sm bg-white rounded-[3.5rem] p-10 shadow-2xl scale-in text-center border border-white">
             <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 text-3xl shadow-inner">
                <i className="fa-solid fa-hand-holding-dollar"></i>
             </div>
             <h4 className="text-2xl font-black text-gray-800 mb-2 tracking-tighter">智慧分幣結算</h4>
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-10">Multi-Currency Settlement</p>
             
             <div className="space-y-8 max-h-96 overflow-y-auto no-scrollbar py-2">
                {calculateMultiCurrencySettlement().length === 0 ? (
                  <p className="text-gray-400 font-bold py-10 italic">目前帳目非常平衡！不需要任何還款。</p>
                ) : (
                  calculateMultiCurrencySettlement().map((res, gIdx) => (
                    <div key={res.currency} className="space-y-4 animate-fadeIn" style={{ animationDelay: `${gIdx * 0.1}s` }}>
                       <div className="flex items-center gap-2">
                          <span className="h-px flex-grow bg-gray-100"></span>
                          <span className="text-[10px] font-black text-[#00A5BF] uppercase tracking-widest">{res.currency} 結算區</span>
                          <span className="h-px flex-grow bg-gray-100"></span>
                       </div>
                       {res.steps.map((step, idx) => {
                         const symbol = CURRENCIES.find(c => c.id === res.currency)?.symbol;
                         return (
                          <div key={idx} className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between shadow-sm">
                             <div className="text-left">
                                <p className="text-[8px] font-black text-red-400 uppercase leading-none mb-1">付款人</p>
                                <p className="text-sm font-black text-gray-800">{trip.members.find(m => m.id === step.from)?.name}</p>
                             </div>
                             <div className="flex flex-col items-center flex-grow px-4">
                                <p className="text-xs font-black text-[#00A5BF] mb-1">{symbol} {step.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                                <i className="fa-solid fa-arrow-right-long text-gray-300"></i>
                             </div>
                             <div className="text-right">
                                <p className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">收款人</p>
                                <p className="text-sm font-black text-gray-800">{trip.members.find(m => m.id === step.to)?.name}</p>
                             </div>
                          </div>
                         );
                       })}
                    </div>
                  ))
                )}
             </div>
             
             <button onClick={() => setIsSettling(false)} className="w-full mt-10 bg-gray-900 text-white py-5 rounded-full font-black text-[10px] shadow-xl uppercase tracking-widest active:scale-95 transition-all">
                確認完畢
             </button>
          </div>
        </div>
      )}

      {/* 刪除確認 */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setExpenseToDelete(null)}></div>
          <div className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-10 shadow-2xl animate-slideUp text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h4 className="text-lg font-black text-gray-800 mb-2">確定要刪除嗎？</h4>
            <p className="text-[11px] text-gray-400 font-bold leading-relaxed mb-8">「{expenseToDelete.title}」紀錄將永久移除。</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-[10px] shadow-lg active:scale-95 transition-all uppercase tracking-widest">確定刪除</button>
              <button onClick={() => setExpenseToDelete(null)} className="w-full bg-stone-50 text-stone-400 py-4 rounded-2xl font-black text-[10px] active:scale-95 transition-all uppercase tracking-widest">取消返回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletView;