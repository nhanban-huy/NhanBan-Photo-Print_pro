
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Order, PaymentStatus, PaymentMethod } from '../types';

interface DashboardProps {
  orders: Order[];
  isAdmin: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ orders, isAdmin }) => {
  const [filter, setFilter] = useState<'day' | 'week' | 'month' | 'year'>('day');

  const stats = useMemo(() => {
    const paidOrders = orders.filter(o => o.paymentStatus === PaymentStatus.PAID);
    const now = new Date();
    
    const dailyRev = paidOrders
      .filter(o => new Date(o.createdAt).toDateString() === now.toDateString())
      .reduce((sum, o) => sum + o.total, 0);

    const monthlyRev = paidOrders
      .filter(o => new Date(o.createdAt).getMonth() === now.getMonth() && new Date(o.createdAt).getFullYear() === now.getFullYear())
      .reduce((sum, o) => sum + o.total, 0);

    const cashTotal = paidOrders
      .filter(o => o.paymentMethod === PaymentMethod.CASH)
      .reduce((sum, o) => sum + o.total, 0);
    
    const transferTotal = paidOrders
      .filter(o => o.paymentMethod === PaymentMethod.TRANSFER)
      .reduce((sum, o) => sum + o.total, 0);

    // Group by employee
    const employeeData = Object.entries(
      paidOrders.reduce((acc: any, o) => {
        acc[o.employeeId] = (acc[o.employeeId] || 0) + o.total;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number }))
     .sort((a, b) => b.value - a.value);

    let chartData: { name: string, revenue: number }[] = [];
    if (filter === 'day') {
      chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        const rev = paidOrders
          .filter(o => new Date(o.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) === dateStr)
          .reduce((sum, o) => sum + o.total, 0);
        return { name: dateStr, revenue: rev };
      });
    } else {
      chartData = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthStr = `T${d.getMonth() + 1}`;
        const rev = paidOrders
          .filter(o => new Date(o.createdAt).getMonth() === d.getMonth() && new Date(o.createdAt).getFullYear() === d.getFullYear())
          .reduce((sum, o) => sum + o.total, 0);
        return { name: monthStr, revenue: rev };
      });
    }

    const pieData = [
      { name: 'Tiền mặt', value: cashTotal, color: '#f59e0b' },
      { name: 'Chuyển khoản', value: transferTotal, color: '#3b82f6' }
    ];

    return { dailyRev, monthlyRev, cashTotal, transferTotal, chartData, employeeData, pieData };
  }, [orders, filter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hôm nay', val: stats.dailyRev, icon: 'fa-calendar-day', color: 'rose' },
          { label: 'Tháng này', val: stats.monthlyRev, icon: 'fa-calendar-check', color: 'rose' },
          { label: 'Tiền mặt', val: stats.cashTotal, icon: 'fa-money-bill-1', color: 'amber' },
          { label: 'Chuyển khoản', val: stats.transferTotal, icon: 'fa-credit-card', color: 'blue' },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-900 p-5 md:p-6 rounded-[2rem] shadow-xl border border-slate-800 flex flex-col items-center">
            <div className={`w-10 h-10 bg-opacity-20 rounded-full flex items-center justify-center mb-3 ${
              item.color === 'rose' ? 'bg-rose-900 text-rose-500' : 
              item.color === 'amber' ? 'bg-amber-900 text-amber-500' : 
              'bg-blue-900 text-blue-500'
            }`}>
              <i className={`fas ${item.icon}`}></i>
            </div>
            <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 text-center">{item.label}</p>
            <h3 className="text-base md:text-xl font-black text-slate-100">{item.val.toLocaleString()}đ</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doanh thu biểu đồ cột */}
        <div className="lg:col-span-2 bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h4 className="font-black text-slate-100 uppercase tracking-tighter flex items-center gap-2 text-sm">
              <span className="w-1.5 h-6 bg-rose-600 rounded-full block"></span>
              Hiệu suất doanh thu
            </h4>
            <div className="flex bg-slate-950 p-1 rounded-xl text-[9px] font-black">
              <button onClick={() => setFilter('day')} className={`px-4 py-1.5 rounded-lg transition-all ${filter === 'day' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>NGÀY</button>
              <button onClick={() => setFilter('month')} className={`px-4 py-1.5 rounded-lg transition-all ${filter === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>THÁNG</button>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#0f172a', radius: 8 }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', fontSize: '10px' }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#6366f1" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tỉ lệ thanh toán */}
        <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 flex flex-col items-center">
          <h4 className="w-full font-black text-slate-100 uppercase tracking-tighter text-sm mb-6 text-left">
            Tỉ lệ thanh toán
          </h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full mt-4 space-y-2">
            {stats.pieData.map(item => (
              <div key={item.name} className="flex justify-between items-center text-[10px] font-black">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-400 uppercase">{item.name}</span>
                </span>
                <span className="text-slate-200">{item.value.toLocaleString()}đ</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Doanh thu nhân viên (Chỉ Admin mới thấy rõ) */}
      {isAdmin && (
        <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden">
          <h4 className="font-black text-slate-100 uppercase tracking-tighter text-sm mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full block"></span>
            Doanh thu theo nhân viên
          </h4>
          <div className="space-y-4">
            {stats.employeeData.map((emp, idx) => (
              <div key={emp.name} className="group flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wide">
                    {idx + 1}. {emp.name}
                  </span>
                  <span className="text-xs font-black text-emerald-400">
                    {emp.value.toLocaleString()}đ
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-indigo-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${(emp.value / (stats.employeeData[0]?.value || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {stats.employeeData.length === 0 && (
              <p className="text-center py-10 text-slate-600 font-black uppercase tracking-widest text-[10px]">Chưa có dữ liệu thanh toán</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
