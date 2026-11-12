import { useState, useRef, useEffect, useCallback } from "react";
import {
    AgentEventsEnum,
    LiveAvatarSession,
    SessionEvent,
    VoiceChatEvent,
} from "@heygen/liveavatar-web-sdk";

type Line = { who: "you" | "avatar"; text: string };

type Options = {
    manualReply?: boolean;
};

export function useHeyGenAvatar({ manualReply = true }: Options = {}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const sessionRef = useRef<LiveAvatarSession | null>(null);
    const startingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSentRef = useRef({ text: "", time: 0 });

    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [lines, setLines] = useState<Line[]>([]);

    const addLine = useCallback((who: Line["who"], text: string) => {
        if (!text?.trim()) return;
        const clean = text.trim();
        setLines((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.who === who && last.text === clean) return prev;
            return [...prev, { who, text: clean }];
        });
    }, []);

    const startSession = useCallback(async () => {
        if (startingRef.current || sessionRef.current) return;
        startingRef.current = true;
        setIsLoading(true);
        setIsMuted(true);
        setLines([]);

        try {
            const res = await fetch("/api/heygen-token", { method: "POST" });
            const body = await res.json();
            const session_token = body?.session_token;
            if (!session_token) {
                throw new Error("No session token returned: " + JSON.stringify(body));
            }

            const session = new LiveAvatarSession(session_token, {
                voiceChat: { defaultMuted: true },
            });
            sessionRef.current = session;
            const voiceChat = session.voiceChat;

            // ---- mic state logging ----
            voiceChat.on(VoiceChatEvent.STATE_CHANGED, (state) =>
                console.info("[VoiceChat] state", state, "muted:", voiceChat.isMuted)
            );
            voiceChat.on(VoiceChatEvent.MUTED, () => console.info("[VoiceChat] muted"));
            voiceChat.on(VoiceChatEvent.UNMUTED, () => console.info("[VoiceChat] unmuted"));

            // ---- video + audio ----
            session.on(SessionEvent.SESSION_STREAM_READY, () => {
                const video = videoRef.current;
                if (video) {
                    session.attach(video);
                    video.muted = false;
                    video.volume = 1;
                    video.play().catch((e) =>
                        console.warn("[Video] autoplay blocked, click the page once:", e)
                    );
                }
                setIsReady(true);
                setIsMuted(voiceChat.isMuted);
                setIsLoading(false);
                console.info("[Session] stream ready");
            });

            let latestTranscript = "";

            session.on(SessionEvent.SESSION_DISCONNECTED, (reason) => {
                console.info("[Session] disconnected", reason);
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                latestTranscript = "";
                sessionRef.current = null;
                setIsReady(false);
                setIsMuted(true);
                setIsLoading(false);
            });

            // ---- speech: debounce & overwrite instead of appending ----
            session.on(AgentEventsEnum.USER_TRANSCRIPTION, (data: any) => {
                const text = (data?.text || "").trim();
                if (!text) return;

                if (!manualReply) {
                    addLine("you", text);
                    return;
                }

                latestTranscript = text;

                if (timerRef.current) clearTimeout(timerRef.current);

                timerRef.current = setTimeout(() => {
                    const msg = latestTranscript.trim();
                    latestTranscript = "";
                    if (!msg || !sessionRef.current) return;

                    const lettersOnly = msg.replace(/[^a-zA-Z0-9]/g, "");

                    if (lettersOnly.length <= 1) {
                        console.log("[Skipped background noise]:", msg);
                        return;
                    }

                    const lowerMsg = msg.toLowerCase();
                    const hallucinations = ["thank you.", "thank you", "okay", "okay.", "[silence]", "[noise]"];
                    if (hallucinations.includes(lowerMsg)) {
                        console.log("[Skipped STT hallucination]:", msg);
                        return;
                    }
                    const now = Date.now();
                    const last = lastSentRef.current;

                    if (msg.toLowerCase() === last.text && now - last.time < 4000) {
                        console.log("[Skipped duplicate]:", msg);
                        return;
                    }

                    lastSentRef.current = { text: msg.toLowerCase(), time: now };

                    addLine("you", msg);
                    console.log("SENDING TO AVATAR:", msg);
                    // sessionRef.current.message(msg);
                }, 1500);
            });

            Object.values(AgentEventsEnum).forEach((evt) => {
                if (evt === AgentEventsEnum.USER_TRANSCRIPTION) return;

                session.on(evt as any, (data: any) => {
                    const eventName = String(evt).toLowerCase();

                    // Filter out interim lip-sync chunks so text doesn't print word-by-word
                    if (eventName.includes("chunk") || eventName.includes("interim") || eventName.includes("partial")) {
                        return;
                    }

                    console.log("[EVENT]", evt, data);

                    // Only log the final finalized avatar speech
                    if (eventName.startsWith("avatar") && typeof data?.text === "string") {
                        addLine("avatar", data.text);
                    }
                });
            });

            await session.start();
            console.info("[Session] started");
        } catch (error) {
            console.error("[Session] failed to start", error);
            sessionRef.current = null;
            setIsLoading(false);
        } finally {
            startingRef.current = false;
        }
    }, [addLine, manualReply]);

    const toggleMic = useCallback(async () => {
        const vc = sessionRef.current?.voiceChat;
        if (!vc) return;
        try {
            if (vc.isMuted) await vc.unmute();
            else await vc.mute();
            setIsMuted(vc.isMuted);
        } catch (error) {
            console.error("[VoiceChat] toggle failed", error);
        }
    }, []);

    const sendText = useCallback(
        (text: string) => {
            if (!sessionRef.current || !text.trim()) return;
            const cleanText = text.trim();

            addLine("you", cleanText);

            // Log it in the global ref so the STT listener ignores the incoming SDK echo
            lastSentRef.current = { text: cleanText.toLowerCase(), time: Date.now() };

            sessionRef.current.message(cleanText);
        },
        [addLine]
    );

    const stopSession = useCallback(async () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const session = sessionRef.current;
        sessionRef.current = null;
        setIsReady(false);
        setIsMuted(true);
        try {
            await session?.stop();
        } catch (error) {
            console.error("[Session] stop failed", error);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            const session = sessionRef.current;
            sessionRef.current = null;
            session?.stop().catch(() => { });
        };
    }, []);

    return {
        videoRef,
        isReady,
        isLoading,
        isMuted,
        lines,
        startSession,
        stopSession,
        toggleMic,
        sendText,
    };
}