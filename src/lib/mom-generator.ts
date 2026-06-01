export interface MOMResult {
  executiveSummary: string;
  keyDiscussionPoints: string[];
  decisions: { description: string; decidedBy: string }[];
  actionItems: { task: string; assignee: string; priority: string; dueDate: string | null }[];
  nextSteps: string[];
  nextMeetingDate: string | null;
  topics: { name: string; summary: string }[];
}

/**
 * Try Z-AI SDK first (works in the Z platform environment),
 * then fall back to OpenAI API (works on any laptop),
 * then fall back to template-based generation (no API key needed).
 */
export async function generateMOM(
  transcript: string,
  meetingTitle: string,
  participants: string[],
  hostName: string
): Promise<MOMResult | null> {
  // Strategy 1: Try Z-AI SDK (platform environment)
  try {
    const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default);
    const zai = await ZAI.create();
    const result = await generateMOMWithAI(
      (messages: any[]) => zai.chat.completions.create({ messages }),
      transcript,
      meetingTitle,
      participants,
      hostName
    );
    if (result) return result;
  } catch (e) {
    console.log('Z-AI SDK not available, trying OpenAI...');
  }

  // Strategy 2: Try OpenAI API (works on laptop with OPENAI_API_KEY)
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await generateMOMWithOpenAI(
        transcript,
        meetingTitle,
        participants,
        hostName
      );
      if (result) return result;
    } catch (e) {
      console.error('OpenAI API failed:', e);
    }
  }

  // Strategy 3: Template-based fallback (no API key needed)
  console.log('Using template-based MOM generation (no AI API available)');
  return generateMOMTemplate(transcript, meetingTitle, participants, hostName);
}

/**
 * Generic AI generation function
 */
async function generateMOMWithAI(
  chatFn: (messages: any[]) => Promise<any>,
  transcript: string,
  meetingTitle: string,
  participants: string[],
  hostName: string
): Promise<MOMResult | null> {
  const prompt = buildPrompt(transcript, meetingTitle, participants, hostName);

  const completion = await chatFn([
    {
      role: 'system',
      content:
        'You are a professional corporate meeting assistant that creates accurate, comprehensive Minutes of Meeting documents. You always respond with valid JSON only. You never include markdown code fences.',
    },
    { role: 'user', content: prompt },
  ]);

  const content = completion.choices[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed as MOMResult;
}

/**
 * OpenAI API call (works on your laptop with an API key)
 */
async function generateMOMWithOpenAI(
  transcript: string,
  meetingTitle: string,
  participants: string[],
  hostName: string
): Promise<MOMResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const prompt = buildPrompt(transcript, meetingTitle, participants, hostName);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional corporate meeting assistant that creates accurate, comprehensive Minutes of Meeting documents. You always respond with valid JSON only. You never include markdown code fences.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const completion = await response.json();
  const content = completion.choices[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed as MOMResult;
}

/**
 * Build the prompt for AI generation
 */
function buildPrompt(
  transcript: string,
  meetingTitle: string,
  participants: string[],
  hostName: string
): string {
  return `You are an expert corporate meeting assistant. Analyze the following meeting transcript and generate a comprehensive Minutes of Meeting (MOM) document.

MEETING DETAILS:
- Title: ${meetingTitle}
- Host: ${hostName}
- Participants: ${participants.join(', ')}

TRANSCRIPT:
${transcript}

Generate the MOM as a JSON object with this EXACT structure:
{
  "executiveSummary": "A concise 3-4 sentence summary of the meeting's purpose, key outcomes, and overall direction",
  "keyDiscussionPoints": ["point 1", "point 2", "point 3", ...],
  "decisions": [{"description": "what was decided", "decidedBy": "who decided it"}],
  "actionItems": [{"task": "specific actionable task", "assignee": "person responsible", "priority": "Critical|High|Medium|Low", "dueDate": "YYYY-MM-DD or null"}],
  "nextSteps": ["step 1", "step 2", ...],
  "nextMeetingDate": "YYYY-MM-DD or null",
  "topics": [{"name": "topic name", "summary": "brief summary of discussion on this topic"}]
}

IMPORTANT RULES:
- Each action item must be SPECIFIC and ACTIONABLE with a clear verb
- Priority must be exactly one of: Critical, High, Medium, Low
- If a due date is mentioned, include it in YYYY-MM-DD format; otherwise null
- Decisions should capture what was agreed upon, not just discussed
- The executive summary should be professional and suitable for stakeholders who didn't attend
- Include 4-8 key discussion points
- Include 2-6 action items if applicable
- Include 2-5 decisions if any were made

Return ONLY the JSON object, no markdown fences, no extra text.`;
}

/**
 * Template-based MOM generation (no AI needed — works offline)
 * Creates a reasonable MOM by parsing the transcript text.
 */
function generateMOMTemplate(
  transcript: string,
  meetingTitle: string,
  participants: string[],
  hostName: string
): MOMResult {
  // Split transcript into sentences for analysis
  const sentences = transcript
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  // Extract key discussion points from longer sentences
  const keyDiscussionPoints = sentences
    .filter((s) => s.length > 30)
    .slice(0, 6)
    .map((s) => s.endsWith('.') ? s : s + '.');

  // Generate action items from sentences with action verbs
  const actionVerbs = ['need', 'should', 'will', 'must', 'going to', 'plan to', 'let\'s', 'agree', 'assign', 'responsible', 'follow up', 'review', 'create', 'update', 'prepare', 'schedule', 'complete', 'send', 'share', 'check'];
  const actionSentences = sentences.filter((s) =>
    actionVerbs.some((v) => s.toLowerCase().includes(v))
  );

  const actionItems = actionSentences.length > 0
    ? actionSentences.slice(0, 5).map((s, i) => {
        // Try to find a participant name in the sentence
        const mentionedParticipant = participants.find((p) =>
          s.toLowerCase().includes(p.toLowerCase())
        );
        return {
          task: s.endsWith('.') ? s : s + '.',
          assignee: mentionedParticipant || participants[i % participants.length] || 'Team',
          priority: i === 0 ? 'High' : i < 2 ? 'Medium' : 'Low',
          dueDate: null as string | null,
        };
      })
    : [
        {
          task: 'Review meeting transcript and define action items',
          assignee: hostName || 'Team Lead',
          priority: 'High' as const,
          dueDate: null as string | null,
        },
      ];

  // Generate decisions from sentences with decision keywords
  const decisionVerbs = ['decided', 'agreed', 'confirmed', 'approved', 'concluded', 'consensus'];
  const decisionSentences = sentences.filter((s) =>
    decisionVerbs.some((v) => s.toLowerCase().includes(v))
  );

  const decisions = decisionSentences.length > 0
    ? decisionSentences.slice(0, 4).map((s) => {
        const decidedBy = participants.find((p) =>
          s.toLowerCase().includes(p.toLowerCase())
        ) || hostName || 'Group';
        return {
          description: s.endsWith('.') ? s : s + '.',
          decidedBy,
        };
      })
    : [];

  // Extract topics from the transcript
  const topicKeywords = extractTopics(sentences);
  const topics = topicKeywords.length > 0
    ? topicKeywords.map((t) => ({ name: t, summary: `Discussion about ${t.toLowerCase()} was held during the meeting.` }))
    : [{ name: meetingTitle, summary: 'Main topic discussed in the meeting.' }];

  // Build executive summary
  const executiveSummary = `A meeting titled "${meetingTitle}" was held${hostName ? ` and hosted by ${hostName}` : ''}${participants.length > 0 ? ` with ${participants.join(', ')} in attendance` : ''}. The discussion covered ${topics.map((t) => t.name.toLowerCase()).join(', ')}. Key outcomes include ${actionItems.length} action item(s) and ${decisions.length} decision(s) made during the session.`;

  // Generate next steps
  const nextSteps = [
    'Distribute meeting minutes to all participants',
    'Follow up on assigned action items within the specified timelines',
    'Schedule follow-up meeting to review progress on action items',
    'Update project documentation based on discussed changes',
  ];

  return {
    executiveSummary,
    keyDiscussionPoints: keyDiscussionPoints.length > 0
      ? keyDiscussionPoints
      : ['Meeting transcript was recorded and key points need to be reviewed.'],
    decisions,
    actionItems,
    nextSteps,
    nextMeetingDate: null,
    topics,
  };
}

/**
 * Simple topic extraction using keyword frequency
 */
function extractTopics(sentences: string[]): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'we', 'our', 'us', 'they', 'them',
    'their', 'i', 'you', 'he', 'she', 'me', 'my', 'your', 'his', 'her',
    'not', 'no', 'so', 'if', 'as', 'just', 'also', 'than', 'then', 'very',
    'about', 'up', 'out', 'all', 'what', 'when', 'how', 'which', 'who',
    'there', 'here', 'into', 'more', 'some', 'any', 'each', 'every',
    'need', 'going', 'think', 'know', 'want', 'really', 'thing', 'things',
    'like', 'get', 'got', 'make', 'made', 'well', 'much', 'still', 'even',
  ]);

  const wordFreq: Record<string, number> = {};
  for (const sentence of sentences) {
    const words = sentence.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
      }
    }
  }

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}