
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function parseOrderInput(input: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Bạn là một trợ lý ảo chuyên nghiệp cho cửa hàng photocopy và in ấn. 
    Nhiệm vụ: Phân tích đoạn văn bản từ giọng nói và trích xuất danh sách các dịch vụ chi tiết.
    
    Quy tắc nghiệp vụ:
    1. Nhận diện các dịch vụ phổ biến: Photocopy, In màu, In đen trắng, Đóng tập, Ép nhựa, In decal, Khổ giấy (A0, A1, A2, A3, A4, A5).
    2. Nếu khách nói "một trăm tờ" -> quantity = 100.
    3. Nếu không có đơn giá trong lời nói, hãy tự động gán giá thị trường hợp lý:
       - Photocopy A4: 500đ
       - In màu A4: 2000đ - 5000đ
       - Ép nhựa: 5000đ
       - Đóng gáy xoắn: 15000đ
    4. Phân tách rõ ràng nếu có nhiều dịch vụ trong một câu (ví dụ: "in 10 tờ màu A4 và photo 50 bản 2 mặt").
    5. Trích xuất ghi chú như "in 2 mặt", "giấy dày", "lấy gấp".

    Đầu vào: "${input}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            service: { type: Type.STRING, description: "Tên dịch vụ chi tiết" },
            quantity: { type: Type.NUMBER, description: "Số lượng (số nguyên)" },
            unitPrice: { type: Type.NUMBER, description: "Đơn giá (VNĐ)" },
            note: { type: Type.STRING, description: "Ghi chú kỹ thuật hoặc yêu cầu riêng" }
          },
          required: ["service", "quantity", "unitPrice"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Lỗi phân tích AI:", e);
    return [];
  }
}
