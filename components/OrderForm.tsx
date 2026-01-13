
import React, { useState, useEffect } from 'react';
import AIAssistant from './AIAssistant';
import { OrderItem, CustomerInfo, PresetService } from '../types';

interface OrderFormProps {
  onSave: (items: OrderItem[], hasVat: boolean, customer: CustomerInfo) => void;
  onCancel: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ onSave, onCancel }) => {
  const [items, setItems] = useState<Partial<OrderItem>[]>([
    { service: '', quantity: 1, unitPrice: 0, note: '' }
  ]);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', phone: '', address: '', companyName: '', taxCode: '', companyAddress: '', buyerName: ''
  });
  const [hasVat, setHasVat] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [presets, setPresets] = useState<PresetService[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('nb_preset_services');
    if (saved) setPresets(JSON.parse(saved));
  }, []);

  const addItem = () => setItems([...items, { service: '', quantity: 1, unitPrice: 0, note: '' }]);
  const removeItem = (index: number) => items.length > 1 ? setItems(items.filter((_, i) => i !== index)) : setItems([{ service: '', quantity: 1, unitPrice: 0, note: '' }]);
  
  const updateItemManual = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const addPresetItem = (preset: PresetService) => {
    const lastItem = items[items.length - 1];
    if (!lastItem.service) {
      updateItemManual(items.length - 1, 'service', preset.name);
      updateItemManual(items.length - 1, 'unitPrice', preset.defaultPrice);
    } else {
      setItems([...items, { service: preset.name, quantity: 1, unitPrice: preset.defaultPrice, note: '' }]);
    }
  };

  const handleAIParsed = (newItems: OrderItem[]) => {
    setItems(prev => {
      const filtered = prev.filter(p => p.service !== '');
      return [...filtered, ...newItems];
    });
  };

  const subTotal = items.reduce((sum, it) => sum + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
  const vat = hasVat ? Math.round(subTotal * 0.08) : 0;
  const total = subTotal + vat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.service?.trim());
    if (!validItems.length || !customer.name || !customer.phone) return alert("Vui lòng điền đủ Họ tên, SĐT và ít nhất 1 dịch vụ!");
    
    if (hasVat) {
      if (!customer.companyName || !customer.taxCode || !customer.companyAddress) {
        return alert("Khi xuất hóa đơn VAT, vui lòng nhập đầy đủ: Tên công ty, MST và Địa chỉ công ty!");
      }
    }

    // Call onSave. The App component handles switching view and selecting the order for PDF export.
    onSave(validItems.map((it, idx) => ({ ...it, id: it.id || Math.random().toString(), stt: idx + 1 })) as OrderItem[], hasVat, customer);
  };

  return (
    <div className="bg-slate-900 p-4 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight">Thiết lập đơn hàng</h2>
          <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Điền thông tin hoặc dùng AI để tự động hóa.</p>
        </div>
        <button type="button" onClick={() => setShowAIAssistant(true)} className="w-full lg:w-auto flex items-center justify-center gap-4 px-8 py-5 rounded-[2rem] shadow-2xl transition-all active:scale-95 font-black text-xs uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/40">
          <span className="text-xl">✨</span> Trợ Lý AI Lên Đơn
        </button>
      </div>

      {showAIAssistant && <AIAssistant onParsed={handleAIParsed} onClose={() => setShowAIAssistant(false)} />}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative shadow-inner">
          <div className="absolute -top-3 left-8 bg-rose-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Khách hàng & Giao nhận</div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Họ tên *</label><input required className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Tên khách hàng" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Số điện thoại *</label><input required className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="SĐT khách" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Địa chỉ giao hàng</label><input className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.address || ''} onChange={e => setCustomer({...customer, address: e.target.value})} placeholder="Địa chỉ giao hàng (nếu có)" /></div>
        </div>

        {presets.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-4">Dịch vụ nhanh (Click để thêm)</h4>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button 
                  key={p.id} 
                  type="button" 
                  onClick={() => addPresetItem(p)}
                  className="bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all active:scale-95 shadow-lg"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasVat && (
          <div className="bg-indigo-900/10 p-6 md:p-8 rounded-[2rem] border border-indigo-500/30 grid grid-cols-1 md:grid-cols-2 gap-6 relative animate-in slide-in-from-top-4 duration-300">
            <div className="absolute -top-3 left-8 bg-indigo-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Thông tin xuất hóa đơn VAT</div>
            <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Tên công ty *</label><input required={hasVat} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-200" value={customer.companyName || ''} onChange={e => setCustomer({...customer, companyName: e.target.value})} placeholder="Công ty TNHH..." /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Mã số thuế *</label><input required={hasVat} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-200" value={customer.taxCode || ''} onChange={e => setCustomer({...customer, taxCode: e.target.value})} placeholder="MST" /></div>
            <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Địa chỉ công ty *</label><input required={hasVat} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-200" value={customer.companyAddress || ''} onChange={e => setCustomer({...customer, companyAddress: e.target.value})} placeholder="Địa chỉ đăng ký kinh doanh" /></div>
          </div>
        )}

        <div className="overflow-x-auto no-scrollbar rounded-[2rem] border border-slate-800 bg-slate-950 shadow-inner">
          <table className="w-full min-w-[950px]">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="px-6 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4 text-left">Dịch vụ</th>
                <th className="px-6 py-4 w-20 text-center">SL</th>
                <th className="px-6 py-4 w-36 text-right">Đơn giá</th>
                <th className="px-6 py-4 text-left">Ghi chú</th>
                <th className="px-6 py-4 w-36 text-right">Thành tiền</th>
                <th className="px-6 py-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-bold text-slate-300">
              {items.map((item, index) => (
                <tr key={index} className="group hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 text-center text-slate-600 font-black">{index + 1}</td>
                  <td className="px-6 py-4"><input className="w-full bg-transparent border-none focus:ring-0 p-0 font-black text-slate-200 outline-none" value={item.service} onChange={e => updateItemManual(index, 'service', e.target.value)} required placeholder="In, Photo..." /></td>
                  <td className="px-6 py-4"><input type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-center font-black text-slate-200 outline-none" value={item.quantity || ''} onChange={e => updateItemManual(index, 'quantity', parseInt(e.target.value) || 0)} /></td>
                  <td className="px-6 py-4"><input type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-right font-black text-slate-200 outline-none" value={item.unitPrice || ''} onChange={e => updateItemManual(index, 'unitPrice', parseInt(e.target.value) || 0)} /></td>
                  <td className="px-6 py-4"><input className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-slate-400 italic outline-none" value={item.note || ''} onChange={e => updateItemManual(index, 'note', e.target.value)} placeholder="Yêu cầu riêng" /></td>
                  <td className="px-6 py-4 text-right text-indigo-400 font-black tracking-tight">{((item.quantity||0)*(item.unitPrice||0)).toLocaleString()}đ</td>
                  <td className="px-6 py-4 text-center"><button type="button" onClick={() => removeItem(index)} className="text-slate-600 hover:text-rose-500 transition-all hover:scale-125"><i className="fas fa-trash-can text-xs"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex"><button type="button" onClick={addItem} className="px-6 py-3 bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-700 shadow-lg active:scale-95"><i className="fas fa-plus-circle text-rose-500"></i> Thêm dịch vụ</button></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner">
            <div className="flex justify-between items-center mb-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tổng kết tài chính</h4>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={hasVat} onChange={() => setHasVat(!hasVat)} />
                  <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full border border-slate-700"></div>
                  <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Xuất hóa đơn VAT (8%)</span>
               </label>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-400"><span>Tiền dịch vụ:</span><span>{subTotal.toLocaleString()}đ</span></div>
              {hasVat && <div className="flex justify-between text-xs font-bold text-indigo-400 animate-in fade-in"><span>Thuế GTGT (8%):</span><span>{vat.toLocaleString()}đ</span></div>}
              <div className="flex justify-between font-black text-2xl text-rose-500 pt-4 border-t border-slate-800 mt-2 uppercase tracking-tighter"><span>Tổng cộng:</span><span>{total.toLocaleString()}đ</span></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end justify-center sm:justify-end gap-4">
            <button type="button" onClick={onCancel} className="w-full sm:w-auto px-10 py-5 bg-slate-900 border border-slate-800 font-black text-xs uppercase tracking-widest rounded-3xl text-slate-500 hover:text-slate-300 transition-all">Hủy</button>
            <button type="submit" className="w-full sm:w-auto px-14 py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-3xl shadow-2xl shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-95">Lưu đơn & Xuất PDF</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
