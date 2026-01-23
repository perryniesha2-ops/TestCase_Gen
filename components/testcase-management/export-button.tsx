// components/test-cases/export-button.tsx
"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface TestCase {
  id: string;
  title: string;
  description: string;
  test_type: string;
  priority: string;
  preconditions: string | null;
  test_steps: Array<{ step_number: number; action: string; expected: string }>;
  expected_result: string;
  is_edge_case: boolean;
  is_negative_test: boolean;
  is_security_test: boolean;
  is_boundary_test: boolean;
  tags?: string[];
}

interface ExportButtonProps {
  testCases: TestCase[];
  generationTitle?: string;
  disabled?: boolean;
}

export function ExportButton({
  testCases,
  generationTitle = "Test Cases",
  disabled,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const convertToGherkin = (tc: TestCase): string => {
    const steps = tc.test_steps
      .map((step, idx) => {
        const keyword = idx === 0 ? "Given" : "When";
        return `  ${keyword} ${step.action}\n  Then ${step.expected}`;
      })
      .join("\n");

    const tags = tc.tags?.map((t) => `@${t}`).join(" ") || "";
    const preconditions = tc.preconditions
      ? `  # Preconditions: ${tc.preconditions}\n`
      : "";

    return `${tags ? tags + "\n" : ""}Scenario: ${
      tc.title
    }\n${preconditions}${steps}\n`;
  };

  const convertToCucumber = (testCases: TestCase[]): string => {
    const featureName = generationTitle;
    let feature = `Feature: ${featureName}\n`;
    feature += `  As a QA engineer\n`;
    feature += `  I want to test ${featureName.toLowerCase()}\n`;
    feature += `  So that I can ensure quality\n\n`;

    testCases.forEach((tc) => {
      feature += convertToGherkin(tc) + "\n";
    });

    return feature;
  };

  const convertToTestRailXML = (testCases: TestCase[]): string => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<suite name="${generationTitle}">\n`;
    xml += `  <sections>\n`;
    xml += `    <section name="${generationTitle}">\n`;
    xml += `      <cases>\n`;

    testCases.forEach((tc) => {
      xml += `        <case>\n`;
      xml += `          <id><![CDATA[${tc.id}]]></id>\n`;
      xml += `          <title><![CDATA[${tc.title}]]></title>\n`;
      xml += `          <template>Test Case (Steps)</template>\n`;
      xml += `          <type>${tc.test_type}</type>\n`;
      xml += `          <priority>${tc.priority}</priority>\n`;
      xml += `          <estimate></estimate>\n`;
      xml += `          <references></references>\n`;
      xml += `          <custom>\n`;
      xml += `            <preconds><![CDATA[${
        tc.preconditions || ""
      }]]></preconds>\n`;
      xml += `            <steps>\n`;

      tc.test_steps.forEach((step) => {
        xml += `              <step>\n`;
        xml += `                <index>${step.step_number}</index>\n`;
        xml += `                <content><![CDATA[${step.action}]]></content>\n`;
        xml += `                <expected><![CDATA[${step.expected}]]></expected>\n`;
        xml += `              </step>\n`;
      });

      xml += `            </steps>\n`;
      xml += `            <expected><![CDATA[${tc.expected_result}]]></expected>\n`;

      // Custom fields for test type flags
      xml += `            <automation_type>${
        tc.is_negative_test
          ? "Negative"
          : tc.is_security_test
          ? "Security"
          : tc.is_boundary_test
          ? "Boundary"
          : "Functional"
      }</automation_type>\n`;
      xml += `          </custom>\n`;
      xml += `        </case>\n`;
    });

    xml += `      </cases>\n`;
    xml += `    </section>\n`;
    xml += `  </sections>\n`;
    xml += `</suite>`;

    return xml;
  };

  const convertToJiraCSV = (testCases: TestCase[]): string => {
    let csv =
      "Test Case Key,Summary,Priority,Component,Labels,Objective,Precondition,Test Step,Test Data,Expected Result,Test Type\n";

    testCases.forEach((tc, idx) => {
      const testCaseKey = `TC-${String(idx + 1).padStart(4, "0")}`;
      const labels = [];
      if (tc.is_negative_test) labels.push("negative-test");
      if (tc.is_security_test) labels.push("security-test");
      if (tc.is_boundary_test) labels.push("boundary-test");
      if (tc.is_edge_case) labels.push("edge-case");
      if (tc.tags) labels.push(...tc.tags);

      const steps = tc.test_steps
        .map((s) => `${s.step_number}. ${s.action}`)
        .join(" | ");
      const expected = tc.test_steps
        .map((s) => `${s.step_number}. ${s.expected}`)
        .join(" | ");

      const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

      csv += `${testCaseKey},`;
      csv += `${escapeCsv(tc.title)},`;
      csv += `${tc.priority.toUpperCase()},`;
      csv += `${escapeCsv(tc.test_type)},`;
      csv += `${escapeCsv(labels.join(", "))},`;
      csv += `${escapeCsv(tc.description)},`;
      csv += `${escapeCsv(tc.preconditions || "")},`;
      csv += `${escapeCsv(steps)},`;
      csv += `,`; // Test Data column (empty)
      csv += `${escapeCsv(expected)},`;
      csv += `${escapeCsv(tc.test_type)}\n`;
    });

    return csv;
  };

  const convertToJSON = (testCases: TestCase[]): string => {
    return JSON.stringify(
      {
        suite: generationTitle,
        generated_at: new Date().toISOString(),
        test_cases: testCases.map((tc) => ({
          id: tc.id,
          title: tc.title,
          description: tc.description,
          type: tc.test_type,
          priority: tc.priority,
          preconditions: tc.preconditions,
          steps: tc.test_steps,
          expected_result: tc.expected_result,
          flags: {
            is_edge_case: tc.is_edge_case,
            is_negative_test: tc.is_negative_test,
            is_security_test: tc.is_security_test,
            is_boundary_test: tc.is_boundary_test,
          },
          tags: tc.tags || [],
        })),
      },
      null,
      2
    );
  };

  const convertToMarkdown = (testCases: TestCase[]): string => {
    let md = `# ${generationTitle}\n\n`;
    md += `Generated: ${new Date().toLocaleString()}\n`;
    md += `Total Test Cases: ${testCases.length}\n\n`;

    // Statistics
    const stats = {
      negative: testCases.filter((tc) => tc.is_negative_test).length,
      security: testCases.filter((tc) => tc.is_security_test).length,
      boundary: testCases.filter((tc) => tc.is_boundary_test).length,
      edge: testCases.filter((tc) => tc.is_edge_case).length,
    };

    md += `## Test Statistics\n\n`;
    md += `- Negative Tests: ${stats.negative}\n`;
    md += `- Security Tests: ${stats.security}\n`;
    md += `- Boundary Tests: ${stats.boundary}\n`;
    md += `- Edge Cases: ${stats.edge}\n\n`;

    md += `---\n\n`;

    testCases.forEach((tc, idx) => {
      md += `## Test Case ${idx + 1}: ${tc.title}\n\n`;
      md += `**Type:** ${tc.test_type}  \n`;
      md += `**Priority:** ${tc.priority}  \n`;

      const flags = [];
      if (tc.is_negative_test) flags.push("Negative Test");
      if (tc.is_security_test) flags.push("Security Test");
      if (tc.is_boundary_test) flags.push("Boundary Test");
      if (tc.is_edge_case) flags.push("Edge Case");
      if (flags.length > 0) {
        md += `**Flags:** ${flags.join(", ")}  \n`;
      }

      md += `\n**Description:**  \n${tc.description}\n\n`;

      if (tc.preconditions) {
        md += `**Preconditions:**  \n${tc.preconditions}\n\n`;
      }

      md += `**Test Steps:**\n\n`;
      tc.test_steps.forEach((step) => {
        md += `${step.step_number}. **Action:** ${step.action}\n`;
        md += `   **Expected:** ${step.expected}\n\n`;
      });

      md += `**Expected Result:**  \n${tc.expected_result}\n\n`;
      md += `---\n\n`;
    });

    return md;
  };

  const handleExport = async (format: string) => {
    if (testCases.length === 0) {
      toast.error("No test cases to export");
      return;
    }

    setExporting(true);

    try {
      let content = "";
      let filename = "";
      let mimeType = "";

      const timestamp = new Date().toISOString().split("T")[0];
      const baseFilename = generationTitle.toLowerCase().replace(/\s+/g, "-");

      switch (format) {
        case "gherkin":
          content = testCases.map(convertToGherkin).join("\n");
          filename = `${baseFilename}-gherkin-${timestamp}.feature`;
          mimeType = "text/plain";
          break;

        case "cucumber":
          content = convertToCucumber(testCases);
          filename = `${baseFilename}-${timestamp}.feature`;
          mimeType = "text/plain";
          break;

        case "testrail":
          content = convertToTestRailXML(testCases);
          filename = `${baseFilename}-testrail-${timestamp}.xml`;
          mimeType = "application/xml";
          break;

        case "jira":
          content = convertToJiraCSV(testCases);
          filename = `${baseFilename}-jira-${timestamp}.csv`;
          mimeType = "text/csv";
          break;

        case "json":
          content = convertToJSON(testCases);
          filename = `${baseFilename}-${timestamp}.json`;
          mimeType = "application/json";
          break;

        case "markdown":
          content = convertToMarkdown(testCases);
          filename = `${baseFilename}-${timestamp}.md`;
          mimeType = "text/markdown";
          break;

        default:
          throw new Error("Unsupported export format");
      }

      downloadFile(content, filename, mimeType);
      toast.success(
        `Exported ${testCases.length} test cases as ${format.toUpperCase()}`
      );
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export test cases");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || exporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport("gherkin")}>
          <FileText className="h-4 w-4 mr-2" />
          Gherkin/BDD
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("cucumber")}>
          <FileCode className="h-4 w-4 mr-2" />
          Cucumber Feature
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("testrail")}>
          <FileCode className="h-4 w-4 mr-2" />
          TestRail XML
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("jira")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Jira CSV
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          JSON
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("markdown")}>
          <FileText className="h-4 w-4 mr-2" />
          Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
