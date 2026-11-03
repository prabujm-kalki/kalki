import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "tasks");
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || "";
    const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${cleanBase}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/tasks/${filename}`;
    return NextResponse.json({ url: fileUrl, filename: file.name });
  } catch (error) {
    console.error("Task file upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
