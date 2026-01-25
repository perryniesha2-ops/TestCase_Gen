// app/api/requirements/import/route.ts - FILE IMPORT FOR EXTERNAL TOOLS
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ImportedRequirement {
  title: string;
  description: string;
  type?: string;
  priority?: string;
  status?: string;
  external_id?: string;
  acceptance_criteria?: string[];
  source: string;
  tags?: string[];
}

class ImportValidationError extends Error {
  code: string;
  meta?: any;

  constructor(code: string, message: string, meta?: any) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}


export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const source = (formData.get("source") as string) || "import";
    const projectId = (formData.get("project_id") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("📁 Importing file:", file.name, "Source:", source);

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let requirements: ImportedRequirement[] = [];
    const fileName = file.name.toLowerCase();

    // Parse based on file type
    try {
      if (fileName.endsWith(".csv")) {
        requirements = parseCSV(buffer.toString("utf-8"), source);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        requirements = parseExcel(buffer, source);
      } else if (fileName.endsWith(".json")) {
        requirements = parseJSON(buffer.toString("utf-8"), source);
      } else {
        return NextResponse.json(
          { error: "Unsupported file type. Use CSV, Excel (.xlsx), or JSON." },
          { status: 400 },
        );
      }
    } catch (parseError: any) {
      // "Negative test" scenario: file is valid, but not importable as requirements
      if (parseError instanceof ImportValidationError) {
        return NextResponse.json(
            {
              error: "File is valid but not importable",
              code: parseError.code,
              details: parseError.message,
              meta: parseError.meta ?? null,
            },
            { status: 400 },
        );
      }

      // True parsing failures (invalid JSON, unreadable CSV, etc.)
      return NextResponse.json(
          {
            error: "Failed to parse file",
            code: "PARSE_ERROR",
            details: parseError?.message || "Unknown error",
          },
          { status: 400 },
      );
    }


    console.log(`📋 Parsed ${requirements.length} requirements`);

    if (requirements.length === 0) {
      return NextResponse.json(
        { error: "No requirements found in file" },
        { status: 400 },
      );
    }

    // Insert requirements
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const req of requirements) {
      try {
        const { error: insertError } = await supabase
          .from("requirements")
          .insert({
            user_id: user.id,
            project_id: projectId,
            title: req.title,
            description: req.description,
            type: req.type || "functional",
            priority: req.priority || "medium",
            status: req.status || "draft",
            external_id: req.external_id || null,
            acceptance_criteria: req.acceptance_criteria || null,
            source: req.source,
            metadata: {
              imported_at: new Date().toISOString(),
              import_source: source,
              original_file: file.name,
            },
          });

        if (insertError) {
          failed++;
          errors.push(`"${req.title}": ${insertError.message}`);
          console.error("❌ Insert error:", insertError);
        } else {
          imported++;
        }
      } catch (error: any) {
        failed++;
        errors.push(`"${req.title}": ${error?.message || "Unknown error"}`);
      }
    }

    console.log(`✅ Imported: ${imported}, ❌ Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: requirements.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error: any) {
    console.error("❌ Import error:", error);
    return NextResponse.json(
      { error: error?.message || "Import failed" },
      { status: 500 },
    );
  }
}

// ===== CSV PARSER =====
function parseCSV(content: string, source: string): ImportedRequirement[] {
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV must have headers and at least one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requirements: ImportedRequirement[] = [];

  // Find column indices
  const colMap = {
    title: findColumn(headers, ["title", "summary", "name", "issue"]),
    description: findColumn(headers, [
      "description",
      "detail",
      "body",
      "content",
    ]),
    type: findColumn(headers, ["type", "category", "issue type"]),
    priority: findColumn(headers, ["priority"]),
    status: findColumn(headers, ["status", "state"]),
    id: findColumn(headers, ["id", "key", "issue key", "ticket"]),
    criteria: findColumn(headers, ["criteria", "acceptance", "conditions"]),
  };

  if (colMap.title === -1 || colMap.description === -1) {
    throw new Error("CSV must have title/summary and description columns");
  }

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length <= Math.max(colMap.title, colMap.description)) continue;

    const title = values[colMap.title]?.trim();
    const description = values[colMap.description]?.trim();

    if (!title || !description) continue;

    const req: ImportedRequirement = {
      title,
      description,
      type: colMap.type >= 0 ? normalizeType(values[colMap.type]) : undefined,
      priority:
        colMap.priority >= 0
          ? normalizePriority(values[colMap.priority])
          : undefined,
      status:
        colMap.status >= 0 ? normalizeStatus(values[colMap.status]) : undefined,
      external_id: colMap.id >= 0 ? values[colMap.id]?.trim() : undefined,
      source,
    };

    if (colMap.criteria >= 0 && values[colMap.criteria]) {
      req.acceptance_criteria = values[colMap.criteria]
        .split(/[;\n|]/)
        .map((c) => c.trim())
        .filter(Boolean);
    }

    requirements.push(req);
  }

  return requirements;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result.map((v) => v.replace(/^"|"$/g, "").trim());
}

// ===== EXCEL PARSER =====
function parseExcel(buffer: Buffer, source: string): ImportedRequirement[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  if (data.length < 2) {
    throw new Error("Excel must have headers and at least one data row");
  }

  const headers = data[0].map((h: any) =>
    String(h || "")
      .toLowerCase()
      .trim(),
  );
  const requirements: ImportedRequirement[] = [];

  const colMap = {
    title: findColumn(headers, ["title", "summary", "name"]),
    description: findColumn(headers, ["description", "detail", "body"]),
    type: findColumn(headers, ["type", "category"]),
    priority: findColumn(headers, ["priority"]),
    status: findColumn(headers, ["status", "state"]),
    id: findColumn(headers, ["id", "key", "issue key"]),
    criteria: findColumn(headers, ["criteria", "acceptance"]),
  };

  if (colMap.title === -1 || colMap.description === -1) {
    throw new Error("Excel must have title/summary and description columns");
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const title = String(row[colMap.title] || "").trim();
    const description = String(row[colMap.description] || "").trim();

    if (!title || !description) continue;

    const req: ImportedRequirement = {
      title,
      description,
      type: colMap.type >= 0 ? normalizeType(row[colMap.type]) : undefined,
      priority:
        colMap.priority >= 0
          ? normalizePriority(row[colMap.priority])
          : undefined,
      status:
        colMap.status >= 0 ? normalizeStatus(row[colMap.status]) : undefined,
      external_id:
        colMap.id >= 0 ? String(row[colMap.id] || "").trim() : undefined,
      source,
    };

    if (colMap.criteria >= 0 && row[colMap.criteria]) {
      req.acceptance_criteria = String(row[colMap.criteria])
        .split(/[;\n|]/)
        .map((c) => c.trim())
        .filter(Boolean);
    }

    requirements.push(req);
  }

  return requirements;
}

// ===== JSON PARSER =====
function parseJSON(content: string, source: string): ImportedRequirement[] {
  let data: any;
  try {
    data = JSON.parse(content);
  } catch (e: any) {
    // Truly invalid JSON
    throw new ImportValidationError(
        "INVALID_JSON",
        e?.message || "Invalid JSON",
    );
  }

  let items: any[] | null = null;

  // Handle different JSON structures (known exports)
  if (Array.isArray(data)) {
    items = data;
  } else if (Array.isArray(data?.issues)) {
    // Jira format
    items = data.issues;
  } else if (Array.isArray(data?.results)) {
    // Confluence format
    items = data.results;
  } else if (Array.isArray(data?.value)) {
    // Azure DevOps format
    items = data.value;
  }

  // Negative test: valid JSON but wrong shape (e.g., package.json)
  if (!items) {
    const topLevelKeys =
        data && typeof data === "object" && !Array.isArray(data)
            ? Object.keys(data).slice(0, 20)
            : [];

    throw new ImportValidationError(
        "UNSUPPORTED_JSON_SHAPE",
        "JSON parsed successfully, but it does not appear to be a requirements export. Expected an array, or an object containing one of: issues[], results[], value[].",
        { topLevelKeys },
    );
  }

  const requirements: ImportedRequirement[] = [];

  for (const item of items) {
    // Jira / generic item mapping
    const title =
        item.title || item.summary || item.fields?.summary || item.System?.Title;

    const description =
        item.description ||
        item.body ||
        item.fields?.description ||
        item.System?.Description ||
        item.fields?.description?.content?.[0]?.content?.[0]?.text;

    if (!title || !description) continue;

    requirements.push({
      title: String(title).trim(),
      description: String(description).trim(),
      type: normalizeType(
          item.type || item.fields?.issuetype?.name || item.System?.WorkItemType,
      ),
      priority: normalizePriority(
          item.priority || item.fields?.priority?.name || item.System?.Priority,
      ),
      status: normalizeStatus(
          item.status || item.fields?.status?.name || item.System?.State,
      ),
      external_id: item.key || item.id || String(item.System?.Id || ""),
      source,
    });
  }

  // Negative test: correct container, but nothing importable
  if (requirements.length === 0) {
    throw new ImportValidationError(
        "NO_IMPORTABLE_ROWS",
        "JSON parsed successfully, but no items contained both a title and a description.",
    );
  }

  return requirements;
}


// ===== HELPER FUNCTIONS =====
function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

function normalizeType(value: any): string {
  const str = String(value || "")
    .toLowerCase()
    .trim();

  if (str.includes("story") || str.includes("user")) return "user_story";
  if (str.includes("bug") || str.includes("defect")) return "functional";
  if (str.includes("epic")) return "business";
  if (str.includes("task")) return "functional";
  if (str.includes("security")) return "security";
  if (str.includes("performance")) return "non_functional";
  if (str.includes("technical")) return "technical";

  return "functional";
}

function normalizePriority(value: any): string {
  const str = String(value || "")
    .toLowerCase()
    .trim();

  if (
    str.includes("critical") ||
    str.includes("blocker") ||
    str.includes("highest") ||
    str.includes("1")
  )
    return "critical";
  if (str.includes("high") || str.includes("major") || str.includes("2"))
    return "high";
  if (
    str.includes("low") ||
    str.includes("minor") ||
    str.includes("trivial") ||
    str.includes("4")
  )
    return "low";

  return "medium";
}

function normalizeStatus(value: any): string {
  const str = String(value || "")
    .toLowerCase()
    .trim();

  if (
    str.includes("done") ||
    str.includes("closed") ||
    str.includes("resolved") ||
    str.includes("complete")
  )
    return "implemented";
  if (
    str.includes("progress") ||
    str.includes("development") ||
    str.includes("active")
  )
    return "approved";
  if (str.includes("test") || str.includes("qa")) return "tested";
  if (str.includes("reject") || str.includes("cancel")) return "rejected";

  return "draft";
}
