import { db } from '@/lib/db';
import { generateMOM } from '@/lib/mom-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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

    if (!meeting.transcript || meeting.transcript.trim().length < 10) {
      return NextResponse.json(
        { error: 'No sufficient transcript available. The meeting must be at least a few seconds long with speech detected.' },
        { status: 400 }
      );
    }

    const participantNames = meeting.participants.map((p) => p.name);
    const momResult = await generateMOM(
      meeting.transcript,
      meeting.title,
      participantNames,
      meeting.hostName
    );

    if (!momResult) {
      return NextResponse.json({ error: 'AI failed to generate MOM. Please try again.' }, { status: 500 });
    }

    // Clear existing sub-records
    await db.actionItem.deleteMany({ where: { meetingId: id } });
    await db.decision.deleteMany({ where: { meetingId: id } });
    await db.topic.deleteMany({ where: { meetingId: id } });

    // Update meeting with MOM data
    const updatedMeeting = await db.meeting.update({
      where: { id },
      data: {
        status: 'completed',
        executiveSummary: momResult.executiveSummary,
        nextMeetingDate: momResult.nextMeetingDate,
        momContent: JSON.stringify(momResult),
        actionItems: {
          create: momResult.actionItems.map((a) => ({
            task: a.task,
            assignee: a.assignee || null,
            priority: a.priority || 'Medium',
            dueDate: a.dueDate || null,
            status: 'Pending',
          })),
        },
        decisions: {
          create: momResult.decisions.map((d) => ({
            description: d.description,
            decidedBy: d.decidedBy || null,
          })),
        },
        topics: {
          create: momResult.topics.map((t) => ({
            name: t.name,
            summary: t.summary || null,
          })),
        },
      },
      include: {
        participants: true,
        actionItems: true,
        decisions: true,
        topics: true,
      },
    });

    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error('Error generating MOM:', error);
    return NextResponse.json({ error: 'Failed to generate MOM' }, { status: 500 });
  }
}
