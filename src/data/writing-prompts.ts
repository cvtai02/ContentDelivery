export type WritingCategory = 'blog' | 'social' | 'creative' | 'journal';

export interface WritingPrompt {
  category: WritingCategory;
  prompt: string;
  hint: string;
}

export const PROMPTS: WritingPrompt[] = [
  // Blog
  { category: 'blog',     prompt: 'Điều gì bạn ước mình biết sớm hơn 5 năm trước?',          hint: 'Chia sẻ bài học cá nhân dưới dạng danh sách 5-7 điểm' },
  { category: 'blog',     prompt: 'Công cụ AI nào đang thay đổi workflow của bạn?',            hint: 'So sánh trước/sau khi dùng, kèm ví dụ thực tế' },
  { category: 'blog',     prompt: 'Thói quen buổi sáng giúp bạn tập trung cả ngày như thế nào?', hint: 'Mô tả routine cụ thể, tránh lý thuyết chung chung' },
  { category: 'blog',     prompt: 'Một cuốn sách đã thay đổi cách bạn nhìn nhận công việc?',  hint: 'Tóm tắt 3 ý chính và áp dụng vào thực tế của bạn' },
  { category: 'blog',     prompt: 'Sai lầm lớn nhất bạn mắc trong dự án gần nhất là gì?',     hint: 'Trung thực, kể cụ thể, rút ra bài học' },
  // Social
  { category: 'social',   prompt: 'Một sự thật phản trực giác về lĩnh vực bạn đang làm?',     hint: 'Bắt đầu bằng "Hầu hết mọi người nghĩ X, nhưng thực ra..."' },
  { category: 'social',   prompt: 'Khoảnh khắc nào hôm nay khiến bạn học được điều gì đó?',   hint: 'Ngắn, cụ thể, kết thúc bằng 1 câu hỏi cho người đọc' },
  { category: 'social',   prompt: 'Chia sẻ 1 tài nguyên miễn phí mà ít người biết đến.',      hint: 'Nêu link, giải thích dùng để làm gì, ai nên dùng' },
  { category: 'social',   prompt: 'Hot take: điều gì trong ngành của bạn cần thay đổi gấp?',   hint: 'Dũng cảm, có lập luận, tránh mơ hồ' },
  { category: 'social',   prompt: 'Bạn đang đọc/xem/nghe gì hay? Tại sao nên thử?',           hint: 'Format: Đang [đọc/xem/nghe]: [tên] — [1 câu lý do]' },
  // Creative
  { category: 'creative',  prompt: 'Viết đoạn mở đầu cho câu chuyện bắt đầu bằng: "Cái email đó không nên tồn tại."', hint: 'Tạo không khí bí ẩn ngay từ câu đầu tiên' },
  { category: 'creative',  prompt: 'Mô tả một thành phố mà ở đó thời gian chạy ngược.',        hint: 'Tập trung vào chi tiết cảm giác: âm thanh, mùi hương, ánh sáng' },
  { category: 'creative',  prompt: 'Viết cuộc hội thoại giữa phiên bản hiện tại và tương lai của bạn.', hint: 'Tương lai không được tiết lộ mọi thứ — chỉ gợi ý' },
  { category: 'creative',  prompt: 'Một vật thể bình thường kể câu chuyện từ góc nhìn của nó.', hint: 'Chọn vật thể đơn giản, đặt vào tình huống bất ngờ' },
  { category: 'creative',  prompt: 'Viết bức thư gửi cho người xa lạ mà bạn chỉ gặp 1 lần.',   hint: 'Đừng giải thích bối cảnh — để người đọc tự hình dung' },
  // Journal
  { category: 'journal',   prompt: 'Điều gì đang chiếm nhiều năng lượng nhất của bạn tuần này?', hint: 'Thành thật với bản thân, không cần phân tích — chỉ cần viết ra' },
  { category: 'journal',   prompt: 'Ba điều bạn biết ơn hôm nay, một trong số đó phải rất nhỏ nhặt.', hint: 'Cụ thể càng tốt: không phải "sức khỏe" mà là "ly cà phê lúc 7 sáng"' },
  { category: 'journal',   prompt: 'Mục tiêu tuần này — bạn đang tiến triển hay bị trì hoãn? Tại sao?', hint: 'Không phán xét, chỉ quan sát trung thực' },
  { category: 'journal',   prompt: 'Nếu tuần này là 1 màu sắc, đó là màu gì? Vì sao?',          hint: 'Để trực giác dẫn dắt, đừng suy nghĩ quá nhiều' },
  { category: 'journal',   prompt: 'Điều gì bạn đã trì hoãn quá lâu và cần làm ngay hôm nay?',  hint: 'Viết ra, rồi đặt timer 25 phút và bắt đầu' },
];

export function getDailyPrompts(): WritingPrompt[] {
  const today = new Date();
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const shuffle = (arr: WritingPrompt[], s: number) => {
    const a = [...arr];
    let current = s;
    for (let i = a.length - 1; i > 0; i--) {
      current = (current * 1664525 + 1013904223) >>> 0;
      const j = current % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return shuffle(PROMPTS, seed);
}
