'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  segments: SpeechSegment[];
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  // Start with server-safe defaults (isSupported=false) to avoid hydration mismatch.
  // The actual browser check happens in useEffect which only runs on the client.
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [segments, setSegments] = useState<SpeechSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef('');
  const shouldRestartRef = useRef(false);

  // Check browser support + setup recognition — client-only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Browser supports Speech Recognition
    setIsSupported(true);
    setError(null);

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          fullTranscriptRef.current += text + ' ';
          setSegments((prev) => [
            ...prev,
            { text, timestamp: Date.now(), isFinal: true },
          ]);
        } else {
          interim += text;
        }
      }
      setTranscript(fullTranscriptRef.current);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
        setIsListening(false);
        shouldRestartRef.current = false;
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      try { recognitionRef.current?.abort(); } catch {}
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    try {
      shouldRestartRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e: any) {
      if (e.message?.includes('already started')) {
        setIsListening(true);
      } else {
        setError(`Failed to start: ${e.message}`);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    fullTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setSegments([]);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    segments,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  };
}