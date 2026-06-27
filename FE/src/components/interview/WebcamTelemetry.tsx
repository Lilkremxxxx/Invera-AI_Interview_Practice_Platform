import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Video, VideoOff, RefreshCw, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useCameraPreview } from '@/hooks/use-camera-preview';

export interface TelemetryData {
  gazeRatio: number;      // Ratio of time looking at screen (0.0 to 1.0)
  smileRatio: number;     // Ratio of time smiling (0.0 to 1.0)
  slouchRatio: number;    // Ratio of time slouching (0.0 to 1.0)
  handGestures: number;   // Number of hand gestures detected
  fidgetRatio: number;    // Ratio of time fidgeting/shaking (0.0 to 1.0)
  happyRatio?: number;     // Ratio of time feeling happy (0.0 to 1.0)
  stressedRatio?: number;  // Ratio of time feeling stressed (0.0 to 1.0)
  neutralRatio?: number;   // Ratio of time feeling neutral (0.0 to 1.0)
  surprisedRatio?: number; // Ratio of time feeling surprised (0.0 to 1.0)
  // Verbal delivery metrics:
  speakingPace?: number;       // Words per minute (WPM)
  fillerWordsCount?: number;   // Total filler words detected
  longPausesCount?: number;    // Total pauses > 3s
  bodyPostureScore?: number;   // Percentage of time posture was OK (0.0 to 1.0)
  presentationConfidence?: number; // Confidence score (0 to 100)
  // New non-verbal metrics for backend evaluation
  blinkRatio?: number;         // Blink frames / total frames (excessive = nervousness)
  avgHeadYaw?: number;         // Average absolute head yaw (> 3 = looking away often)
  avgTensionScore?: number;    // Average tension composite (0.0-1.0, high = stressed)
  recordingDurationSec?: number; // Total recording duration in seconds (for WPM recalculation on backend)
}

interface WebcamTelemetryProps {
  isRecording: boolean;
  onRecordingStart: (stream: MediaStream) => void;
  onRecordingStop: (videoBlob: Blob, telemetry: TelemetryData) => void;
  onRecordingChunk?: (chunk: Blob) => void;
  language: 'vi' | 'en';
  onCameraReady?: (stream: MediaStream) => void;
  onCameraClose?: () => void;
  answerText?: string; // added to track full text for filler words and speed
}

export const WebcamTelemetry: React.FC<WebcamTelemetryProps> = ({
  isRecording,
  onRecordingStart,
  onRecordingStop,
  onRecordingChunk,
  language,
  onCameraReady,
  onCameraClose,
  answerText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // MediaPipe detectors
  const faceLandmarkerRef = useRef<any>(null);
  const poseLandmarkerRef = useRef<any>(null);

  // State
  const [cameraState, setCameraState] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Recording state ref to avoid stale closures in RAF loop
  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Live telemetry metrics (for UI overlays)
  const [smileDetected, setSmileDetected] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<'neutral' | 'happy' | 'surprised' | 'stressed'>('neutral');
  const [eyeContactOk, setEyeContactOk] = useState(true);
  const [postureOk, setPostureOk] = useState(true);
  const [handGesturesCount, setHandGesturesCount] = useState(0);
  const cameraStateRef = useRef(cameraState);
  const handGesturesCountRef = useRef(0);

  // Framing evaluation states
  const [framingState, setFramingState] = useState<'ok' | 'too-close' | 'too-far' | 'off-center' | 'too-dark' | 'missing'>('ok');
  const [speechWpm, setSpeechWpm] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [coachingMessage, setCoachingMessage] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(100);

  const lastSpeechTimeRef = useRef<number>(Date.now());
  const lastWordCountRef = useRef<number>(0);
  const recordingSecondsRef = useRef<number>(0);
  const recordingStartedAtRef = useRef<number>(0);
  const answerTextRef = useRef('');

  useEffect(() => {
    cameraStateRef.current = cameraState;
  }, [cameraState]);

  useEffect(() => {
    handGesturesCountRef.current = handGesturesCount;
  }, [handGesturesCount]);

  // Sync answerText to ref so intervals/effects read latest value (fix stale closure → WPM always 0)
  useEffect(() => {
    answerTextRef.current = answerText || '';
  }, [answerText]);

  // Tracking buffers
  const telemetryHistory = useRef<Array<{
    gaze: boolean;
    smile: boolean;
    slouch: boolean;
    handActive: boolean;
    shoulderPos: { x: number; y: number };
    emotion: 'neutral' | 'happy' | 'surprised' | 'stressed';
    framingOk: boolean;
    // New metrics
    isBlinking: boolean;     // blink detected this frame
    headYaw: number;         // head rotation (> 8 = looking away)
    tensionScore: number;    // 0.0-1.0 composite tension
  }>>([]);

  const lastHandState = useRef<boolean>(false);
  const frameCounter = useRef<number>(0);
  const trackingStartedRef = useRef(false);
  const previewReadyRef = useRef(false);

  // Multi-language text copy
  const copy = {
    startCamera: language === 'vi' ? 'Bật Camera' : 'Start Camera',
    stopCamera: language === 'vi' ? 'Tắt Camera' : 'Stop Camera',
    initializing: language === 'vi' ? 'Đang khởi tạo Camera & AI...' : 'Initializing Camera & AI...',
    ready: language === 'vi' ? 'Hệ thống AI đã sẵn sàng' : 'AI System Ready',
    error: language === 'vi' ? 'Không thể mở camera. Quay lại chế độ ghi âm.' : 'Camera error. Falling back to audio.',
    postureWarning: language === 'vi' ? 'Hãy ngồi thẳng lưng!' : 'Please sit up straight!',
    gazeWarning: language === 'vi' ? 'Hãy tập trung nhìn vào màn hình' : 'Keep your eyes on the screen',
    loadingModels: language === 'vi' ? 'Đang tải mô hình học máy (MediaPipe)...' : 'Loading machine learning models...',
    smileText: language === 'vi' ? 'Biểu cảm: Thân thiện' : 'Expression: Friendly',
    smileNeutral: language === 'vi' ? 'Biểu cảm: Bình thường' : 'Expression: Neutral',
    gestures: language === 'vi' ? 'Thao tác tay' : 'Hand Gestures',
    expressionHappy: language === 'vi' ? 'Biểu cảm: Thân thiện' : 'Expression: Friendly',
    expressionNeutral: language === 'vi' ? 'Biểu cảm: Bình thường' : 'Expression: Neutral',
    expressionSurprised: language === 'vi' ? 'Biểu cảm: Ngạc nhiên' : 'Expression: Surprised',
    expressionStressed: language === 'vi' ? 'Biểu cảm: Căng thẳng' : 'Expression: Stressed',
    gesturesLabel: language === 'vi' ? 'Cử chỉ:' : 'Gestures:',
    paceLabel: language === 'vi' ? 'Tốc độ:' : 'Pace:',
    confidenceLabel: language === 'vi' ? 'Tự tin:' : 'Confidence:',
  };

  // 1. Load MediaPipe Models
  useEffect(() => {
    let active = true;

    async function loadModels() {
      try {
        setLoadingProgress(10);
        const { FilesetResolver, FaceLandmarker, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        
        if (!active) return;
        setLoadingProgress(30);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
        );

        if (!active) return;
        setLoadingProgress(55);

        // Load Face Landmarker for eye contact & expression blendshapes
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
        });

        if (!active) return;
        setLoadingProgress(80);

        // Load Pose Landmarker (Lite version) for posture & body language
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          },
          runningMode: 'VIDEO',
        });

        if (!active) return;
        faceLandmarkerRef.current = faceLandmarker;
        poseLandmarkerRef.current = poseLandmarker;
        setIsModelsLoaded(true);
        setLoadingProgress(100);
      } catch (err) {
        console.error('Failed to load MediaPipe models:', err);
        if (active) {
          setErrorMessage(err instanceof Error ? err.message : 'Model load failed');
          setCameraState('error');
        }
      }
    }

    void loadModels();

    return () => {
      active = false;
    };
  }, []);

  // 2. Start Camera Feed
  const startCamera = async () => {
    setCameraState('initializing');
    try {
      if (mediaStreamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        },
        audio: true,
      });

      mediaStreamRef.current = stream;
      setCameraState('ready');
      onCameraReady?.(stream);
    } catch (err) {
      console.error('Error starting camera:', err);
      setCameraState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Camera permission denied');
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    trackingStartedRef.current = false;
    previewReadyRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
    onCameraClose?.();
  };

  // Auto-start camera when models are loaded
  useEffect(() => {
    if (isModelsLoaded && cameraState === 'idle') {
      void startCamera();
    }
  }, [isModelsLoaded, cameraState]);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Speech processing (Interval for WPM, pause tracking and filler word counters)
  // Uses answerTextRef to avoid stale closure bug — interval keeps running during recording
  useEffect(() => {
    if (!isRecording) {
      recordingSecondsRef.current = 0;
      recordingStartedAtRef.current = 0;
      lastWordCountRef.current = 0;
      lastSpeechTimeRef.current = Date.now();
      setSpeechWpm(0);
      setFillerCount(0);
      setPauseCount(0);
      return;
    }

    if (recordingStartedAtRef.current === 0) {
      recordingStartedAtRef.current = Date.now();
    }

    const interval = setInterval(() => {
      recordingSecondsRef.current += 1;
      const seconds = recordingSecondsRef.current;

      const text = answerTextRef.current || '';
      const hasTranscript = text.trim().length > 0;
      const words = text.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;

      if (!hasTranscript) {
        setSpeechWpm(0);
        lastWordCountRef.current = 0;
        lastSpeechTimeRef.current = Date.now();
        return;
      }

      // Word flow calculation
      const wpm = seconds > 0 ? Math.round((wordCount / seconds) * 60) : 0;
      setSpeechWpm(wpm);

      // Long pause logic
      const now = Date.now();
      if (wordCount === lastWordCountRef.current) {
        if (now - lastSpeechTimeRef.current >= 3500) {
          setPauseCount((prev) => prev + 1);
          lastSpeechTimeRef.current = now; // reset trigger
        }
      } else {
        lastWordCountRef.current = wordCount;
        lastSpeechTimeRef.current = now;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Filler words counting
  useEffect(() => {
    if (!isRecording) return;
    const text = answerText || '';
    const viFillers = ['ừm', 'à', 'thì', 'là', 'kiểu', 'kiểu như', 'ờ', 'dạ'];
    const enFillers = ['uh', 'um', 'like', 'you know', 'actually', 'basically'];
    const fillers = language === 'vi' ? viFillers : enFillers;

    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    words.forEach((w) => {
      const clean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      if (fillers.includes(clean)) {
        count++;
      }
    });

    if (language === 'vi') {
      const matches = text.toLowerCase().match(/kiểu như/g);
      if (matches) count += matches.length;
    } else {
      const matches = text.toLowerCase().match(/you know/g);
      if (matches) count += matches.length;
    }

    setFillerCount(count);
  }, [answerText, language, isRecording]);

  // Unified Realtime Coaching logic
  useEffect(() => {
    if (!isRecording) {
      setCoachingMessage('');
      return;
    }

    // Priorities: 1. Face missing -> 2. Eye Contact -> 3. Posture -> 4. Speech speed
    const hasTranscript = Boolean(answerTextRef.current.trim());

    if (framingState === 'missing') {
      setCoachingMessage(language === 'vi' ? 'Không thấy mặt bạn' : 'Face not detected');
    } else if (framingState === 'too-dark') {
      setCoachingMessage(language === 'vi' ? 'Hãy tăng độ sáng phòng' : 'Increase room lighting');
    } else if (framingState === 'too-close') {
      setCoachingMessage(language === 'vi' ? 'Ngồi xa camera một chút' : 'Sit a bit farther');
    } else if (framingState === 'too-far') {
      setCoachingMessage(language === 'vi' ? 'Ngồi gần camera một chút' : 'Sit a bit closer');
    } else if (framingState === 'off-center') {
      setCoachingMessage(language === 'vi' ? 'Ngồi giữa khung hình' : 'Center your face');
    } else if (!eyeContactOk) {
      setCoachingMessage(language === 'vi' ? 'Hãy nhìn vào camera' : 'Look at the camera');
    } else if (!postureOk) {
      setCoachingMessage(language === 'vi' ? 'Ngồi thẳng lưng' : 'Sit up straight');
    } else if (hasTranscript && recordingSecondsRef.current > 8) {
      if (speechWpm > 155) {
        setCoachingMessage(language === 'vi' ? 'Nói chậm lại một chút' : 'Speak slower 🗣️');
      } else if (speechWpm > 0 && speechWpm < 85) {
        setCoachingMessage(language === 'vi' ? 'Nói nhanh hơn hoặc rõ hơn' : 'Speak a bit faster 🗣️');
      } else {
        setCoachingMessage(language === 'vi' ? 'Tốc độ nói rất tốt' : 'Good pace!');
      }
    } else {
      setCoachingMessage(language === 'vi' ? 'Đang theo dõi phỏng vấn...' : 'Analyzing presentation...');
    }
  }, [isRecording, framingState, eyeContactOk, postureOk, speechWpm, language]);

  // Realtime Presentation Confidence Score Calculation
  useEffect(() => {
    if (!isRecording) return;
    const hasTranscript = Boolean(answerText?.trim());
    
    // Eye Contact (20%), Posture (15%), Smile (10%), Speech Speed (20%), Fillers (20%),
    // Blink rate (-8 max), Head Movement (-7 max), Tension (-5 max)
    let score = 0;
    score += (eyeContactOk ? 20 : 4);
    score += (postureOk ? 15 : 4);
    score += (smileDetected ? 10 : 2);

    if (hasTranscript) {
      if (speechWpm >= 90 && speechWpm <= 140) {
        score += 20;
      } else if ((speechWpm >= 70 && speechWpm < 90) || (speechWpm > 140 && speechWpm <= 165)) {
        score += 12;
      } else if (speechWpm > 0) {
        score += 4;
      }

      const fillerScoreLocal = Math.max(0, 20 - fillerCount * 3);
      score += fillerScoreLocal;
    }

    setConfidenceScore(Math.min(100, score));
  }, [answerText, eyeContactOk, postureOk, smileDetected, speechWpm, fillerCount, isRecording]);

  // 3. MediaPipe tracking loop (runs at ~8 FPS to save CPU)
  const startTrackingLoop = useCallback(() => {
    if (trackingStartedRef.current) return;
    trackingStartedRef.current = true;

    const process = () => {
      if (!isRecordingRef.current || (cameraStateRef.current !== 'ready' && !mediaStreamRef.current)) {
        trackingStartedRef.current = false;
        animationFrameId.current = null;
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended) {
        animationFrameId.current = requestAnimationFrame(process);
        return;
      }

      // Optimize CPU: Run models only once every 3 frames (~8 FPS at 24fps)
      frameCounter.current += 1;
      if (frameCounter.current % 3 !== 0) {
        animationFrameId.current = requestAnimationFrame(process);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        try {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const timestamp = performance.now();
          let smile = false;
          let gaze = true;
          let slouch = false;
          let hands = false;
          let shoulderCenter = { x: 0.5, y: 0.5 };
          let detectedEmotion: 'neutral' | 'happy' | 'surprised' | 'stressed' = 'neutral';
          let faceFraming: 'ok' | 'too-close' | 'too-far' | 'off-center' | 'too-dark' | 'missing' = 'missing';
          // New metrics — declared here so they're in scope for telemetryHistory.push
          let isBlinking = false;
          let headYaw = 0;
          let tensionScore = 0;

          // --- FACE PROCESSING ---
          if (faceLandmarkerRef.current) {
            const results = faceLandmarkerRef.current.detectForVideo(video, timestamp);
            if (results && results.faceBlendshapes && results.faceBlendshapes.length > 0) {
              const blendshapes = results.faceBlendshapes[0].categories;
              const landmarks = results.faceLandmarks[0];

              // Smile detection (threshold lowered from 0.25→0.08 for MediaPipe blendshape scores)
              const smileL = blendshapes.find((c: any) => c.categoryName === 'mouthSmileLeft')?.score || 0;
              const smileR = blendshapes.find((c: any) => c.categoryName === 'mouthSmileRight')?.score || 0;
              const avgSmile = (smileL + smileR) / 2;
              smile = avgSmile > 0.08;
              setSmileDetected(smile);

              // Gaze / Eye-Contact estimation
              const eyeLookInL = blendshapes.find((c: any) => c.categoryName === 'eyeLookInLeft')?.score || 0;
              const eyeLookOutL = blendshapes.find((c: any) => c.categoryName === 'eyeLookOutLeft')?.score || 0;
              const eyeLookInR = blendshapes.find((c: any) => c.categoryName === 'eyeLookInRight')?.score || 0;
              const eyeLookOutR = blendshapes.find((c: any) => c.categoryName === 'eyeLookOutRight')?.score || 0;
              const averageGazeOffset = (eyeLookInL + eyeLookOutL + eyeLookInR + eyeLookOutR) / 4;
              gaze = averageGazeOffset < 0.2;
              setEyeContactOk(gaze);

              // Emotion Engine
              const eyeWideL = blendshapes.find((c: any) => c.categoryName === 'eyeWideLeft')?.score || 0;
              const eyeWideR = blendshapes.find((c: any) => c.categoryName === 'eyeWideRight')?.score || 0;
              const avgEyeWide = (eyeWideL + eyeWideR) / 2;
              const jawOpenVal = blendshapes.find((c: any) => c.categoryName === 'jawOpen')?.score || 0;
              const surprised = avgEyeWide > 0.3 || jawOpenVal > 0.3;

              const browDownL = blendshapes.find((c: any) => c.categoryName === 'browDownLeft')?.score || 0;
              const browDownR = blendshapes.find((c: any) => c.categoryName === 'browDownRight')?.score || 0;
              const avgBrowDown = (browDownL + browDownR) / 2;
              const mouthFrownL = blendshapes.find((c: any) => c.categoryName === 'mouthFrownLeft')?.score || 0;
              const mouthFrownR = blendshapes.find((c: any) => c.categoryName === 'mouthFrownRight')?.score || 0;
              const avgMouthFrown = (mouthFrownL + mouthFrownR) / 2;
              const stressed = avgBrowDown > 0.25 || avgMouthFrown > 0.2;

              // NEW: Blink rate — eyeBlinkLeft / eyeBlinkRight blendshapes
              const blinkL = blendshapes.find((c: any) => c.categoryName === 'eyeBlinkLeft')?.score || 0;
              const blinkR = blendshapes.find((c: any) => c.categoryName === 'eyeBlinkRight')?.score || 0;
              isBlinking = (blinkL > 0.5 || blinkR > 0.5);

              // NEW: Tension indicators
              const mouthPressL = blendshapes.find((c: any) => c.categoryName === 'mouthPressLeft')?.score || 0;
              const mouthPressR = blendshapes.find((c: any) => c.categoryName === 'mouthPressRight')?.score || 0;
              const browInnerUp = blendshapes.find((c: any) => c.categoryName === 'browInnerUp')?.score || 0;
              const noseSneerL = blendshapes.find((c: any) => c.categoryName === 'noseSneerLeft')?.score || 0;
              const noseSneerR = blendshapes.find((c: any) => c.categoryName === 'noseSneerRight')?.score || 0;
              tensionScore = (avgBrowDown + (mouthPressL + mouthPressR) / 2 + browInnerUp + (noseSneerL + noseSneerR) / 2) / 4;

              // NEW: Head pose from face landmarks (rough yaw/pitch)
              // Landmarks: 1 = nose tip, 168 = nose bridge
              const noseTip = landmarks[1];
              const noseBridge = landmarks[168];
              if (noseTip && noseBridge) {
                headYaw = (noseTip.x - noseBridge.x) * 100; // positive = looking right
              }

              if (smile) {
                detectedEmotion = 'happy';
              } else if (surprised) {
                detectedEmotion = 'surprised';
              } else if (stressed) {
                detectedEmotion = 'stressed';
              }
              setCurrentEmotion(detectedEmotion);

              // Bounding dimensions and Framing score
              const pLeft = landmarks[234];
              const pRight = landmarks[454];
              const pForehead = landmarks[10];
              const pChin = landmarks[152];

              if (pLeft && pRight && pForehead && pChin) {
                const faceWidth = Math.abs(pRight.x - pLeft.x);
                const faceCenterX = (pLeft.x + pRight.x) / 2;

                // Brightness
                let isDark = false;
                const fx = pLeft.x * canvas.width;
                const fy = pForehead.y * canvas.height;
                const fw = (pRight.x - pLeft.x) * canvas.width;
                const fh = (pChin.y - pForehead.y) * canvas.height;
                
                const faceX = Math.max(0, Math.floor(fx));
                const faceY = Math.max(0, Math.floor(fy));
                const faceW = Math.min(Math.floor(fw), canvas.width - faceX);
                const faceH = Math.min(Math.floor(fh), canvas.height - faceY);

                if (faceW > 5 && faceH > 5) {
                  try {
                    const imgData = ctx.getImageData(faceX, faceY, faceW, faceH);
                    const data = imgData.data;
                    let colorSum = 0;
                    let sampleCount = 0;
                    for (let x = 0; x < data.length; x += 16) {
                      const r = data[x];
                      const g = data[x+1];
                      const b = data[x+2];
                      const avg = 0.299 * r + 0.587 * g + 0.114 * b;
                      colorSum += avg;
                      sampleCount++;
                    }
                    const brightness = sampleCount > 0 ? colorSum / sampleCount : 128;
                    isDark = brightness < 45;
                  } catch (e) {}
                }

                if (isDark) {
                  faceFraming = 'too-dark';
                } else if (faceWidth > 0.42) {
                  faceFraming = 'too-close';
                } else if (faceWidth < 0.08) {
                  faceFraming = 'too-far';
                } else if (faceCenterX < 0.28 || faceCenterX > 0.72) {
                  faceFraming = 'off-center';
                } else {
                  faceFraming = 'ok';
                }
              }
              setFramingState(faceFraming);

              // Draw clean subtle face bounding frame
              drawFaceBorder(ctx, landmarks, canvas.width, canvas.height, gaze && faceFraming === 'ok');
            } else {
              setFramingState('missing');
            }
          }

          // --- POSE PROCESSING ---
          if (poseLandmarkerRef.current) {
            const results = poseLandmarkerRef.current.detectForVideo(video, timestamp);
            if (results && results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              const leftShoulder = landmarks[11];
              const rightShoulder = landmarks[12];

              if (leftShoulder && rightShoulder) {
                // Posture Slouch
                const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
                slouch = heightDiff > 0.06;
                setPostureOk(!slouch);

                shoulderCenter = {
                  x: (leftShoulder.x + rightShoulder.x) / 2,
                  y: (leftShoulder.y + rightShoulder.y) / 2,
                };
                drawShoulders(ctx, leftShoulder, rightShoulder, canvas.width, canvas.height, !slouch);
              }

              // Wrists above shoulders = gestures
              const leftWrist = landmarks[15];
              const rightWrist = landmarks[16];
              const shoulderLevel = (leftShoulder?.y + rightShoulder?.y) / 2 || 0.5;

              if ((leftWrist && leftWrist.y < shoulderLevel && leftWrist.visibility > 0.5) ||
                  (rightWrist && rightWrist.y < shoulderLevel && rightWrist.visibility > 0.5)) {
                hands = true;
              }

              if (hands && !lastHandState.current) {
                setHandGesturesCount((prev) => {
                  const next = prev + 1;
                  handGesturesCountRef.current = next;
                  return next;
                });
              }
              lastHandState.current = hands;
            }
          }

          // Save history during recording
          if (isRecordingRef.current) {
            telemetryHistory.current.push({
              gaze,
              smile,
              slouch,
              handActive: hands,
              shoulderPos: shoulderCenter,
              emotion: detectedEmotion,
              framingOk: faceFraming === 'ok',
              isBlinking,    // from face block
              headYaw,
              tensionScore,
            });
          }
        } catch (error) {
          console.error('MediaPipe tracking failed:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Tracking failed');
          stopTrackingLoop();
          return;
        }
      }

      animationFrameId.current = requestAnimationFrame(process);
    };

    animationFrameId.current = requestAnimationFrame(process);
  }, []);

  const stopTrackingLoop = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    trackingStartedRef.current = false;
  }, []);

  const handlePreviewReady = useCallback(() => {
    previewReadyRef.current = true;
    if (isRecordingRef.current) {
      startTrackingLoop();
    }
  }, [startTrackingLoop]);

  const videoRef = useCameraPreview({
    active: cameraState === 'ready',
    stream: mediaStreamRef.current,
    onPreviewReady: handlePreviewReady,
  });

  // Helper drawing functions
  const drawFaceBorder = (ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number, ok: boolean) => {
    const pForehead = landmarks[10];
    const pChin = landmarks[152];
    const pLeft = landmarks[234];
    const pRight = landmarks[454];

    if (pForehead && pChin && pLeft && pRight) {
      const fx = pLeft.x * w;
      const fy = pForehead.y * h;
      const fw = (pRight.x - pLeft.x) * w;
      const fh = (pChin.y - pForehead.y) * h;

      ctx.save();
      ctx.strokeStyle = ok ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      // Top-Left corner
      ctx.moveTo(fx, fy + 20); ctx.lineTo(fx, fy); ctx.lineTo(fx + 20, fy);
      // Top-Right corner
      ctx.moveTo(fx + fw - 20, fy); ctx.lineTo(fx + fw, fy); ctx.lineTo(fx + fw, fy + 20);
      // Bottom-Left corner
      ctx.moveTo(fx, fy + fh - 20); ctx.lineTo(fx, fy + fh); ctx.lineTo(fx + 20, fy + fh);
      // Bottom-Right corner
      ctx.moveTo(fx + fw - 20, fy + fh); ctx.lineTo(fx + fw, fy + fh); ctx.lineTo(fx + fw, fy + fh - 20);
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawShoulders = (ctx: CanvasRenderingContext2D, left: any, right: any, w: number, h: number, ok: boolean) => {
    const lx = left.x * w;
    const ly = left.y * h;
    const rx = right.x * w;
    const ry = right.y * h;

    ctx.save();
    ctx.strokeStyle = ok ? 'rgba(99, 102, 241, 0.5)' : 'rgba(245, 158, 11, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    ctx.fillStyle = ok ? '#6366f1' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, 2 * Math.PI);
    ctx.arc(rx, ry, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  };

  // 4. Handle Recording Control
  useEffect(() => {
    if (isRecording) {
      startRecording();
      if (previewReadyRef.current) {
        startTrackingLoop();
      }
    } else {
      stopRecording();
      stopTrackingLoop();
    }
  }, [isRecording, startTrackingLoop, stopTrackingLoop]);

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    chunksRef.current = [];
    telemetryHistory.current = [];
    setHandGesturesCount(0);
    handGesturesCountRef.current = 0;
    setCurrentEmotion('neutral');
    setConfidenceScore(100);

    const recorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
        onRecordingChunk?.(e.data);
      }
    };

    recorder.onstop = () => {
      const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];

      const history = telemetryHistory.current;
      const totalFrames = history.length;

      let gazeCount = 0;
      let smileCount = 0;
      let slouchCount = 0;
      let happyCount = 0;
      let stressedCount = 0;
      let surprisedCount = 0;
      let neutralCount = 0;
      // New metrics accumulators
      let blinkCount = 0;
      let headYawSum = 0;
      let tensionSum = 0;

      history.forEach((frame) => {
        if (frame.gaze) gazeCount++;
        if (frame.smile) smileCount++;
        if (frame.slouch) slouchCount++;
        if (frame.emotion === 'happy') happyCount++;
        else if (frame.emotion === 'stressed') stressedCount++;
        else if (frame.emotion === 'surprised') surprisedCount++;
        else if (frame.emotion === 'neutral') neutralCount++;
        // New metrics
        if (frame.isBlinking) blinkCount++;
        if (typeof frame.headYaw === 'number') headYawSum += Math.abs(frame.headYaw);
        if (typeof frame.tensionScore === 'number') tensionSum += frame.tensionScore;
      });

      let totalPositionDiff = 0;
      for (let i = 1; i < history.length; i++) {
        const pos1 = history[i].shoulderPos;
        const pos2 = history[i - 1].shoulderPos;
        totalPositionDiff += Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
      }

      const finalGazeRatio = totalFrames ? Math.round((gazeCount / totalFrames) * 100) / 100 : 1.0;
      const finalPostureScore = totalFrames ? Math.round(((totalFrames - slouchCount) / totalFrames) * 100) / 100 : 1.0;

      const finalSmileRatio = totalFrames ? Math.round((smileCount / totalFrames) * 100) / 100 : 0.0;

      // Compute derived metrics for confidence
      const blinkRatio = totalFrames ? Math.min(blinkCount / totalFrames, 0.15) : 0; // (0-0.15)
      const avgHeadYaw = totalFrames ? headYawSum / totalFrames : 0;   // (0 ~ 15+)
      const avgTension = totalFrames ? tensionSum / totalFrames : 0;    // (0.0-1.0)

      // Confidence sub-scores (each contributing to weighted total)
      const gazeScore = finalGazeRatio * 20;           // 20% — eye contact
      const postureScore = finalPostureScore * 15;      // 15% — posture
      const smileScore = finalSmileRatio * 10;          // 10% — friendliness
      const blinkPenalty = Math.min(blinkRatio * 200, 8); // up to -8 penalty for excessive blinking
      const headMovePenalty = Math.min(Math.max(avgHeadYaw - 3, 0) * 1.5, 7); // up to -7
      const tensionPenalty = Math.min(avgTension * 12, 5); // up to -5 tension
      const nonVerbalScore = Math.max(0, gazeScore + postureScore + smileScore - blinkPenalty - headMovePenalty - tensionPenalty);

      // Speech scores
      let speechScore = 0;
      if (speechWpm >= 90 && speechWpm <= 140) {
        speechScore = 20;
      } else if ((speechWpm >= 70 && speechWpm < 90) || (speechWpm > 140 && speechWpm <= 165)) {
        speechScore = 12;
      } else if (speechWpm > 0) {
        speechScore = 5;
      }
      const fillerScore = Math.max(0, 20 - fillerCount * 3);
      const verbalScore = speechScore + fillerScore;

      let finalConfScore = Math.min(100, Math.round(nonVerbalScore + verbalScore));
      const recordingDurationSec = recordingStartedAtRef.current > 0
        ? Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
        : recordingSecondsRef.current;

      const finalTelemetry: TelemetryData = {
        gazeRatio: finalGazeRatio,
        smileRatio: finalSmileRatio,
        slouchRatio: totalFrames ? Math.round((slouchCount / totalFrames) * 100) / 100 : 0.0,
        handGestures: handGesturesCountRef.current,
        fidgetRatio: totalFrames ? Math.round(Math.min(totalPositionDiff * 15, 100)) / 100 : 0.0,
        happyRatio: totalFrames ? Math.round((happyCount / totalFrames) * 100) / 100 : 0.0,
        stressedRatio: totalFrames ? Math.round((stressedCount / totalFrames) * 100) / 100 : 0.0,
        neutralRatio: totalFrames ? Math.round((neutralCount / totalFrames) * 100) / 100 : 1.0,
        surprisedRatio: totalFrames ? Math.round((surprisedCount / totalFrames) * 100) / 100 : 0.0,
        // Newly added fields:
        speakingPace: speechWpm,
        fillerWordsCount: fillerCount,
        longPausesCount: pauseCount,
        bodyPostureScore: finalPostureScore,
        presentationConfidence: Math.round(finalConfScore),
        // New non-verbal metrics for backend scoring
        blinkRatio: Math.round(blinkRatio * 100) / 100,
        avgHeadYaw: Math.round(avgHeadYaw * 10) / 10,
        avgTensionScore: Math.round(avgTension * 100) / 100,
        recordingDurationSec,
      };

      onRecordingStop(videoBlob, finalTelemetry);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1250);
    onRecordingStart(mediaStreamRef.current);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Loading indicator for models
  if (!isModelsLoaded) {
    return (
      <div className="bg-card rounded-2xl border p-8 flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[300px]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xl">🤖</div>
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <p className="font-semibold text-foreground text-sm">{copy.loadingModels}</p>
          <Progress value={loadingProgress} className="h-1.5 w-48 mx-auto" />
          <p className="text-xs text-muted-foreground">{loadingProgress}% completed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border p-4 shadow-md space-y-4 h-full flex flex-col justify-between">
      {/* Video Canvas Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-muted flex items-center justify-center flex-1 min-h-[340px]">
        {cameraState === 'ready' ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />
            
            {/* Realtime Coaching Badge (Only 1 alert overlay shown at a time) */}
            {isRecording && coachingMessage && (
              <div className={cn(
                "absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full font-medium text-xs flex items-center gap-2 shadow-lg backdrop-blur-md transition-all duration-300 z-10 border",
                coachingMessage.includes('Không') || coachingMessage.includes('không') || coachingMessage.includes('not') || coachingMessage.includes('chưa')
                  ? "bg-rose-500/90 text-white border-rose-400/30 animate-pulse"
                  : coachingMessage.includes('Hãy') || coachingMessage.includes('nhìn') || coachingMessage.includes('camera') || coachingMessage.includes('thẳng') || coachingMessage.includes('chậm') || coachingMessage.includes('slower') || coachingMessage.includes('straight')
                  ? "bg-amber-500/90 text-black border-amber-400/30 animate-bounce"
                  : "bg-emerald-500/90 text-white border-emerald-400/30"
              )}>
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{coachingMessage}</span>
              </div>
            )}



            {/* Premium Bottom Telemetry HUD overlay */}
            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] md:text-xs text-white/95 font-mono bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shadow-lg">
              {/* Expression */}
              <div className="flex items-center gap-2 border-r border-white/10 pr-2">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  currentEmotion === 'happy' ? "bg-emerald-500 animate-pulse" :
                  currentEmotion === 'surprised' ? "bg-sky-500" :
                  currentEmotion === 'stressed' ? "bg-rose-500 animate-pulse" : "bg-white/40"
                )} />
                <span className="truncate">
                  {currentEmotion === 'happy' ? copy.expressionHappy :
                   currentEmotion === 'surprised' ? copy.expressionSurprised :
                   currentEmotion === 'stressed' ? copy.expressionStressed :
                   copy.expressionNeutral}
                </span>
              </div>

              {/* Hand Gestures */}
              <div className="flex items-center justify-between border-r border-white/10 px-2">
                <span>{copy.gesturesLabel}</span>
                <span className="text-amber-400 font-bold">{handGesturesCount}</span>
              </div>

              {/* Realtime Speech Pace */}
              <div className="flex items-center justify-between border-r border-white/10 px-2">
                <span>{copy.paceLabel}</span>
                <span className={cn(
                  "font-bold",
                  speechWpm > 150 ? "text-rose-400 animate-pulse" : speechWpm > 0 && speechWpm < 85 ? "text-amber-400 animate-pulse" : "text-emerald-400"
                )}>{speechWpm || '—'} WPM</span>
              </div>

              {/* Confidence Indicator */}
              <div className="flex items-center justify-between px-2">
                <span>{copy.confidenceLabel}</span>
                <span className={cn(
                  "font-bold",
                  confidenceScore >= 80 ? "text-emerald-400" : confidenceScore >= 55 ? "text-amber-400" : "text-rose-400"
                )}>{confidenceScore}%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6 text-muted-foreground" />
            </div>
            {cameraState === 'initializing' ? (
              <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                {copy.initializing}
              </p>
            ) : cameraState === 'error' ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">{copy.error}</p>
                <p className="text-xs text-muted-foreground max-w-xs">{errorMessage}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Camera chưa bật</p>
            )}
          </div>
        )}
      </div>

      {/* Controller Buttons */}
      <div className="flex items-center justify-between border-t pt-3">
        <Button
          variant={cameraState === 'ready' ? 'outline' : 'accent'}
          size="sm"
          onClick={cameraState === 'ready' ? stopCamera : startCamera}
          disabled={isRecording}
          className="w-full sm:w-auto"
        >
          {cameraState === 'ready' ? (
            <>
              <VideoOff className="w-4 h-4 mr-2" />
              {copy.stopCamera}
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              {copy.startCamera}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
