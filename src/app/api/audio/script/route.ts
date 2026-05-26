import { NextRequest, NextResponse } from 'next/server';
import { runCodex } from '@/lib/codex';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { content } = await req.json() as { content: string };

  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  try {
    const prompt = `Chuyển bài viết sau thành script đọc audio (podcast/voiceover) bằng tiếng Việt. Yêu cầu:
- Viết theo thể nói, tự nhiên khi đọc thành tiếng
- Bỏ các ký hiệu khó đọc (bullet, số thứ tự, dấu gạch ngang đầu dòng)
- Giữ nguyên nội dung, không thêm không bớt thông tin
- Dùng từ nối tự nhiên giữa các đoạn
- Không thêm lời mở đầu hay kết thúc của chính mình

Bài viết:
${content}`;

    const script = await runCodex(prompt, process.cwd(), 120_000);
    return NextResponse.json({ script });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate script' },
      { status: 500 },
    );
  }
}
