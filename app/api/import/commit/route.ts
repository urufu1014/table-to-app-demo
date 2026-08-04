import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { commitCsvImportRows } from "@/lib/server/csv-import";

export async function POST(request: Request) {
  const { profile, supabase } = await requireRole(["admin"]);
  const body = await request.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const filename = String(body.filename ?? "uploaded.csv");

  const result = await commitCsvImportRows({ supabase, profileId: profile.id, filename, rows });

  revalidatePath("/jobs");
  return NextResponse.json({
    batchId: result.batchId,
    totalRows: result.totalRows,
    successRows: result.successRows,
    failedRows: result.failedRows,
    errorCount: result.errorCount
  });
}
