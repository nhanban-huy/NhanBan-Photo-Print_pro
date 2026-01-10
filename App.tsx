
import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import Login from './components/Login';
import { Order, OrderItem, PaymentStatus, WorkStatus, CustomerInfo, PaymentMethod } from './types';

const BANK_CONFIG = {
  bankId: 'vietinbank',
  accountNo: '100000713992',
  accountName: 'NGUYEN DINH HUY',
  template: 'compact'
};

const STORE_CONFIG = {
  address: '45 Phù Đổng Thiên Vương, P. Chợ Lớn, TP.HCM',
  hotline: '0912117191'
};

const App: React.FC = () => {
  const [user, setUser] = useState<{id: string, name: string, role: 'admin' | 'staff'} | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'dashboard' | 'orders' | 'create'>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('nb_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedOrders = localStorage.getItem('nb_orders');
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    } else {
      const mockOrders: Order[] = [
        {
          id: 'NB-7821',
          createdAt: new Date().toISOString(),
          customer: { name: 'Khách dùng thử', phone: '0901234567' },
          items: [{ id: '1', stt: 1, service: 'In màu tài liệu A4', quantity: 10, unitPrice: 5000, note: 'Lấy ngay' }],
          subTotal: 50000,
          vat: 4000,
          total: 54000,
          hasVat: true,
          paymentStatus: PaymentStatus.PAID,
          workStatus: WorkStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
          employeeId: 'NB1-Huy'
        }
      ];
      setOrders(mockOrders);
    }
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('nb_orders', JSON.stringify(orders));
    }
  }, [orders]);

  const handleLogin = (userData: {id: string, name: string, role: 'admin' | 'staff'}) => {
    setUser(userData);
    localStorage.setItem('nb_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nb_user');
  };

  const handleSaveOrder = (items: OrderItem[], hasVat: boolean, customer: CustomerInfo) => {
    if (!user) return;
    const subTotal = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const vat = hasVat ? Math.round(subTotal * 0.08) : 0;
    const newOrder: Order = {
      id: `NB-${Math.floor(1000 + Math.random() * 8999)}`,
      createdAt: new Date().toISOString(),
      customer,
      items,
      subTotal,
      vat,
      total: subTotal + vat,
      hasVat,
      paymentStatus: PaymentStatus.PENDING,
      workStatus: WorkStatus.NOT_STARTED,
      paymentMethod: PaymentMethod.TRANSFER, // Mặc định chuyển khoản để hiển thị QR ban đầu
      employeeId: user.id
    };
    setOrders([newOrder, ...orders]);
    setView('orders');
  };

  const updatePaymentStatus = (id: string, status: PaymentStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, paymentStatus: status } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, paymentStatus: status } : null);
  };

  const updateWorkStatus = (id: string, status: WorkStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, workStatus: status } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, workStatus: status } : null);
  };

  const updatePaymentMethod = (id: string, method: PaymentMethod) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, paymentMethod: method } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, paymentMethod: method } : null);
  };

  const generateQrUrl = (amount: number, description: string) => {
    return `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-${BANK_CONFIG.template}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;
  };

  const exportPDF = async () => {
    if (!printRef.current) return;
    const images = printRef.current.getElementsByTagName('img');
    const imagePromises = Array.from(images).map(imgElement => {
      const img = imgElement as HTMLImageElement;
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    });
    await Promise.all(imagePromises);
    const { jsPDF } = (window as any).jspdf;
    const canvas = await (window as any).html2canvas(printRef.current, { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a5');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`HoaDon_NhanBan_${selectedOrder?.id}.pdf`);
  };

  const filteredOrders = user?.role === 'admin' 
    ? orders 
    : orders.filter(o => o.employeeId === user?.id);

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <nav className="bg-slate-900 w-full md:w-64 border-b md:border-r border-slate-800 p-4 md:flex-shrink-0 no-print flex md:flex-col items-center md:items-stretch justify-between md:justify-start gap-4">
        <div className="flex items-center gap-3 md:mb-10 px-2">
          <div className="bg-rose-600 text-white p-2.5 rounded-xl shadow-lg shadow-rose-900/40">
            <i className="fas fa-copy text-xl"></i>
          </div>
          <div className="leading-tight hidden sm:block">
            <h1 className="font-black text-slate-100 text-lg uppercase tracking-tighter">NHÂN BẢN</h1>
            <p className="text-[10px] font-bold text-rose-500 tracking-tighter uppercase">Photo-Print Pro</p>
          </div>
        </div>
        
        <ul className="flex md:flex-col gap-2 font-bold overflow-x-auto no-scrollbar py-2 md:py-0">
          <li className="flex-shrink-0"><button onClick={() => setView('dashboard')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><i className="fas fa-chart-pie md:w-5"></i> <span className="hidden md:inline">Doanh thu</span></button></li>
          <li className="flex-shrink-0"><button onClick={() => setView('orders')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'orders' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><i className="fas fa-receipt md:w-5"></i> <span className="hidden md:inline">Đơn hàng</span></button></li>
          <li className="flex-shrink-0"><button onClick={() => setView('create')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'create' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><i className="fas fa-plus-circle md:w-5"></i> <span className="hidden md:inline">Tạo mới</span></button></li>
        </ul>

        <div className="hidden md:block mt-auto pt-10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-900/20 transition-all font-bold">
              <i className="fas fa-sign-out-alt w-5"></i> <span>Đăng xuất</span>
            </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen no-print scroll-smooth">
        <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight">
              {view === 'dashboard' ? 'Thống kê doanh thu' : view === 'orders' ? 'Quản lý đơn hàng' : 'Hóa đơn mới'}
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {user.role === 'admin' ? 'Tài khoản Quản trị Admincp' : `Nhân viên: ${user.name}`}
            </p>
          </div>
          <div className="bg-slate-900 p-2 pr-4 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-xl">
             <img src={`https://ui-avatars.com/api/?name=${user.name}&background=${user.role === 'admin' ? 'e11d48' : '4f46e5'}&color=fff`} className="w-8 h-8 md:w-9 md:h-9 rounded-full" />
             <div className="text-left">
               <p className="text-[9px] font-black text-rose-500 uppercase">{user.role === 'admin' ? 'Quản trị' : 'Nhân viên'}</p>
               <p className="text-xs font-bold text-slate-200">{user.name}</p>
             </div>
          </div>
        </header>

        {view === 'dashboard' && <Dashboard orders={filteredOrders} isAdmin={user.role === 'admin'} />}
        {view === 'create' && <OrderForm onSave={handleSaveOrder} onCancel={() => setView('orders')} />}
        
        {view === 'orders' && (
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 border-b border-slate-800">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-5">Mã / Khách hàng</th>
                    <th className="px-6 py-5">Số tiền</th>
                    <th className="px-6 py-5">Hình thức</th>
                    <th className="px-6 py-5">Trạng thái</th>
                    <th className="px-6 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-200">{order.id}</p>
                        <p className="text-xs text-slate-500">{order.customer.name}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-indigo-400">{order.total.toLocaleString()}đ</td>
                      <td className="px-6 py-4">
                        <select 
                          value={order.paymentMethod} 
                          onChange={(e) => updatePaymentMethod(order.id, e.target.value as PaymentMethod)}
                          className="bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-black px-2 py-1 text-slate-300 outline-none focus:border-indigo-500"
                        >
                          <option value={PaymentMethod.TRANSFER}>CHUYỂN KHOẢN</option>
                          <option value={PaymentMethod.CASH}>TIỀN MẶT</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-900/30 text-emerald-400' : order.paymentStatus === PaymentStatus.CANCELLED ? 'bg-rose-900/30 text-rose-400' : 'bg-amber-900/30 text-amber-400'}`}>{order.paymentStatus}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedOrder(order)} className="w-10 h-10 flex items-center justify-center text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"><i className="fas fa-file-invoice"></i></button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-600 font-black uppercase tracking-widest text-xs">Chưa có đơn hàng nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-800">
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center px-8">
              <h3 className="font-black uppercase tracking-widest text-sm">CHI TIẾT ĐƠN: {selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-indigo-500"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="p-4 md:p-8 bg-slate-900">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-sm">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Thanh toán</label>
                  <select value={selectedOrder.paymentStatus} onChange={(e) => updatePaymentStatus(selectedOrder.id, e.target.value as PaymentStatus)} className="w-full bg-slate-900 border-none rounded-xl text-xs font-black p-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500">
                    {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-sm">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Sản xuất</label>
                  <select value={selectedOrder.workStatus} onChange={(e) => updateWorkStatus(selectedOrder.id, e.target.value as WorkStatus)} className="w-full bg-slate-900 border-none rounded-xl text-xs font-black p-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500">
                    {Object.values(WorkStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-sm">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Hình thức</label>
                  <select value={selectedOrder.paymentMethod} onChange={(e) => updatePaymentMethod(selectedOrder.id, e.target.value as PaymentMethod)} className="w-full bg-slate-900 border-none rounded-xl text-xs font-black p-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500">
                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto bg-slate-950 rounded-3xl p-4 border border-slate-800 mb-6">
                <div ref={printRef} className="bg-white p-6 md:p-8 rounded-sm mx-auto shadow-inner" style={{ width: '148mm', minHeight: '210mm', fontSize: '10pt', color: '#1e293b' }}>
                  <div className="flex justify-between items-start border-b-4 border-rose-600 pb-4 mb-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none">NHÂN BẢN</h1>
                      <p className="text-[8px] font-black text-rose-600 tracking-widest uppercase mt-1 mb-2">Photo-Print Pro Service</p>
                      <div className="space-y-0.5 text-[7px] font-bold text-slate-500 text-left">
                        <p><i className="fas fa-location-dot mr-1"></i> {STORE_CONFIG.address}</p>
                        <p><i className="fas fa-phone mr-1"></i> Hotline: {STORE_CONFIG.hotline}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-900 border-b-2 border-slate-100 pb-1 mb-1 uppercase">Hóa đơn {selectedOrder.id}</p>
                      <p className="text-[8px] font-bold text-slate-400">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 items-center">
                    <div className="text-left">
                      <h2 className="text-[8px] font-black text-rose-600 uppercase mb-1 tracking-widest">Khách hàng</h2>
                      <p className="font-black text-slate-800 text-xs underline decoration-rose-200 underline-offset-4">{selectedOrder.customer.name}</p>
                      <p className="text-[10px] font-bold text-slate-600">SĐT: {selectedOrder.customer.phone}</p>
                      <p className="text-[8px] font-black text-indigo-600 mt-2 uppercase italic">Hình thức: {selectedOrder.paymentMethod}</p>
                    </div>
                    <div className="flex flex-col items-end">
                       {selectedOrder.paymentMethod === PaymentMethod.TRANSFER && (
                        <>
                          <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 text-center">
                              <img 
                                src={generateQrUrl(selectedOrder.total, selectedOrder.id)} 
                                className="w-20 h-20 md:w-24 md:h-24 object-contain" 
                                alt="QR Thanh toán" 
                                crossOrigin="anonymous"
                              />
                              <div className="flex items-center justify-center gap-1 mt-0.5">
                                <span className="text-[5px] font-black text-blue-800 uppercase">VietinBank</span>
                                <span className="text-[5px] font-black text-orange-500 uppercase">Napas247</span>
                              </div>
                          </div>
                          <p className="text-[5px] mt-1 font-black text-indigo-600 uppercase tracking-tighter text-right">Quét mã để thanh toán</p>
                        </>
                       )}
                       {selectedOrder.paymentMethod === PaymentMethod.CASH && (
                        <div className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                          <i className="fas fa-money-bill-wave text-slate-300 text-2xl"></i>
                        </div>
                       )}
                    </div>
                  </div>

                  <table className="w-full text-[10px] border-collapse mb-6">
                    <thead>
                      <tr className="bg-slate-800 text-white font-black uppercase tracking-wider text-[7px]">
                        <th className="p-2 text-center rounded-l-lg">STT</th>
                        <th className="p-2 text-left">Nội dung</th>
                        <th className="p-2 text-center">SL</th>
                        <th className="p-2 text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {selectedOrder.items.map((it, idx) => (
                        <tr key={it.id} className="text-slate-700">
                          <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-2 text-left">{it.service}</td>
                          <td className="p-2 text-center">{it.quantity}</td>
                          <td className="p-2 text-right font-black">{(it.quantity * it.unitPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-800">
                      <tr className="bg-rose-50/50">
                        <td colSpan={3} className="p-3 text-right font-black text-rose-600 text-sm rounded-l-2xl uppercase">TỔNG CỘNG:</td>
                        <td className="p-3 text-right font-black text-rose-600 text-sm rounded-r-2xl">{selectedOrder.total.toLocaleString()}đ</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="grid grid-cols-2 gap-10 text-center text-[8px] mt-6 pb-6">
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-widest">NV Lập phiếu</p>
                      <p className="text-[7px] text-slate-400 mt-0.5">{selectedOrder.employeeId}</p>
                      <div className="mt-8 border-t border-slate-200 pt-2 italic text-slate-400">Xác nhận</div>
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-widest">Khách hàng</p>
                      <div className="mt-12 border-t border-slate-200 pt-2 italic text-slate-400">Ký tên</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={exportPDF} className="bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 hover:bg-rose-700 transition-all flex-1 active:scale-95 shadow-xl shadow-rose-900/40">
                  <i className="fas fa-file-pdf text-base"></i> TẢI HÓA ĐƠN PDF
                </button>
                <button onClick={() => setSelectedOrder(null)} className="bg-slate-800 text-slate-300 px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 hover:bg-slate-700 transition-all flex-1">
                  ĐÓNG CỬA SỔ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
