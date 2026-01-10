
import React, { useState, useEffect, useRef } from 'react';
import { parseOrderInput } from '../services/geminiService';
import { OrderItem, CustomerInfo } from '../types';

interface OrderFormProps {
  onSave: (items: OrderItem[], hasVat: boolean, customer: CustomerInfo) => void;
  onCancel: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ onSave, onCancel }) => {
  const [items, setItems] = useState<Partial<OrderItem>[]>([
    { service: '', quantity: 0, unitPrice: 0, note: '' }
  ]);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '', phone: '', address: '', company: '', socialLink: ''
  });
  const [hasVat, setHasVat] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'vi-VN';
      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsProcessing(true);
        setIsListening(false);
        const aiItems = await parseOrderInput(transcript);
        if (aiItems && aiItems.length > 0) {
          setItems(prev => [...prev.filter(p => p.service !== ''), ...aiItems.map((it: any) => ({ ...it, id: Math.random().toString() }))]);
        }
        setIsProcessing(false);
      };
      recognitionRef.current.onerror = () => { setIsListening(false); setIsProcessing(false); };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const addItem = () => setItems([...items, { service: '', quantity: 0, unitPrice: 0, note: '' }]);
  const removeItem = (index: number) => items.length > 1 ? setItems(items.filter((_, i) => i !== index)) : setItems([{ service: '', quantity: 0, unitPrice: 0, note: '' }]);
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const subTotal = items.reduce((sum, it) => sum + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
  const vat = hasVat ? Math.round(subTotal * 0.08) : 0;
  const total = subTotal + vat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.service?.trim());
    if (!validItems.length || !customer.name || !customer.phone) return alert("Vui lòng điền đủ thông tin!");
    onSave(validItems.map((it, idx) => ({ ...it, id: it.id || Math.random().toString(), stt: idx + 1 })) as OrderItem[], hasVat, customer);
  };

  return (
    <div className="bg-slate-900 p-4 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight">Thiết lập đơn hàng</h2>
          <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Hỗ trợ nhập liệu bằng giọng nói thông minh</p>
        </div>
        <button type="button" onClick={startListening} disabled={isListening} className={`w-full lg:w-auto flex items-center justify-center gap-4 px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 font-black text-xs uppercase tracking-wider ${isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-900/30 text-rose-500 hover:bg-rose-900/50 border border-rose-900/40'}`}>
          <i className={`fas ${isListening ? 'fa-circle-dot' : 'fa-microphone-lines'} text-base`}></i>
          {isListening ? 'Hệ thống đang nghe...' : 'Bấm để nói nội dung đơn'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          <div className="absolute -top-3 left-8 bg-rose-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Khách hàng</div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Họ tên *</label>
            <input required className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Nguyễn Văn A" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Số điện thoại *</label>
            <input required className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="090XXXXXXX" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Mạng xã hội</label>
            <input className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-slate-200" value={customer.socialLink} onChange={e => setCustomer({...customer, socialLink: e.target.value})} placeholder="Zalo / Facebook" />
          </div>
        </div>

        {isProcessing && (
          <div className="p-4 bg-indigo-900/20 border border-indigo-900/30 rounded-2xl flex items-center gap-3 text-indigo-400 font-black text-[10px] uppercase animate-pulse">
            <i className="fas fa-robot text-base"></i> AI đang phân tích lời nói...
          </div>
        )}

        <div className="overflow-x-auto no-scrollbar rounded-[2rem] border border-slate-800 bg-slate-950">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="px-6 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4 text-left">Dịch vụ photocopy / in ấn</th>
                <th className="px-6 py-4 w-24 text-center">SL</th>
                <th className="px-6 py-4 w-40 text-right">Đơn giá</th>
                <th className="px-6 py-4 w-40 text-right">Tổng</th>
                <th className="px-6 py-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-bold text-slate-300">
              {items.map((item, index) => (
                <tr key={index} className="group hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 text-center text-slate-600">{index + 1}</td>
                  <td className="px-6 py-4"><input className="w-full bg-transparent border-none focus:ring-0 p-0 font-black text-slate-200 outline-none" value={item.service} onChange={e => updateItem(index, 'service', e.target.value)} required placeholder="VD: Photo A4 2 mặt..." /></td>
                  <td className="px-6 py-4"><input type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-center font-black text-slate-200 outline-none" value={item.quantity || ''} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} /></td>
                  <td className="px-6 py-4"><input type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-right font-black text-slate-200 outline-none" value={item.unitPrice || ''} onChange={e => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)} /></td>
                  <td className="px-6 py-4 text-right text-indigo-400 font-black tracking-tight">{((item.quantity||0)*(item.unitPrice||0)).toLocaleString()}đ</td>
                  <td className="px-6 py-4 text-center"><button type="button" onClick={() => removeItem(index)} className="text-slate-600 hover:text-rose-500 transition-colors"><i className="fas fa-trash-can"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex">
          <button type="button" onClick={addItem} className="px-6 py-3 bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-700">
            <i className="fas fa-plus-circle"></i> Thêm dịch vụ
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner">
            <div className="flex justify-between items-center mb-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tóm tắt thanh toán</h4>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={hasVat} onChange={() => setHasVat(!hasVat)} />
                  <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-rose-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full border border-slate-700"></div>
                  <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-slate-400">VAT 8%</span>
               </label>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-400"><span>Tạm tính:</span><span>{subTotal.toLocaleString()}đ</span></div>
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>Thuế VAT:</span><span>{vat.toLocaleString()}đ</span></div>
              <div className="flex justify-between font-black text-2xl text-rose-500 pt-4 border-t border-slate-800 mt-2"><span>TỔNG CỘNG:</span><span>{total.toLocaleString()}đ</span></div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end justify-center sm:justify-end gap-4">
            <button type="button" onClick={onCancel} className="w-full sm:w-auto px-10 py-5 bg-slate-900 border border-slate-800 font-black text-xs uppercase tracking-widest rounded-3xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all order-2 sm:order-1">Hủy đơn</button>
            <button type="submit" className="w-full sm:w-auto px-14 py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-3xl shadow-2xl shadow-indigo-900/40 hover:bg-indigo-500 transition-all active:scale-95 order-1 sm:order-2">Lưu đơn hàng</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
