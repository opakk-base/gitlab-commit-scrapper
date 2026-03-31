import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import { LLMSummary } from "./llm";

// Strip markdown formatting for plain text
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, "").trim())
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s*/gm, "• ")
    .replace(/^\d+\.\s*/gm, "")
    .trim();
}

// Export summary as plain text/CSV
export function exportSummaryAsText(summary: LLMSummary, filename: string = "commit-summary") {
  const date = new Date(summary.generatedAt).toLocaleString();

  let content = `GitLab Commit Summary
Generated: ${date}
Model: ${summary.modelUsed}
Total Commits Analyzed: ${summary.totalCommits}

${"=".repeat(60)}

${stripMarkdown(summary.summary)}

${"=".repeat(60)}

Analysis Info:
- Total Commits: ${summary.totalCommits}
- Model Used: ${summary.modelUsed}
- Generated At: ${date}
`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

// Export summary as CSV
export function exportSummaryAsCSV(summary: LLMSummary, filename: string = "commit-summary") {
  const date = new Date(summary.generatedAt).toLocaleString();

  // Create CSV with summary info
  const rows = [
    ["GitLab Commit Summary"],
    ["Generated", date],
    ["Model", summary.modelUsed],
    ["Total Commits", String(summary.totalCommits)],
    [],
    ["Summary"],
    [stripMarkdown(summary.summary)],
  ];

  const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Export summary as PDF (using jsPDF directly without html2canvas)
export async function exportSummaryAsPDF(
  summary: LLMSummary,
  filename: string = "commit-summary"
): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;
  let currentY = 20;

  // Helper to add a new page if needed
  const checkNewPage = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Header
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("GitLab Commit Summary", margin, currentY);
  currentY += 10;

  // Meta info
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated: ${new Date(summary.generatedAt).toLocaleString()}`, margin, currentY);
  currentY += 5;
  pdf.text(`Model: ${summary.modelUsed}  |  Total Commits: ${summary.totalCommits}`, margin, currentY);
  currentY += 8;

  // Line separator
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Parse and render markdown content
  const lines = summary.summary.split("\n");

  for (const line of lines) {
    if (!line.trim()) {
      currentY += 3;
      continue;
    }

    // Check for headers
    if (line.startsWith("#### ")) {
      checkNewPage(10);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      const text = stripMarkdown(line);
      pdf.text(text, margin, currentY);
      currentY += 7;
    } else if (line.startsWith("### ")) {
      checkNewPage(12);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      const text = stripMarkdown(line);
      pdf.text(text, margin, currentY);
      currentY += 8;
    } else if (line.startsWith("## ")) {
      checkNewPage(14);
      currentY += 3;
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      const text = stripMarkdown(line);
      pdf.text(text, margin, currentY);
      currentY += 9;
    } else if (line.startsWith("# ")) {
      checkNewPage(16);
      currentY += 4;
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      const text = stripMarkdown(line);
      pdf.text(text, margin, currentY);
      currentY += 10;
    } else if (line.startsWith("---")) {
      checkNewPage(5);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;
    } else if (line.startsWith("|")) {
      // Table row - simplified handling
      checkNewPage(8);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      const text = stripMarkdown(line.replace(/\|/g, " | ").trim());
      const splitText = pdf.splitTextToSize(text, maxWidth);
      pdf.text(splitText, margin, currentY);
      currentY += splitText.length * 4 + 2;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      // Bullet point
      checkNewPage(6);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const text = "  • " + stripMarkdown(line.substring(2));
      const splitText = pdf.splitTextToSize(text, maxWidth - 5);
      pdf.text(splitText, margin + 3, currentY);
      currentY += splitText.length * 5 + 1;
    } else if (/^\d+\.\s/.test(line)) {
      // Numbered list
      checkNewPage(6);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const text = "  " + stripMarkdown(line);
      const splitText = pdf.splitTextToSize(text, maxWidth - 5);
      pdf.text(splitText, margin + 3, currentY);
      currentY += splitText.length * 5 + 1;
    } else if (line.startsWith("```")) {
      // Code block marker - skip
      currentY += 2;
    } else {
      // Regular paragraph
      checkNewPage(6);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // Handle inline code and bold
      let processedLine = line;
      const hasInlineCode = /`[^`]+`/.test(processedLine);
      const hasBold = /\*\*[^*]+\*\*/.test(processedLine);

      if (hasInlineCode || hasBold) {
        // For lines with formatting, strip and show as plain text
        processedLine = stripMarkdown(processedLine);
      }

      const splitText = pdf.splitTextToSize(processedLine, maxWidth);

      // Check if we need more space for multi-line text
      if (splitText.length > 1) {
        checkNewPage(splitText.length * 5 + 2);
      }

      pdf.text(splitText, margin, currentY);
      currentY += splitText.length * 5 + 2;
    }
  }

  // Footer on each page
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Generated by GitLab Commit Scraper | Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 10
    );
  }

  pdf.save(`${filename}.pdf`);
}

// Parse markdown to docx paragraphs
function parseMarkdownToDocx(text: string): Paragraph[] {
  const lines = text.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // Headers
    if (line.startsWith("#### ")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace("#### ", ""),
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace("### ", ""),
              bold: true,
              size: 26,
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace("## ", ""),
              bold: true,
              size: 28,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 140 },
        })
      );
    } else if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace("# ", ""),
              bold: true,
              size: 32,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 320, after: 160 },
        })
      );
    } else if (line.startsWith("---")) {
      paragraphs.push(
        new Paragraph({
          border: {
            bottom: {
              color: "auto",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "• " + line.replace(/^[-*]\s*/, ""),
            }),
          ],
          indent: { left: convertInchesToTwip(0.5) },
          spacing: { before: 60, after: 60 },
        })
      );
    } else {
      // Regular text with inline formatting
      const textRuns: TextRun[] = [];
      let remaining = line;

      // Simple parsing for bold and code
      const parts = remaining.split(/(\*\*[^*]+\*\*|`[^`]+`)/);

      for (const part of parts) {
        if (part.startsWith("**") && part.endsWith("**")) {
          textRuns.push(
            new TextRun({
              text: part.slice(2, -2),
              bold: true,
            })
          );
        } else if (part.startsWith("`") && part.endsWith("`")) {
          textRuns.push(
            new TextRun({
              text: part.slice(1, -1),
              font: "Courier New",
              size: 20,
            })
          );
        } else if (part) {
          textRuns.push(new TextRun({ text: part }));
        }
      }

      paragraphs.push(
        new Paragraph({
          children: textRuns.length > 0 ? textRuns : [new TextRun("")],
          spacing: { before: 60, after: 60 },
        })
      );
    }
  }

  return paragraphs;
}

// Export summary as DOCX
export async function exportSummaryAsDOCX(
  summary: LLMSummary,
  filename: string = "commit-summary"
): Promise<void> {
  const date = new Date(summary.generatedAt).toLocaleString();

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "GitLab Commit Summary",
                bold: true,
                size: 36,
              }),
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Meta info table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Generated:", bold: true })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: date })] })],
                    width: { size: 70, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Model:", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: summary.modelUsed })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Total Commits:", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: String(summary.totalCommits) })] })],
                  }),
                ],
              }),
            ],
          }),

          // Spacing
          new Paragraph({ text: "" }),
          new Paragraph({
            border: {
              bottom: {
                color: "auto",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            },
          }),
          new Paragraph({ text: "" }),

          // Summary content
          ...parseMarkdownToDocx(summary.summary),

          // Footer
          new Paragraph({ text: "" }),
          new Paragraph({
            border: {
              bottom: {
                color: "auto",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            },
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Generated by GitLab Commit Scraper",
                italics: true,
                size: 18,
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}