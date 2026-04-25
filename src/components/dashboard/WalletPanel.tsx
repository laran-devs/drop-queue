"use client";

import { useState, useEffect } from "react";
import { getWalletData, requestWithdrawal } from "@/app/actions/wallet-actions";
import { Wallet, ArrowUpRight, History, CreditCard, CheckCircle2, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function WalletPanel({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    getWalletData()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("Wallet error:", err);
        toast.error("Failed to load wallet data");
        setLoading(false);
      });
  }, []);

  const handleWithdraw = async (formData: FormData) => {
    setIsRequesting(true);
    try {
      await requestWithdrawal(formData);
      toast.success("Withdrawal request submitted!");
      // Refresh data
      const newData = await getWalletData();
      setData(newData);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading Wallet...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden w-full"
    >
      <div className="flex justify-between items-center p-8 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-500/20">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Кошелёк</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Управление выплатами</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Left: Balance & Form */}
        <div className="p-8 border-r border-zinc-100 dark:border-zinc-900 lg:col-span-1">
          <div className="mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Доступный баланс</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black tracking-tighter">{data?.balance || 0}</span>
              <span className="text-sm font-bold text-zinc-500">{data?.currency || "RUB"}</span>
            </div>
          </div>

          <form action={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Сумма к выводу</label>
              <input 
                name="amount" 
                type="number" 
                placeholder="Мин. 500" 
                className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-600 transition-all outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Способ выплаты</label>
              <select name="payoutMethod" className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-600 transition-all outline-none">
                <option value="Card">Банковская карта (RU)</option>
                <option value="ЮMoney">ЮMoney</option>
                <option value="Crypto">USDT (TRC20)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Реквизиты</label>
              <input 
                name="payoutDetails" 
                type="text" 
                placeholder="Номер карты или кошелька" 
                className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-600 transition-all outline-none"
                required
              />
            </div>
            <button 
              disabled={isRequesting || (data?.balance || 0) < 500}
              className="w-full py-4 rounded-xl bg-purple-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
            >
              {isRequesting ? "Обработка..." : "Запросить выплату"}
            </button>
            {(data?.balance || 0) < 500 && (
              <p className="text-[10px] text-center text-zinc-500 font-medium">Минимальная сумма — 500 {data?.currency || "RUB"}</p>
            )}
          </form>
        </div>

        {/* Right: History */}
        <div className="md:col-span-2 flex flex-col h-[500px]">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-400">
              <History size={14} />
              История активности
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <div className="divide-y divide-zinc-50 dark:divide-zinc-900">
              {data?.transactions?.map((tx: any) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{tx.description || "Priority Bump"}</p>
                      <p className="text-[10px] text-zinc-500">{new Date(tx.createdAt).toLocaleString('ru-RU')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-green-600">+{tx.amount} {tx.currency}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Успешно</p>
                  </div>
                </div>
              ))}

              {data?.withdrawalRequests?.map((req: any) => (
                <div key={req.id} className="p-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${req.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Выплата ({req.payoutMethod})</p>
                      <p className="text-[10px] text-zinc-500">{new Date(req.createdAt).toLocaleString('ru-RU')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">-{req.amount} {req.currency}</p>
                    <div className="flex items-center gap-1 justify-end">
                      {req.status === 'COMPLETED' ? <CheckCircle2 size={10} className="text-blue-500" /> : <Clock size={10} className="text-amber-500 underline decoration-dotted" />}
                      <p className={`text-[10px] font-black uppercase ${req.status === 'COMPLETED' ? 'text-blue-500' : 'text-amber-500'}`}>{req.status}</p>
                    </div>
                  </div>
                </div>
              ))}

              {(!data?.transactions?.length && !data?.withdrawalRequests?.length) && (
                <div className="p-12 text-center">
                  <p className="text-sm text-zinc-500">Пока нет активности. Начните стрим, чтобы заработать!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
