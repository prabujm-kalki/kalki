import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const formData = await request.formData();
    const files = Array.from(formData.entries()).filter(([key, value]) => value instanceof Blob);
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const urls: Record<string, string> = {};

    for (const [key, value] of files) {
      const file = value as File;
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      urls[key] = `/uploads/${filename}`;
    }

    return NextResponse.json({ urls });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
