import { create } from 'zustand';

interface MeetingStore {
  // Meeting recording state
  isRecording: boolean;
  meetingTitle: string;
  hostName: string;
  participantNames: string;
  duration: number;

  // MOM state
  currentMeetingId: string | null;
  momGenerated: boolean;
  generatingMOM: boolean;

  // UI state
  activeView: 'setup' | 'recording' | 'complete' | 'mom';
  showHistory: boolean;

  // Actions
  setIsRecording: (v: boolean) => void;
  setMeetingTitle: (v: string) => void;
  setHostName: (v: string) => void;
  setParticipantNames: (v: string) => void;
  setDuration: (v: number) => void;
  incrementDuration: () => void;
  setCurrentMeetingId: (v: string | null) => void;
  setMomGenerated: (v: boolean) => void;
  setGeneratingMOM: (v: boolean) => void;
  setActiveView: (v: 'setup' | 'recording' | 'complete' | 'mom') => void;
  setShowHistory: (v: boolean) => void;
  resetMeeting: () => void;
}

const initialState = {
  isRecording: false,
  meetingTitle: '',
  hostName: '',
  participantNames: '',
  duration: 0,
  currentMeetingId: null,
  momGenerated: false,
  generatingMOM: false,
  activeView: 'setup' as const,
  showHistory: false,
};

export const useMeetingStore = create<MeetingStore>((set) => ({
  ...initialState,
  setIsRecording: (v) => set({ isRecording: v }),
  setMeetingTitle: (v) => set({ meetingTitle: v }),
  setHostName: (v) => set({ hostName: v }),
  setParticipantNames: (v) => set({ participantNames: v }),
  setDuration: (v) => set({ duration: v }),
  incrementDuration: () => set((state) => ({ duration: state.duration + 1 })),
  setCurrentMeetingId: (v) => set({ currentMeetingId: v }),
  setMomGenerated: (v) => set({ momGenerated: v }),
  setGeneratingMOM: (v) => set({ generatingMOM: v }),
  setActiveView: (v) => set({ activeView: v }),
  setShowHistory: (v) => set({ showHistory: v }),
  resetMeeting: () =>
    set({
      ...initialState,
      activeView: 'setup',
    }),
}));
