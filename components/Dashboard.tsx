
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import { Order, PaymentStatus, Expense, PresetService } from '../types';

interface DashboardProps {
  orders: Order[];
  expenses: Expense[];
  isAdmin: boolean;
  onAddExpense?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ orders, expenses, isAdmin, onAddExpense }) => {
  const [filter, setFilter] = useState<'day' | 'month'>('day');
  const [activeTab, setActiveTab] = useState<'stats' | 'services'>('stats');
  const [presetServices, setPresetServices] = useState<PresetService[]>([]);
  const [newService, setNewService] = useState({ name: '', price: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('nb_preset_services');
    if (saved) setPresetServices(JSON.parse(saved));
  }, []);

  const savePresets = (updated: PresetService[]) => {
    setPresetServices(updated);
    localStorage.setItem('nb_preset_services', JSON.stringify(updated));
  };

  const handleAddService = () => {
    if (!newService.name || newService.price <= 0) return;
    const service: PresetService = {
      id: Math.random().toString(),
      name: newService.name,
      defaultPrice: newService.price,
      category: 'Phổ biến'
    };
    savePresets([...presetServices, service]);
    setNewService({ name: '', price: 0 });
  };

  const handleDeleteService = (id: string) => {
    savePresets(presetServices.filter(s => s.id !== id));
  };

  const stats = useMemo(() => {
    const paidOrders = orders.filter(o => o.paymentStatus === PaymentStatus.PAID);
    const now = new Date();
    
    const monthlyRev = paidOrders
      .filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, o) => sum + o.total, 0);

    const monthlyExp = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const profit = monthlyRev - monthlyExp;

    let chartData = [];
    if (filter === 'day') {
      chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        const rev = paidOrders
          .filter(o => new Date(o.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) === dateStr)
          .reduce((sum, o) => sum + o.total, 0);
        const exp = expenses
          .filter(e => new Date(e.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) === dateStr)
          .reduce((sum, e) => sum + e.amount, 0);
        return { name: dateStr, revenue: rev, expense: exp };
      });
    } else {
      chartData = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthStr = `Th${d.getMonth() + 1}`;
        const rev = paidOrders
          .filter(o => new Date(o.createdAt).getMonth() === d.getMonth() && new Date(o.createdAt).getFullYear() === d.getFullYear())
          .reduce((sum, o) => sum + o.total, 0);
        const exp = expenses
          .filter(e => new Date(e.date).getMonth() === d.getMonth() && new Date(e.date).getFullYear() === d.getFullYear())
          .reduce((sum, e) => sum + e.amount, 0);
        return { name: monthStr, revenue: rev, expense: exp };
      });
    }

    return { monthlyRev, monthlyExp, profit, chartData };
  }, [orders, expenses, filter]);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex bg-slate-900 p-1.5 rounded-2xl w-fit border border-slate-800">
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Thống kê doanh thu
          </button>
          <button 
            onClick={() => setActiveTab('services')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'services' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Quản lý Dịch vụ (AI Preset)
          </button>
        </div>
      )}

      {activeTab === 'stats' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Doanh thu (Tháng)', val: stats.monthlyRev, icon: 'fa-chart-line', color: 'rose' },
              { label: 'Chi phí (Tháng)', val: stats.monthlyExp, icon: 'fa-file-invoice-dollar', color: 'amber' },
              { label: 'Lợi nhuận dự kiến', val: stats.profit, icon: 'fa-piggy-bank', color: 'emerald' },
              { label: 'Đơn hàng (Tháng)', val: orders.filter(o => new Date(o.createdAt).getMonth() === new Date().getMonth()).length, icon: 'fa-receipt', color: 'blue', isCurrency: false },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900 p-5 md:p-6 rounded-[2rem] shadow-xl border border-slate-800 flex flex-col items-center transition-transform hover:scale-[1.02]">
                <div className={`w-11 h-11 bg-opacity-10 rounded-2xl flex items-center justify-center mb-3 ${
                  item.color === 'rose' ? 'bg-rose-500 text-rose-500' : 
                  item.color === 'amber' ? 'bg-amber-500 text-amber-500' : 
                  item.color === 'emerald' ? 'bg-emerald-500 text-emerald-400' : 
                  'bg-blue-500 text-blue-500'
                }`}>
                  <i className={`fas ${item.icon} text-lg`}></i>
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 text-center">{item.label}</p>
                <h3 className={`text-base md:text-xl font-black ${item.color === 'emerald' ? 'text-emerald-400' : 'text-slate-100'}`}>
                  {item.isCurrency === false ? item.val : `${item.val.toLocaleString()}đ`}
                </h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 flex flex-col min-h-[400px]">
              <div className="flex justify-between items-center mb-10">
                <div>
                   <h4 className="font-black text-slate-100 uppercase tracking-tighter flex items-center gap-3 text-sm">
                    <span className="w-1.5 h-6 bg-indigo-600 rounded-full block"></span>
                    Biểu đồ cân đối Thu - Chi
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 ml-4">Biểu đồ trực quan doanh thu & chi phí</p>
                </div>
                <div className="flex bg-slate-950 p-1 rounded-xl text-[9px] font-black border border-slate-800">
                  <button onClick={() => setFilter('day')} className={`px-5 py-2 rounded-lg transition-all ${filter === 'day' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>7 NGÀY</button>
                  <button onClick={() => setFilter('month')} className={`px-5 py-2 rounded-lg transition-all ${filter === 'month' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>6 THÁNG</button>
                </div>
              </div>
              <div className="flex-1 w-full overflow-hidden flex items-center justify-center">
                <BarChart width={600} height={300} data={stats.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Doanh thu" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Chi phí" />
                </BarChart>
              </div>
            </div>

            <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <h4 className="font-black text-slate-100 uppercase tracking-tighter text-sm">Sổ chi phí phát sinh</h4>
                <div className="w-8 h-8 bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center">
                  <i className="fas fa-file-invoice-dollar text-sm"></i>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar max-h-[320px] mb-8 pr-1">
                {expenses.length > 0 ? [...expenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                  <div key={exp.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">{exp.category}</p>
                        <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{exp.note || 'Chi phí khác'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-rose-400 text-xs">-{exp.amount.toLocaleString()}đ</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{exp.employeeId || 'Hệ thống'}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 py-16">
                    <i className="fas fa-folder-open text-4xl mb-3"></i>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Chưa có dữ liệu chi phí</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={onAddExpense}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <i className="fas fa-plus-circle text-rose-500"></i>
                Nhập chi phí phát sinh
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="text-xl font-black uppercase tracking-tighter">Cài đặt Dịch vụ AI (Preset)</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Các dịch vụ này sẽ hiển thị nhanh cho nhân viên và ưu tiên cho trợ lý AI.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tên dịch vụ</label>
                  <input 
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none focus:border-indigo-500" 
                    placeholder="VD: Photo A4 1 mặt" 
                    value={newService.name}
                    onChange={e => setNewService({...newService, name: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Đơn giá mặc định</label>
                  <input 
                    type="number"
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none focus:border-indigo-500" 
                    placeholder="500" 
                    value={newService.price || ''}
                    onChange={e => setNewService({...newService, price: parseInt(e.target.value) || 0})}
                  />
               </div>
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleAddService}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95"
              >
                Thêm vào danh mục
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {presetServices.map(service => (
              <div key={service.id} className="bg-slate-950 p-5 rounded-3xl border border-slate-800 flex justify-between items-center group">
                <div>
                  <p className="font-black text-slate-100 text-xs">{service.name}</p>
                  <p className="text-[10px] font-bold text-indigo-400 mt-1">{service.defaultPrice.toLocaleString()}đ</p>
                </div>
                <button 
                  onClick={() => handleDeleteService(service.id)}
                  className="w-8 h-8 bg-slate-900 text-slate-600 hover:text-rose-500 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            ))}
            {presetServices.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-20">
                <i className="fas fa-layer-group text-5xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Danh mục đang trống</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
