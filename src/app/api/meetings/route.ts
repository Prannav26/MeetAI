import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const meetings = await db.meeting.findMany({
      include: {
        participants: true,
        actionItems: true,
        decisions: true,
        topics: true,
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, hostName, participantNames, meetingLink } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const participantList = (participantNames || '')
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0);

    const meeting = await db.meeting.create({
      data: {
        title,
        hostName: hostName || '',
        meetingLink: meetingLink || null,
        status: 'recording',
        participants: {
          create: participantList.map((name: string) => ({ name })),
        },
      },
      include: {
        participants: true,
        actionItems: true,
        decisions: true,
        topics: true,
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
