import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meeting = await db.meeting.findUnique({
      where: { id },
      include: { participants: true, actionItems: true, decisions: true, topics: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (!meeting.momContent) {
      return NextResponse.json({ error: 'MOM not generated yet' }, { status: 400 });
    }

    const momData = JSON.parse(meeting.momContent);

    const totalMins = Math.floor(meeting.duration / 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    const pdfData = {
      title: meeting.title,
      date: new Date(meeting.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      duration: durationStr,
      hostName: meeting.hostName || 'N/A',
      participants: meeting.participants.map((p) => ({
        name: p.name,
        role: p.role || undefined,
      })),
      executiveSummary: momData.executiveSummary || '',
      keyDiscussionPoints: momData.keyDiscussionPoints || [],
      decisions: momData.decisions || [],
      actionItems: meeting.actionItems.map((a) => ({
        task: a.task,
        assignee: a.assignee || undefined,
        priority: a.priority,
        dueDate: a.dueDate || undefined,
        status: a.status,
      })),
      nextSteps: momData.nextSteps || [],
      nextMeetingDate: momData.nextMeetingDate || null,
      topics: meeting.topics.map((t) => ({
        name: t.name,
        summary: t.summary || undefined,
      })),
    };

    const { generateMOMPDF } = await import('@/lib/pdf-generator');
    const doc = generateMOMPDF(pdfData);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const safeTitle = meeting.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MOM_${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
