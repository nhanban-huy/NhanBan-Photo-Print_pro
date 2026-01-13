
import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import Login from './components/Login';
import { Order, OrderItem, PaymentStatus, WorkStatus, CustomerInfo, PaymentMethod, Expense } from './types';

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [view, setView] = useState<'dashboard' | 'orders' | 'create'>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingImg, setIsSavingImg] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'Khác', amount: 0, note: '' });
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('nb_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    const savedOrders = localStorage.getItem('nb_orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    const savedExpenses = localStorage.getItem('nb_expenses');
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  useEffect(() => {
    localStorage.setItem('nb_orders', JSON.stringify(orders));
    localStorage.setItem('nb_expenses', JSON.stringify(expenses));
  }, [orders, expenses]);

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
      paymentMethod: PaymentMethod.TRANSFER,
      employeeId: user.id
    };
    
    setOrders([newOrder, ...orders]);
    setView('orders');
    setSelectedOrder(newOrder);

    // Tự động kích hoạt xuất PDF sau khi UI đã render modal
    setTimeout(() => {
      exportPDF(newOrder.id);
    }, 800);
  };

  const updatePaymentStatus = (id: string, status: PaymentStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, paymentStatus: status } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, paymentStatus: status } : null);
  };

  const updatePaymentMethod = (id: string, method: PaymentMethod) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, paymentMethod: method } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, paymentMethod: method } : null);
  };

  const generateQrUrl = (amount: number, description: string) => {
    return `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-${BANK_CONFIG.template}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;
  };

  const exportPDF = async (orderId?: string) => {
    if (!printRef.current || isExporting) return;
    setIsExporting(true);
    const id = orderId || selectedOrder?.id || 'HD';
    try {
      const canvas = await (window as any).html2canvas(printRef.current, { 
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('printable-invoice');
          if (el) el.style.display = 'block';
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a5');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight);
      pdf.save(`HoaDon-${id}.pdf`);
    } catch (error) {
      console.error("PDF Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const saveAsImage = async () => {
    if (!printRef.current || isSavingImg) return;
    setIsSavingImg(true);
    try {
      const canvas = await (window as any).html2canvas(printRef.current, { 
        scale: 3, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const link = document.createElement('a');
      link.download = `HoaDon-${selectedOrder?.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Image saving error:", error);
    } finally {
      setIsSavingImg(false);
    }
  };

  const copyOrderLink = () => {
    if (!selectedOrder) return;
    const dummyLink = `https://nhanban.pro/view/${selectedOrder.id}`;
    navigator.clipboard.writeText(dummyLink).then(() => {
      alert("Đã copy link hóa đơn: " + dummyLink);
    });
  };

  const handleAddExpense = () => {
    if (!user) return;
    if (!newExpense.amount) return alert("Vui lòng nhập số tiền!");
    const exp: Expense = {
      id: Math.random().toString(),
      date: new Date().toISOString(),
      category: newExpense.category,
      amount: newExpense.amount,
      note: newExpense.note,
      employeeId: user.id
    };
    setExpenses([exp, ...expenses]);
    setShowExpenseModal(false);
    setNewExpense({ category: 'Khác', amount: 0, note: '' });
  };

  const filteredOrders = user?.role === 'admin' ? orders : orders.filter(o => o.employeeId === user?.id);

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <nav className="bg-slate-900 w-full md:w-64 border-b md:border-r border-slate-800 p-4 md:flex-shrink-0 no-print flex md:flex-col items-center md:items-stretch justify-between md:justify-start gap-4">
        <div className="flex items-center gap-3 md:mb-10 px-2">
          <div className="bg-rose-600 text-white p-2.5 rounded-xl shadow-lg">
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
        <div className="hidden md:block mt-auto pt-10 px-2">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-900/20 transition-all font-bold">
            <i className="fas fa-sign-out-alt w-5"></i> <span>Đăng xuất</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen no-print">
        <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight">
              {view === 'dashboard' ? 'Thống kê doanh thu' : view === 'orders' ? 'Quản lý đơn hàng' : 'Hóa đơn mới'}
            </h2>
          </div>
          <div className="bg-slate-900 p-2 pr-4 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-xl">
             <img src={`https://ui-avatars.com/api/?name=${user.name}&background=${user.role === 'admin' ? 'e11d48' : '4f46e5'}&color=fff`} className="w-8 h-8 rounded-full" />
             <div className="text-left">
               <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">{user.role}</p>
               <p className="text-xs font-bold text-slate-200">{user.name}</p>
             </div>
          </div>
        </header>
        {view === 'dashboard' && <Dashboard orders={filteredOrders} expenses={expenses} isAdmin={user.role === 'admin'} onAddExpense={() => setShowExpenseModal(true)} />}
        {view === 'create' && <OrderForm onSave={handleSaveOrder} onCancel={() => setView('orders')} />}
        {view === 'orders' && (
          <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 border-b border-slate-800">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-5">Mã / Khách hàng</th>
                    <th className="px-6 py-5">Số tiền</th>
                    <th className="px-6 py-5">Loại</th>
                    <th className="px-6 py-5">Trạng thái</th>
                    <th className="px-6 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-200">{order.id}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase">{order.customer.name}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-indigo-400">{order.total.toLocaleString()}đ</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[8px] font-black ${order.hasVat ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-800' : 'bg-slate-800 text-slate-500'}`}>
                          {order.hasVat ? 'VAT 8%' : 'THƯỜNG'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'}`}>{order.paymentStatus}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedOrder(order)} className="w-10 h-10 flex items-center justify-center text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"><i className="fas fa-file-invoice"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
           <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Nhập chi phí phát sinh</h3>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Loại chi phí</label>
                  <select className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}>
                    <option value="Mực in">Mực in</option><option value="Giấy in">Giấy in</option><option value="Bảo trì">Bảo trì</option><option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Số tiền (VNĐ)</label>
                  <input type="number" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newExpense.amount || ''} onChange={(e) => setNewExpense({...newExpense, amount: parseInt(e.target.value) || 0})} placeholder="500,000" />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Ghi chú</label>
                  <input className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-slate-100 outline-none" value={newExpense.note} onChange={(e) => setNewExpense({...newExpense, note: e.target.value})} placeholder="Đổ xăng, Mua giấy..." />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowExpenseModal(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl">Hủy</button>
                <button onClick={handleAddExpense} className="flex-1 py-4 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl">Lưu</button>
              </div>
           </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col my-auto overflow-hidden border border-slate-800 animate-in zoom-in duration-300">
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center px-8">
              <h3 className="font-black uppercase tracking-widest text-sm text-white">XEM TRƯỚC HÓA ĐƠN: {selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-indigo-500 transition-all text-white"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800">
                   <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Thanh toán</label>
                   <select value={selectedOrder.paymentStatus} onChange={(e) => updatePaymentStatus(selectedOrder.id, e.target.value as PaymentStatus)} className="w-full bg-slate-900 rounded-xl text-xs font-black p-2 text-slate-200 border-none outline-none">
                     {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Hình thức</label>
                  <select value={selectedOrder.paymentMethod} onChange={(e) => updatePaymentMethod(selectedOrder.id, e.target.value as PaymentMethod)} className="w-full bg-slate-900 rounded-xl text-xs font-black p-2 text-slate-200 border-none outline-none">
                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800">
                   <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Thao tác</label>
                   <button onClick={copyOrderLink} className="w-full bg-slate-800 text-[10px] font-black py-2 rounded-xl text-indigo-400 border border-indigo-900/30 hover:bg-indigo-900/20 transition-all"><i className="fas fa-link mr-2"></i> COPY LINK</button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-0 border border-slate-800 mb-6 overflow-hidden flex justify-center shadow-2xl relative">
                {isExporting && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Đang tạo tệp PDF...</p>
                  </div>
                )}
                <div id="printable-invoice" ref={printRef} className="bg-white p-8 mx-auto" style={{ width: '148mm', minHeight: '210mm', fontSize: '10pt', color: '#000000', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid black', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'black', margin: '0', lineHeight: '1' }}>NHÂN BẢN</h1>
                      <p style={{ fontSize: '7px', fontWeight: '900', color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>Photo-Print Pro Service</p>
                      <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'black', marginTop: '8px', lineHeight: '1.2' }}>
                        <p>{STORE_CONFIG.address}</p>
                        <p>Hotline: {STORE_CONFIG.hotline}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', fontWeight: '900', color: 'black', textTransform: 'uppercase', margin: '0' }}>HÓA ĐƠN DỊCH VỤ</p>
                      <p style={{ fontSize: '9px', fontWeight: 'bold', color: 'black', margin: '0' }}>Số: {selectedOrder.id}</p>
                      <p style={{ fontSize: '9px', fontWeight: 'bold', color: 'black', margin: '0' }}>{new Date(selectedOrder.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px', backgroundColor: '#f9fafb', padding: '16px', border: '1px solid #e5e7eb', fontSize: '10px', color: 'black' }}>
                    <h2 style={{ fontWeight: '900', color: 'black', textTransform: 'uppercase', borderBottom: '1px solid black', marginBottom: '8px', paddingBottom: '4px' }}>Thông tin khách hàng</h2>
                    <p><b>Họ tên:</b> {selectedOrder.customer.name}</p>
                    <p><b>Số điện thoại:</b> {selectedOrder.customer.phone}</p>
                    {selectedOrder.customer.address && <p><b>Địa chỉ:</b> {selectedOrder.customer.address}</p>}

                    {selectedOrder.hasVat && (
                      <div style={{ marginTop: '16px', paddingTop: '8px', borderTop: '1px dashed #9ca3af' }}>
                        <h2 style={{ fontWeight: '900', color: 'black', textTransform: 'uppercase', borderBottom: '1px solid #9ca3af', marginBottom: '8px', paddingBottom: '4px' }}>Thông tin VAT</h2>
                        <p><b>Đơn vị:</b> {selectedOrder.customer.companyName}</p>
                        <p><b>MST:</b> {selectedOrder.customer.taxCode}</p>
                        <p><b>Địa chỉ:</b> {selectedOrder.customer.companyAddress}</p>
                      </div>
                    )}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', color: 'black', border: '1px solid black' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'black', color: 'white' }}>
                        <th style={{ padding: '8px', textAlign: 'center', border: '1px solid black' }}>STT</th>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid black' }}>Dịch vụ</th>
                        <th style={{ padding: '8px', textAlign: 'center', border: '1px solid black' }}>SL</th>
                        <th style={{ padding: '8px', textAlign: 'right', border: '1px solid black' }}>Đơn giá</th>
                        <th style={{ padding: '8px', textAlign: 'right', border: '1px solid black' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((it, idx) => (
                        <tr key={it.id} style={{ borderBottom: '1px solid black' }}>
                          <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid black' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid black', fontWeight: 'bold' }}>{it.service}</td>
                          <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid black', fontWeight: 'bold' }}>{it.quantity}</td>
                          <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid black', fontWeight: 'bold' }}>{it.unitPrice.toLocaleString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: '900' }}>{(it.quantity * it.unitPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '1px solid black' }}>
                        <td colSpan={4} style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', textTransform: 'uppercase', borderRight: '1px solid black' }}>Tiền dịch vụ:</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{selectedOrder.subTotal.toLocaleString()}</td>
                      </tr>
                      {selectedOrder.hasVat && (
                        <tr style={{ borderTop: '1px solid black' }}>
                          <td colSpan={4} style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', textTransform: 'uppercase', borderRight: '1px solid black' }}>VAT (8%):</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{selectedOrder.vat.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr style={{ borderTop: '2px solid black', backgroundColor: '#f3f4f6' }}>
                        <td colSpan={4} style={{ padding: '8px', textAlign: 'right', fontWeight: '900', textTransform: 'uppercase', borderRight: '1px solid black', fontSize: '11px' }}>Tổng thanh toán:</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '900', color: '#dc2626', fontSize: '11px' }}>{selectedOrder.total.toLocaleString()}đ</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '16px', backgroundColor: '#f9fafb' }}>
                    <img 
                      src={generateQrUrl(selectedOrder.total, selectedOrder.id)} 
                      style={{ width: '176px', height: '176px', border: '4px solid white', borderRadius: '12px', marginBottom: '16px' }} 
                      crossOrigin="anonymous" 
                    />
                    <p style={{ fontSize: '10px', fontWeight: '900', color: '#1e40af', textTransform: 'uppercase', textAlign: 'center', margin: '0' }}>Quét mã QR để thanh toán đúng số tiền của dịch vụ</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '32px', padding: '0 16px', fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', color: 'black', fontStyle: 'italic' }}>
                    <div style={{ textAlign: 'center', width: '128px' }}>Khách hàng<br/><span style={{ fontSize: '7px', fontWeight: '400', color: '#9ca3af', marginTop: '4px', display: 'block' }}>(Ký & ghi rõ họ tên)</span></div>
                    <div style={{ textAlign: 'center', width: '128px' }}>Người lập biểu<br/><span style={{ fontSize: '7px', fontWeight: '400', color: '#9ca3af', marginTop: '4px', display: 'block' }}>(Ký & ghi rõ họ tên)</span></div>
                  </div>
                  <div style={{ position: 'absolute', bottom: '16px', left: '0', width: '100%', textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: '#9ca3af', letterSpacing: '0.1em', fontStyle: 'italic' }}>Cửa hàng Photocopy & In ấn chuyên nghiệp - Nhân Bản Photo-Print Pro</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  disabled={isExporting}
                  onClick={() => exportPDF()} 
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-500 transition-all disabled:opacity-50"
                >
                  <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'} mr-2`}></i> {isExporting ? "ĐANG TẠO PDF..." : "TẢI PDF"}
                </button>
                <button 
                  disabled={isSavingImg}
                  onClick={saveAsImage} 
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-500 transition-all disabled:opacity-50"
                >
                  {isSavingImg ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-image mr-2"></i>}
                  LƯU HÌNH ẢNH
                </button>
                <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-slate-800 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase hover:bg-slate-700 transition-all">ĐÓNG</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
