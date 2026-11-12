// import { useState, useRef, useEffect, useCallback } from "react";
// import {
//     AgentEventsEnum,
//     LiveAvatarSession,
//     SessionEvent,
//     VoiceChatEvent,
// } from "@heygen/liveavatar-web-sdk";

// type Line = { who: "you" | "avatar"; text: string };

// type Options = {
//     manualReply?: boolean;
// };

// export function useHeyGenAvatar({ manualReply = true }: Options = {}) {
//     const videoRef = useRef<HTMLVideoElement>(null);
//     const sessionRef = useRef<LiveAvatarSession | null>(null);
//     const startingRef = useRef(false);
//     const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//     const [isReady, setIsReady] = useState(false);
//     const [isLoading, setIsLoading] = useState(false);
//     const [isMuted, setIsMuted] = useState(true);
//     const [lines, setLines] = useState<Line[]>([]);

//     const addLine = useCallback((who: Line["who"], text: string) => {
//         if (!text?.trim()) return;
//         setLines((prev) => [...prev, { who, text: text.trim() }]);
//     }, []);

//     const startSession = useCallback(async () => {
//         if (startingRef.current || sessionRef.current) return;
//         startingRef.current = true;
//         setIsLoading(true);
//         setIsMuted(true);
//         setLines([]);

//         try {
//             const res = await fetch("/api/heygen-token", { method: "POST" });
//             const body = await res.json();
//             const session_token = body?.session_token;
//             if (!session_token) {
//                 throw new Error("No session token returned: " + JSON.stringify(body));
//             }

//             const session = new LiveAvatarSession(session_token, {
//                 voiceChat: { defaultMuted: true },
//             });
//             sessionRef.current = session;
//             const voiceChat = session.voiceChat;

//             // ---- mic state logging ----
//             voiceChat.on(VoiceChatEvent.STATE_CHANGED, (state) =>
//                 console.info("[VoiceChat] state", state, "muted:", voiceChat.isMuted)
//             );
//             voiceChat.on(VoiceChatEvent.MUTED, () => console.info("[VoiceChat] muted"));
//             voiceChat.on(VoiceChatEvent.UNMUTED, () => console.info("[VoiceChat] unmuted"));

//             // ---- video + audio ----
//             session.on(SessionEvent.SESSION_STREAM_READY, () => {
//                 const video = videoRef.current;
//                 if (video) {
//                     session.attach(video);
//                     video.muted = false;
//                     video.volume = 1;
//                     video.play().catch((e) =>
//                         console.warn("[Video] autoplay blocked, click the page once:", e)
//                     );
//                 }
//                 setIsReady(true);
//                 setIsMuted(voiceChat.isMuted);
//                 setIsLoading(false);
//                 console.info("[Session] stream ready");
//             });

//             // ---- speech: auto-send transcribed voice with debounce ----
//             let buffer = "";

//             session.on(SessionEvent.SESSION_DISCONNECTED, (reason) => {
//                 console.info("[Session] disconnected", reason);
//                 if (timerRef.current) {
//                     clearTimeout(timerRef.current);
//                     timerRef.current = null;
//                 }
//                 buffer = "";
//                 sessionRef.current = null;
//                 setIsReady(false);
//                 setIsMuted(true);
//                 setIsLoading(false);
//             });

//             session.on(AgentEventsEnum.USER_TRANSCRIPTION, ({ text }) => {
//                 console.log("YOU SAID:", text);
//                 addLine("you", text);

//                 if (!manualReply) return;
//                 buffer += " " + text;
//                 if (timerRef.current) clearTimeout(timerRef.current);
//                 timerRef.current = setTimeout(() => {
//                     const msg = buffer.trim();
//                     buffer = "";
//                     if (msg && sessionRef.current) {
//                         console.log("SENDING VOICE TO AVATAR:", msg);
//                         sessionRef.current.message(msg);
//                     }
//                 }, 1200);
//             });

//             // ---- log every agent event so we can see what the avatar does ----
//             Object.values(AgentEventsEnum).forEach((evt) => {
//                 if (evt === AgentEventsEnum.USER_TRANSCRIPTION) return;
//                 session.on(evt as any, (data: any) => {
//                     console.log("[EVENT]", evt, data);
//                     if (String(evt).startsWith("avatar") && typeof data?.text === "string") {
//                         addLine("avatar", data.text);
//                     }
//                 });
//             });

//             await session.start();
//             console.info("[Session] started");
//         } catch (error) {
//             console.error("[Session] failed to start", error);
//             sessionRef.current = null;
//             setIsLoading(false);
//         } finally {
//             startingRef.current = false;
//         }
//     }, [addLine, manualReply]);

//     const toggleMic = useCallback(async () => {
//         const vc = sessionRef.current?.voiceChat;
//         if (!vc) return;
//         try {
//             if (vc.isMuted) await vc.unmute();
//             else await vc.mute();
//             setIsMuted(vc.isMuted);
//         } catch (error) {
//             console.error("[VoiceChat] toggle failed", error);
//         }
//     }, []);

//     const sendText = useCallback(
//         (text: string) => {
//             if (!sessionRef.current || !text.trim()) return;
//             addLine("you", text);
//             sessionRef.current.message(text);
//         },
//         [addLine]
//     );

//     const stopSession = useCallback(async () => {
//         if (timerRef.current) {
//             clearTimeout(timerRef.current);
//             timerRef.current = null;
//         }
//         const session = sessionRef.current;
//         sessionRef.current = null;
//         setIsReady(false);
//         setIsMuted(true);
//         try {
//             await session?.stop();
//         } catch (error) {
//             console.error("[Session] stop failed", error);
//         }
//     }, []);

//     useEffect(() => {
//         return () => {
//             if (timerRef.current) clearTimeout(timerRef.current);
//             const session = sessionRef.current;
//             sessionRef.current = null;
//             session?.stop().catch(() => {});
//         };
//     }, []);

//     return {
//         videoRef,
//         isReady,
//         isLoading,
//         isMuted,
//         lines,
//         startSession,
//         stopSession,
//         toggleMic,
//         sendText,
//     };
// }

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
            let lastSentMsg = "";
            let lastSentAt = 0;

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

                console.log("YOU SAID:", text);

                if (!manualReply) {
                    addLine("you", text);
                    return;
                }

                // Overwrite instead of "+=" so cumulative STT events don't repeat "hello hello hello"
                latestTranscript = text;

                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    const msg = latestTranscript.trim();
                    latestTranscript = "";
                    if (!msg || !sessionRef.current) return;

                    // Prevent sending the exact same phrase twice within 3 seconds
                    const now = Date.now();
                    if (msg.toLowerCase() === lastSentMsg.toLowerCase() && now - lastSentAt < 3000) {
                        console.log("[Skipped duplicate]:", msg);
                        return;
                    }

                    lastSentMsg = msg;
                    lastSentAt = now;

                    addLine("you", msg);
                    console.log("SENDING VOICE TO AVATAR:", msg);
                    sessionRef.current.message(msg);
                }, 1000);
            });

            // ---- log every agent event ----
            Object.values(AgentEventsEnum).forEach((evt) => {
                if (evt === AgentEventsEnum.USER_TRANSCRIPTION) return;
                session.on(evt as any, (data: any) => {
                    console.log("[EVENT]", evt, data);
                    if (String(evt).startsWith("avatar") && typeof data?.text === "string") {
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
            addLine("you", text);
            sessionRef.current.message(text);
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
            session?.stop().catch(() => {});
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