'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMeetingStore } from '@/store/meeting-store';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Mic,
  MicOff,
  FileText,
  Download,
  Clock,
  Users,
  Sparkles,
  Trash2,
  ArrowLeft,
  History,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Plus,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/* ──────────── Types ──────────── */
interface MeetingRecord {
  id: string;
  title: string;
  date: string;
  duration: number;
  status: string;
  transcript: string;
  momContent: string | null;
  hostName: string;
  executiveSummary: string | null;
  participants: { id: string; name: string; role?: string | null }[];
  actionItems: { id: string; task: string; assignee?: string | null; priority: string; dueDate?: string | null; status: string }[];
  decisions: { id: string; description: string; decidedBy?: string | null }[];
  topics: { id: string; name: string; summary?: string | null }[];
}

/* ──────────── Helpers ──────────── */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const priorityStyles: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Low: 'bg-green-50 text-green-700 border-green-200',
};

/* ══════════════ MAIN PAGE ══════════════ */
export default function HomePage() {
  const store = useMeetingStore();
  const {
    isRecording,
    meetingTitle,
    hostName,
    participantNames,
    duration,
    currentMeetingId,
    momGenerated,
    generatingMOM,
    activeView,
    showHistory,
    setIsRecording,
    setMeetingTitle,
    setHostName,
    setParticipantNames,
    setDuration,
    incrementDuration,
    setCurrentMeetingId,
    setMomGenerated,
    setGeneratingMOM,
    setActiveView,
    setShowHistory,
    resetMeeting,
  } = store;

  const {
    isListening,
    transcript,
    interimTranscript,
    segments,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError,
  } = useSpeechRecognition();

  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRecord | null>(null);
  const [momData, setMomData] = useState<any>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch meetings ──
  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch('/api/meetings');
      if (res.ok) setMeetings(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // ── Timer ──
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => incrementDuration(), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, incrementDuration]);

  // ── Start recording ──
  const handleStartRecording = async () => {
    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingTitle,
          hostName: hostName,
          participantNames: participantNames,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const meeting = await res.json();
      setCurrentMeetingId(meeting.id);
      setDuration(0);
      resetTranscript();
      startListening();
      setIsRecording(true);
      setActiveView('recording');
      toast.success('Recording started!');
    } catch {
      toast.error('Failed to start meeting');
    }
  };

  // ── Stop recording ──
  const handleStopRecording = async () => {
    stopListening();
    setIsRecording(false);

    if (!currentMeetingId) return;

    try {
      await fetch(`/api/meetings/${currentMeetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          duration: duration,
          transcript: transcript || 'No speech detected during the meeting.',
        }),
      });
      setActiveView('complete');
      toast.success('Recording stopped!');
      fetchMeetings();
    } catch {
      toast.error('Failed to save meeting');
    }
  };

  // ── Generate MOM ──
  const handleGenerateMOM = async (meetingId?: string) => {
    const id = meetingId || currentMeetingId;
    if (!id) return;

    setGeneratingMOM(true);
    // Close history view so MOM view can render after generation
    setShowHistory(false);
    try {
      const res = await fetch(`/api/meetings/${id}/generate-mom`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      const updated = await res.json();
      const mom = JSON.parse(updated.momContent);
      setMomData(mom);
      // Set selectedMeeting so MOM view shows full data (attendees, action items, etc.)
      setSelectedMeeting(updated as MeetingRecord);
      setMomGenerated(true);
      setActiveView('mom');
      toast.success('MOM generated successfully!');
      fetchMeetings();
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate MOM');
    } finally {
      setGeneratingMOM(false);
    }
  };

  // ── Download PDF ──
  const handleDownloadPDF = async (meetingId?: string) => {
    const id = meetingId || currentMeetingId;
    if (!id) return;

    setPdfDownloading(true);
    try {
      const res = await fetch(`/api/meetings/${id}/pdf`);
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MOM_${(meetingTitle || 'Meeting').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfDownloading(false);
    }
  };

  // ── Delete meeting ──
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      toast.success('Meeting deleted');
      fetchMeetings();
      if (selectedMeeting?.id === id) setSelectedMeeting(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ── View MOM for a past meeting ──
  const handleViewMOM = async (meeting: MeetingRecord) => {
    setSelectedMeeting(meeting);
    setCurrentMeetingId(meeting.id);
    setMeetingTitle(meeting.title);
    // Must close history view so MOM view can render
    setShowHistory(false);
    if (meeting.momContent) {
      setMomData(JSON.parse(meeting.momContent));
      setMomGenerated(true);
      setActiveView('mom');
    } else {
      // If MOM not yet generated, generate it
      await handleGenerateMOM(meeting.id);
    }
  };

  // ── New meeting ──
  const handleNewMeeting = () => {
    resetMeeting();
    resetTranscript();
    setMomData(null);
    setSelectedMeeting(null);
    setActiveView('setup');
  };

  /* ══════════════════════════════════════
     RENDER
     ══════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-emerald-100 dark:border-emerald-900/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">MeetAI</h1>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Meeting Assistant Extension</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => {
                setShowHistory(!showHistory);
                setActiveView('setup');
              }}
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
              {meetings.length > 0 && (
                <Badge className="ml-1 h-4 px-1 text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {meetings.length}
                </Badge>
              )}
            </Button>
            {activeView !== 'setup' && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleNewMeeting}>
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ─────── HISTORY VIEW ─────── */}
          {showHistory && activeView !== 'mom' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <HistoryView
                meetings={meetings}
                onViewMOM={handleViewMOM}
                onGenerateMOM={(id) => handleGenerateMOM(id)}
                onDelete={handleDelete}
                generatingMOM={generatingMOM}
                onBack={() => setShowHistory(false)}
              />
            </motion.div>
          )}

          {/* ─────── SETUP VIEW ─────── */}
          {!showHistory && activeView === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <SetupView
                meetingTitle={meetingTitle}
                hostName={hostName}
                participantNames={participantNames}
                isSupported={isSupported}
                speechError={speechError}
                onTitleChange={setMeetingTitle}
                onHostChange={setHostName}
                onParticipantsChange={setParticipantNames}
                onStart={handleStartRecording}
              />
            </motion.div>
          )}

          {/* ─────── RECORDING VIEW ─────── */}
          {!showHistory && activeView === 'recording' && (
            <motion.div key="recording" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <RecordingView
                meetingTitle={meetingTitle}
                duration={duration}
                isListening={isListening}
                transcript={transcript}
                interimTranscript={interimTranscript}
                segments={segments}
                speechError={speechError}
                onStop={handleStopRecording}
              />
            </motion.div>
          )}

          {/* ─────── COMPLETE VIEW ─────── */}
          {!showHistory && activeView === 'complete' && (
            <motion.div key="complete" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <CompleteView
                meetingTitle={meetingTitle}
                duration={duration}
                transcript={transcript}
                generatingMOM={generatingMOM}
                onGenerateMOM={() => handleGenerateMOM()}
                onNewMeeting={handleNewMeeting}
              />
            </motion.div>
          )}

          {/* ─────── MOM VIEW ─────── */}
          {!showHistory && activeView === 'mom' && momData && (
            <motion.div key="mom" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <MOMView
                meetingTitle={meetingTitle}
                momData={momData}
                meeting={selectedMeeting}
                pdfDownloading={pdfDownloading}
                onDownloadPDF={() => handleDownloadPDF()}
                onBack={handleNewMeeting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════
   SETUP VIEW
   ══════════════════════════════════════ */
function SetupView({
  meetingTitle,
  hostName,
  participantNames,
  isSupported,
  speechError,
  onTitleChange,
  onHostChange,
  onParticipantsChange,
  onStart,
}: {
  meetingTitle: string;
  hostName: string;
  participantNames: string;
  isSupported: boolean;
  speechError: string | null;
  onTitleChange: (v: string) => void;
  onHostChange: (v: string) => void;
  onParticipantsChange: (v: string) => void;
  onStart: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center space-y-2 pt-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
          <Mic className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Start Meeting Recording</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set up your meeting details and begin real-time audio capture with speech recognition
        </p>
      </div>

      {/* Browser support warning */}
      {!isSupported && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Browser Not Supported</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Speech Recognition requires Chrome or Edge. Please switch browsers for live transcription.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Meeting Title *
            </label>
            <Input
              placeholder="e.g., Sprint Planning - Week 24"
              value={meetingTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Your Name (Host)
            </label>
            <Input
              placeholder="e.g., John Smith"
              value={hostName}
              onChange={(e) => onHostChange(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Participants
              <span className="font-normal text-gray-400 ml-1">(comma-separated)</span>
            </label>
            <Input
              placeholder="e.g., Alice, Bob, Charlie"
              value={participantNames}
              onChange={(e) => onParticipantsChange(e.target.value)}
              className="h-11"
            />
          </div>

          <Separator className="my-1" />

          {/* How it works */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3.5 space-y-2">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">How it works:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">1</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Record & transcribe live</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">2</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">AI generates MOM</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">3</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Download PDF report</p>
              </div>
            </div>
          </div>

          <Button
            onClick={onStart}
            disabled={!meetingTitle.trim() || !isSupported}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 gap-2"
          >
            <Radio className="h-5 w-5" />
            Start Recording
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════
   RECORDING VIEW
   ══════════════════════════════════════ */
function RecordingView({
  meetingTitle,
  duration,
  isListening,
  transcript,
  interimTranscript,
  segments,
  speechError,
  onStop,
}: {
  meetingTitle: string;
  duration: number;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  segments: { text: string; timestamp: number; isFinal: boolean }[];
  speechError: string | null;
  onStop: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Recording header */}
      <div className="text-center space-y-3">
        <div className="relative inline-block">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-200 dark:shadow-emerald-900/30">
            <Mic className="h-10 w-10 text-white" />
          </div>
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-30" />
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{meetingTitle}</h2>
          <div className="flex items-center justify-center gap-3 mt-2">
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </Badge>
            <span className="text-2xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {speechError && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">{speechError}</p>
          </CardContent>
        </Card>
      )}

      {/* Audio visualizer */}
      <Card className="border-emerald-200 dark:border-emerald-800 overflow-hidden">
        <CardContent className="p-3">
          <div className="h-16 flex items-center justify-center gap-[2px]">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-emerald-500 to-teal-400"
                animate={
                  isListening
                    ? { height: [4, Math.random() * 56 + 8, 4] }
                    : { height: 4 }
                }
                transition={
                  isListening
                    ? { duration: 0.4 + Math.random() * 0.4, repeat: Infinity, repeatType: 'reverse', delay: i * 0.02 }
                    : { duration: 0.3 }
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live transcript */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            LIVE TRANSCRIPT
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div ref={scrollRef} className="h-64 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
            {segments.length === 0 && !interimTranscript ? (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <Mic className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Listening for speech...</p>
                  <p className="text-xs mt-1">Start speaking to see the transcript</p>
                </div>
              </div>
            ) : (
              <>
                {segments.map((seg, i) => (
                  <div key={i} className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {seg.text}
                  </div>
                ))}
                {interimTranscript && (
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 italic opacity-80">
                    {interimTranscript}
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            {transcript.split(/\s+/).filter(Boolean).length} words captured
          </p>
        </CardContent>
      </Card>

      {/* Stop button */}
      <Button
        onClick={onStop}
        variant="destructive"
        className="w-full h-12 text-base font-semibold gap-2"
      >
        <MicOff className="h-5 w-5" />
        Stop Recording
      </Button>
    </div>
  );
}

/* ══════════════════════════════════════
   COMPLETE VIEW
   ══════════════════════════════════════ */
function CompleteView({
  meetingTitle,
  duration,
  transcript,
  generatingMOM,
  onGenerateMOM,
  onNewMeeting,
}: {
  meetingTitle: string;
  duration: number;
  transcript: string;
  generatingMOM: boolean;
  onGenerateMOM: () => void;
  onNewMeeting: () => void;
}) {
  const totalMins = Math.floor(duration / 60);
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-3 pt-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting Recorded!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your meeting has been captured. Generate the MOM now.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">{totalMins}m</p>
            <p className="text-[10px] text-gray-500">Duration</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3 text-center">
            <FileText className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">{wordCount}</p>
            <p className="text-[10px] text-gray-500">Words</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3 text-center">
            <Sparkles className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">AI</p>
            <p className="text-[10px] text-gray-500">Ready</p>
          </CardContent>
        </Card>
      </div>

      {/* Transcript preview */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold text-gray-600 dark:text-gray-400">TRANSCRIPT PREVIEW</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-4">
            {transcript || 'No transcript captured.'}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={onGenerateMOM}
          disabled={generatingMOM}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg gap-2"
        >
          {generatingMOM ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating MOM with AI...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate MOM
            </>
          )}
        </Button>
        <Button variant="outline" className="w-full gap-2" onClick={onNewMeeting}>
          Record Another Meeting
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MOM VIEW
   ══════════════════════════════════════ */
function MOMView({
  meetingTitle,
  momData,
  meeting,
  pdfDownloading,
  onDownloadPDF,
  onBack,
}: {
  meetingTitle: string;
  momData: any;
  meeting: MeetingRecord | null;
  pdfDownloading: boolean;
  onDownloadPDF: () => void;
  onBack: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-xs gap-1" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{meetingTitle}</h2>
          {meeting && (
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatDate(meeting.date)}</span>
              <span>{Math.floor(meeting.duration / 60)}m duration</span>
              <span>{meeting.participants.length} participants</span>
            </div>
          )}
        </div>
        <Button
          onClick={onDownloadPDF}
          disabled={pdfDownloading}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-2 shrink-0"
        >
          {pdfDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download PDF
        </Button>
      </div>

      <Separator />

      {/* Attendees */}
      {meeting && meeting.participants.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> ATTENDEES
            </p>
            <div className="flex flex-wrap gap-2">
              {meeting.participants.map((p) => (
                <Badge key={p.id} variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                  {p.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary */}
      {momData.executiveSummary && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wide">
              Executive Summary
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed italic">
              {momData.executiveSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Discussion Points */}
      {momData.keyDiscussionPoints?.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Key Discussion Points
            </p>
            {momData.keyDiscussionPoints.map((point: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">{point}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Decisions */}
      {momData.decisions?.length > 0 && (
        <Card className="border-teal-200 dark:border-teal-800">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide">
              Decisions Made
            </p>
            {momData.decisions.map((d: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-teal-50/50 dark:bg-teal-950/20">
                <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.description}</p>
                  {d.decidedBy && (
                    <p className="text-xs text-gray-500 mt-0.5">Decided by: {d.decidedBy}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {meeting && meeting.actionItems.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-3">
              Action Items
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                    <th className="text-left p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Task</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Assignee</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Priority</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {meeting.actionItems.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="p-2.5 text-gray-800 dark:text-gray-200">{item.task}</td>
                      <td className="p-2.5 text-gray-500 dark:text-gray-400">{item.assignee || '--'}</td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${priorityStyles[item.priority] || priorityStyles.Medium}`}
                        >
                          {item.priority}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-gray-500 dark:text-gray-400 text-xs">{item.dueDate || 'TBD'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topics */}
      {momData.topics?.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">
              Topics Discussed
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {momData.topics.map((t: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.name}</p>
                  {t.summary && <p className="text-xs text-gray-500 mt-1">{t.summary}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {momData.nextSteps?.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Next Steps
            </p>
            {momData.nextSteps.map((step: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{i + 1}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Meeting */}
      {momData.nextMeetingDate && (
        <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-teal-600" />
            <div>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">NEXT MEETING</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{momData.nextMeetingDate}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download PDF CTA */}
      <Card className="border-emerald-300 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardContent className="p-5 text-center space-y-3">
          <Download className="h-8 w-8 text-emerald-600 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Download as PDF</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get a professionally formatted MOM document ready to share
            </p>
          </div>
          <Button
            onClick={onDownloadPDF}
            disabled={pdfDownloading}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-2"
          >
            {pdfDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {pdfDownloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════
   HISTORY VIEW
   ══════════════════════════════════════ */
function HistoryView({
  meetings,
  onViewMOM,
  onGenerateMOM,
  onDelete,
  generatingMOM,
  onBack,
}: {
  meetings: MeetingRecord[];
  onViewMOM: (m: MeetingRecord) => void;
  onGenerateMOM: (id: string) => void;
  onDelete: (id: string) => void;
  generatingMOM: boolean;
  onBack: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Meeting History</h2>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
          {meetings.length} meetings
        </Badge>
      </div>

      {meetings.length === 0 ? (
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-8 text-center">
            <History className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No meetings recorded yet.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start your first meeting recording above!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <Card key={m.id} className="border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.title}</h3>
                      <Badge
                        className={`text-[10px] shrink-0 ${
                          m.status === 'recording'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}
                      >
                        {m.status === 'recording' ? 'Recording' : 'Completed'}
                      </Badge>
                      {m.momContent && (
                        <Badge className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 shrink-0">
                          MOM
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(m.date)}</span>
                      <span>{Math.floor(m.duration / 60)}m</span>
                      <span>{m.participants.length} participants</span>
                    </div>
                    {m.executiveSummary && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{m.executiveSummary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.momContent ? (
                      <Button variant="ghost" size="sm" className="text-xs gap-1 text-emerald-600" onClick={() => onViewMOM(m)}>
                        <FileText className="h-3.5 w-3.5" /> View MOM
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 text-teal-600"
                        disabled={generatingMOM}
                        onClick={() => onGenerateMOM(m.id)}
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Generate MOM
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600" onClick={() => onDelete(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
