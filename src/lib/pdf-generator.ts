import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MOMPDFData {
  title: string;
  date: string;
  duration: string;
  hostName: string;
  participants: { name: string; role?: string }[];
  executiveSummary: string;
  keyDiscussionPoints: string[];
  decisions: { description: string; decidedBy?: string }[];
  actionItems: { task: string; assignee?: string; priority: string; dueDate?: string; status: string }[];
  nextSteps: string[];
  nextMeetingDate?: string | null;
  topics: { name: string; summary?: string }[];
}

const PRIORITY_COLORS: Record<string, [number, number, number]> = {
  Critical: [220, 38, 38],
  High: [234, 88, 12],
  Medium: [202, 138, 4],
  Low: [22, 163, 74],
};

export function generateMOMPDF(data: MOMPDFData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ── Helper functions ──
  function checkPageBreak(needed: number): boolean {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  }

  function addSectionHeader(text: string): void {
    checkPageBreak(20);
    y += 5;
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text(text, margin, y);
    y += 6;
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
  }

  function addWrappedText(text: string, indent: number = 0): void {
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    for (const line of lines) {
      checkPageBreak(5);
      doc.text(line, margin + indent, y);
      y += 5;
    }
  }

  function addBullet(text: string, bullet: string = '\u2022'): void {
    checkPageBreak(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(bullet, margin + 4, y);
    const lines = doc.splitTextToSize(text, contentWidth - 14);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        checkPageBreak(5);
      }
      doc.text(lines[i], margin + 10, y);
      y += 5;
    }
  }

  // ══════════════════════════════════════
  // PAGE 1: HEADER BAR (full-width green)
  // ══════════════════════════════════════
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pageWidth, 44, 'F');

  // "MINUTES OF MEETING" title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('MINUTES OF MEETING', margin, 16);

  // Subtitle line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(209, 250, 229);
  doc.text('AI-Powered Meeting Assistant  |  Auto-Generated Document', margin, 24);

  // Meeting title on its own line below subtitle (prevents overlap)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(data.title, contentWidth);
  for (let i = 0; i < Math.min(titleLines.length, 2); i++) {
    doc.text(titleLines[i], margin, 33 + i * 5);
  }

  y = 52;

  // ══════════════════════════════════════
  // MEETING INFO BOX
  // ══════════════════════════════════════
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);

  const col1 = margin + 5;
  const col2 = pageWidth / 2 + 5;
  const row1 = y + 7;
  const row2 = y + 17;

  // Row 1
  doc.text('DATE', col1, row1);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text(data.date, col1, row1 + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.setFontSize(8);
  doc.text('HOST', col2, row1);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text(data.hostName || 'N/A', col2, row1 + 5);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.setFontSize(8);
  doc.text('DURATION', col1, row2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text(data.duration, col1, row2 + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.setFontSize(8);
  doc.text('ATTENDEES', col2, row2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  const attendeeStr = data.participants.map((p) => p.name).join(', ');
  const attLines = doc.splitTextToSize(attendeeStr || 'N/A', contentWidth / 2 - 10);
  doc.text(attLines[0] || 'N/A', col2, row2 + 5);

  y += 32;

  // ══════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ══════════════════════════════════════
  if (data.executiveSummary) {
    addSectionHeader('EXECUTIVE SUMMARY');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    addWrappedText(data.executiveSummary);
    doc.setFont('helvetica', 'normal');
    y += 2;
  }

  // ══════════════════════════════════════
  // KEY DISCUSSION POINTS
  // ══════════════════════════════════════
  if (data.keyDiscussionPoints && data.keyDiscussionPoints.length > 0) {
    addSectionHeader('KEY DISCUSSION POINTS');
    for (const point of data.keyDiscussionPoints) {
      addBullet(point);
    }
    y += 2;
  }

  // ══════════════════════════════════════
  // DECISIONS MADE
  // ══════════════════════════════════════
  if (data.decisions && data.decisions.length > 0) {
    addSectionHeader('DECISIONS MADE');
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Decision', 'Decided By']],
      body: data.decisions.map((d) => [d.description, d.decidedBy || 'Group']),
      theme: 'plain',
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [40, 40, 40],
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244],
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.65 },
        1: { cellWidth: contentWidth * 0.35 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ══════════════════════════════════════
  // ACTION ITEMS
  // ══════════════════════════════════════
  if (data.actionItems && data.actionItems.length > 0) {
    addSectionHeader('ACTION ITEMS');
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Task', 'Assignee', 'Priority', 'Due Date', 'Status']],
      body: data.actionItems.map((a) => [
        a.task,
        a.assignee || 'TBD',
        a.priority,
        a.dueDate || 'TBD',
        a.status,
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 40, 40],
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244],
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.33 },
        1: { cellWidth: contentWidth * 0.2 },
        2: { cellWidth: contentWidth * 0.15 },
        3: { cellWidth: contentWidth * 0.17 },
        4: { cellWidth: contentWidth * 0.15 },
      },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 2) {
          const val = hookData.cell.raw as string;
          if (PRIORITY_COLORS[val]) {
            hookData.cell.styles.textColor = PRIORITY_COLORS[val];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ══════════════════════════════════════
  // TOPICS DISCUSSED
  // ══════════════════════════════════════
  if (data.topics && data.topics.length > 0) {
    addSectionHeader('TOPICS DISCUSSED');
    for (const topic of data.topics) {
      checkPageBreak(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(5, 150, 105);
      doc.text(`> ${topic.name}`, margin + 2, y);
      y += 5;
      if (topic.summary) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        doc.setFontSize(9);
        addWrappedText(topic.summary, 8);
      }
      y += 3;
    }
  }

  // ══════════════════════════════════════
  // NEXT STEPS
  // ══════════════════════════════════════
  if (data.nextSteps && data.nextSteps.length > 0) {
    addSectionHeader('NEXT STEPS');
    for (let i = 0; i < data.nextSteps.length; i++) {
      addBullet(data.nextSteps[i], `${i + 1}.`);
    }
    y += 2;
  }

  // ══════════════════════════════════════
  // NEXT MEETING
  // ══════════════════════════════════════
  if (data.nextMeetingDate) {
    addSectionHeader('NEXT MEETING');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`Scheduled for: ${data.nextMeetingDate}`, margin + 4, y);
    y += 8;
  }

  // ══════════════════════════════════════
  // FOOTER on every page (drawn LAST)
  // ══════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Green footer bar
    doc.setFillColor(5, 150, 105);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Generated by MeetAI  |  AI-Powered Meeting Assistant  |  Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 4
    );
    doc.text('Confidential', pageWidth - margin, pageHeight - 4, { align: 'right' });
  }

  return doc;
}
