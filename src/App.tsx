import { useEffect, useRef, useState } from "react";

import logoImg from "@/imports/galaxy_studio_logo_for_video_without_background.webp";
import heroImg from "@/imports/bcff0804-5388-404a-8e04-15f201fad894.webp";
import deskImg from "@/imports/3fdd97c2-2891-4094-9214-196df630473f.webp";
import micCloseImg from "@/imports/9b6f958a-50ea-406b-b280-731a77251cd2.webp";
import micWideImg from "@/imports/2dad0e2f-97cd-4bc5-8a40-6d2ca428cee7.webp";
import monitorsImg from "@/imports/c896af71-ea06-4d96-9f86-afc747ae9b1f.webp";
import mpcLitImg from "@/imports/5f761b8a-db00-4f37-be3f-8a9cf9ced4ba.webp";
import mpcDemoImg from "@/imports/e2706307-4e0c-4c81-8ad8-c2b703520b7a.webp";
import interfaceImg from "@/imports/e508b057-4fc6-4354-b78c-ed237765bde3.webp";
import keyboardImg from "@/imports/b58464ee-8826-4dcf-82c2-e782d895a5eb.webp";
import speakerImg from "@/imports/7aa7a4d2-c05f-4d17-ace1-204719c82c51.webp";
import promoStudioTimeImg from "@/imports/IMG_3312.webp";
import promoBeatsImg from "@/imports/IMG_3365.webp";
import promoSuperstarsImg from "@/imports/IMG_3360.webp";
import promoMixMasterImg from "@/imports/IMG_3359.webp";
import visual01 from "@/imports/visuals/visual_01.webp";
import visual02 from "@/imports/visuals/visual_02.webp";
import visual03 from "@/imports/visuals/visual_03.webp";
import visual04 from "@/imports/visuals/visual_04.webp";
import visual05 from "@/imports/visuals/visual_05.webp";
import visual06 from "@/imports/visuals/visual_06.webp";
import visual07 from "@/imports/visuals/visual_07.webp";
import visual08 from "@/imports/visuals/visual_08.webp";
import visual09 from "@/imports/visuals/visual_09.webp";
import visual10 from "@/imports/visuals/visual_10.webp";
import visual11 from "@/imports/visuals/visual_11.webp";
import visual12 from "@/imports/visuals/visual_12.webp";
import visual13 from "@/imports/visuals/visual_13.webp";
import visual14 from "@/imports/visuals/visual_14.webp";
import visual15 from "@/imports/visuals/visual_15.webp";
import visual16 from "@/imports/visuals/visual_16.webp";
import visual17 from "@/imports/visuals/visual_17.webp";
import visual18 from "@/imports/visuals/visual_18.webp";
import visual19 from "@/imports/visuals/visual_19.webp";
import visual20 from "@/imports/visuals/visual_20.webp";
import visual21 from "@/imports/visuals/visual_21.webp";
import visual22 from "@/imports/visuals/visual_22.webp";
import visual23 from "@/imports/visuals/visual_23.webp";
import visual24 from "@/imports/visuals/visual_24.webp";
import visual25 from "@/imports/visuals/visual_25.webp";
import visual26 from "@/imports/visuals/visual_26.webp";
import visual27 from "@/imports/visuals/visual_27.webp";
import visual28 from "@/imports/visuals/visual_28.webp";
import visual29 from "@/imports/visuals/visual_29.webp";
import cultureArt from "@/imports/for-the-culture.webp";
import { getCurrentProgramme, getNextProgramme, getTodaySchedule, getHost, formatRadioTime, RADIO_TIME_ZONE } from "./radio/programming";

let paystackLoaderPromise: Promise<any> | null = null;

const getPaystackPublicKey = async () => {
  const buildKey = String(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim();
  if (buildKey) return buildKey;

  const response = await fetch('/api/paystack-config', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  const key = String(data?.publicKey || '').trim();
  if (!response.ok || !key) throw new Error('Paystack is not configured for this website. Please contact Galaxy Fire Studios.');
  return key;
};

const loadPaystack = async () => {
  if (typeof window !== 'undefined' && (window as any).PaystackPop) return (window as any).PaystackPop;
  if (paystackLoaderPromise) return paystackLoaderPromise;

  paystackLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-paystack-inline="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).PaystackPop));
      existing.addEventListener('error', () => reject(new Error('Paystack could not load. Please check your internet connection and try again.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.dataset.paystackInline = 'true';
    script.onload = () => {
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) reject(new Error('Paystack loaded but the payment library is unavailable.'));
      else resolve(PaystackPop);
    };
    script.onerror = () => reject(new Error('Paystack could not load. Please check your internet connection and try again.'));
    document.head.appendChild(script);
  });

  try {
    return await paystackLoaderPromise;
  } catch (error) {
    paystackLoaderPromise = null;
    throw error;
  }
};

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [visualSlide, setVisualSlide] = useState(0);
  const [visualPaused, setVisualPaused] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [cultureStories, setCultureStories] = useState([]);
  const [cultureFeedStatus, setCultureFeedStatus] = useState("loading");
  const [cultureActiveTab, setCultureActiveTab] = useState("home");
  const [cultureReaderStory, setCultureReaderStory] = useState<any | null>(null);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const radioLoadedSrcRef = useRef<string>("");
  const radioRecoveryTimerRef = useRef<number | null>(null);
  const radioResumeTimerRef = useRef<number | null>(null);
  const radioPausedByUserRef = useRef(false);
  const radioSwitchingTrackRef = useRef(false);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioVolume, setRadioVolume] = useState(0.85);
  const [radioPlayerOpen, setRadioPlayerOpen] = useState(false);
  const [radioStreamReady, setRadioStreamReady] = useState(false);
  // A user pause only affects the current page session. A fresh visit should
  // attempt to start the station again, just like entering a traditional radio site.
  const [radioPausedByUser, setRadioPausedByUser] = useState(false);
  const [radioStreamUrl, setRadioStreamUrl] = useState((import.meta.env.VITE_RADIO_STREAM_URL || "").trim());
  const [radioPlaylist, setRadioPlaylist] = useState<any[]>([]);
  const [radioTrackIndex, setRadioTrackIndex] = useState(() => {
    try { return Number(localStorage.getItem("gfs-radio-track-index") || "0"); } catch { return 0; }
  });
  const [radioHistory, setRadioHistory] = useState<any[]>([]);
  const [radioPlayedKeys, setRadioPlayedKeys] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gfs-radio-played-keys") || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch { return []; }
  });
  const radioTrack = radioPlaylist[radioTrackIndex] || { artist: "FOR THE CULTURE RADIO", title: "DJ NEBULAE TEST ROTATION", show: "FOR THE CULTURE LIVE", host: "DJ NEBULAE", src: "" };
  const radioRecentlyPlayed = radioHistory.length ? radioHistory : [
    { artist: "FOR THE CULTURE RADIO", title: "Waiting for the first track…" },
  ];

  const updateRadioMediaSession = (track = radioTrack) => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !("MediaMetadata" in window)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: String(track?.title || "FOR THE CULTURE RADIO"),
        artist: String(track?.artist || "FOR THE CULTURE RADIO"),
        album: String(currentProgramme.title || "FOR THE CULTURE RADIO"),
        artwork: [
          { src: new URL(cultureArt, window.location.href).href, sizes: "512x512", type: "image/webp" },
        ],
      });
      navigator.mediaSession.playbackState = radioPlaying ? "playing" : "paused";
    } catch {
      // Media Session is progressive enhancement; native audio remains the source of truth.
    }
  };
  const [radioClock, setRadioClock] = useState(() => new Date());
  const currentProgramme = getCurrentProgramme(radioClock);
  const nextProgramme = getNextProgramme(radioClock);
  const todayRadioSchedule = getTodaySchedule(radioClock);
  const currentHost = getHost(currentProgramme.hostId);
  const stationClockLabel = new Intl.DateTimeFormat("en-US", { timeZone: RADIO_TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(radioClock);

  useEffect(() => { const timer = window.setInterval(() => setRadioClock(new Date()), 30000); return () => window.clearInterval(timer); }, []);

  const playRadioTrack = async (index: number, fromUser = false) => {
    const audio = radioAudioRef.current;
    const track = radioPlaylist[index];
    if (!audio || !track?.src) { setRadioPlayerOpen(true); return false; }

    if (fromUser) {
      radioPausedByUserRef.current = false;
      setRadioPausedByUser(false);
    }

    setRadioTrackIndex(index);
    try { localStorage.setItem("gfs-radio-track-index", String(index)); } catch {}

    const base = import.meta.env.BASE_URL || "/";
    const src = `${base.replace(/\/$/, "")}/${String(track.src).replace(/^\//, "")}`;
    audio.volume = radioVolume;
    if (track.poster) audio.dataset.poster = track.poster;

    // Reload the audio element only when changing to a different track.
    // A normal PLAY after an interruption must keep the currentTime.
    const sameTrackLoaded = radioLoadedSrcRef.current === src && audio.src === new URL(src, window.location.href).href;
    if (!sameTrackLoaded) {
      radioSwitchingTrackRef.current = true;
      audio.pause();
      audio.src = src;
      radioLoadedSrcRef.current = src;
      audio.preload = "auto";
      try { audio.currentTime = 0; } catch {}
      audio.load();
      radioSwitchingTrackRef.current = false;
    }

    try {
      await audio.play();
      setRadioPlaying(true);
      setRadioStreamReady(true);
      setRadioPlayerOpen(true);
      updateRadioMediaSession(track);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
      return true;
    } catch (error) {
      console.info("FOR THE CULTURE RADIO playback was blocked until the browser receives a user gesture.", error);
      setRadioPlayerOpen(true);
      return false;
    }
  };

  const startRadio = async (fromUser = false) => {
    if (!fromUser && radioPausedByUserRef.current) return false;

    if (radioPlaylist.length) return playRadioTrack(radioTrackIndex, fromUser);

    const audio = radioAudioRef.current;
    if (!audio || !radioStreamUrl) { setRadioPlayerOpen(true); return false; }

    if (fromUser) {
      radioPausedByUserRef.current = false;
      setRadioPausedByUser(false);
    }

    audio.volume = radioVolume;

    // Preserve the current position of a live stream when resuming.
    if (radioLoadedSrcRef.current !== radioStreamUrl || !audio.src) {
      radioSwitchingTrackRef.current = true;
      audio.src = radioStreamUrl;
      radioLoadedSrcRef.current = radioStreamUrl;
      audio.preload = "auto";
      radioSwitchingTrackRef.current = false;
    }

    try {
      await audio.play();
      setRadioPlaying(true);
      setRadioStreamReady(true);
      setRadioPlayerOpen(true);
      updateRadioMediaSession();
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
      return true;
    } catch (error) {
      console.info("FOR THE CULTURE RADIO autoplay was blocked until the browser receives a user gesture.", error);
      setRadioPlayerOpen(true);
      return false;
    }
  };

  const pauseRadio = () => {
    radioPausedByUserRef.current = true;
    if (radioResumeTimerRef.current !== null) {
      window.clearTimeout(radioResumeTimerRef.current);
      radioResumeTimerRef.current = null;
    }
    if (radioRecoveryTimerRef.current) {
      window.clearTimeout(radioRecoveryTimerRef.current);
      radioRecoveryTimerRef.current = null;
    }
    const audio = radioAudioRef.current;
    audio?.pause();
    setRadioPlaying(false);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    // Keep the station paused until the listener explicitly presses PLAY.
    setRadioPausedByUser(true);
  };

  const toggleRadio = () => {
    if (radioPlaying) pauseRadio();
    else startRadio(true);
  };

  // FOR THE CULTURE is the single public destination for both the platform
  // and its live radio layer. A navigation click is a real user gesture, so
  // mobile browsers can honor the radio play request when policy allows it.
  const enterForTheCulture = (event?: React.MouseEvent<HTMLAnchorElement>) => {
    event?.preventDefault();
    setMenuOpen(false);
    setRadioPlayerOpen(true);

    try {
      window.history.pushState(null, "", "#culture");
    } catch {
      window.location.hash = "culture";
    }

    requestAnimationFrame(() => {
      document.querySelector("#culture")?.scrollIntoView({ behavior: "smooth", block: "start" });
      void startRadio(true);
    });
  };

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL || "./";
    const configUrl = `${base.replace(/\/$/, "")}/radio-config.json`;
    fetch(configUrl, { cache: "force-cache" })
      .then((response) => response.ok ? response.json() : null)
      .then((config) => {
        if (cancelled || !config) return;
        if (typeof config.streamUrl === "string") setRadioStreamUrl(config.streamUrl.trim());
      })
      .catch(() => { /* Environment configuration remains the fallback. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL || "./";
    const playlistUrl = `${base.replace(/\/$/, "")}/radio-playlist.json`;

    async function loadPlaylist(attempt = 0): Promise<void> {
      try {
        const response = await fetch(playlistUrl, { cache: "no-cache" });
        if (!response.ok) throw new Error(`Playlist HTTP ${response.status}`);
        const playlist = await response.json();
        if (cancelled || !Array.isArray(playlist?.tracks)) throw new Error("Invalid radio playlist");
        const tracks = playlist.tracks.filter((track: any) => typeof track?.src === "string" && track.src);
        if (!tracks.length) throw new Error("Radio playlist contains no playable tracks");

        let restoredIndex = 0;
        try {
          const storedIndex = Number(localStorage.getItem("gfs-radio-track-index") || "0");
          if (Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < tracks.length) {
            restoredIndex = storedIndex;
          }
        } catch {}
        setRadioPlaylist(tracks);
        setRadioTrackIndex(restoredIndex);
        try { localStorage.setItem("gfs-radio-track-index", String(restoredIndex)); } catch {}
      } catch (error) {
        if (cancelled || attempt >= 2) {
          console.info("FOR THE CULTURE RADIO playlist could not be loaded.", error);
          return;
        }
        window.setTimeout(() => loadPlaylist(attempt + 1), 600 * (attempt + 1));
      }
    }

    loadPlaylist();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash !== "#culture" && hash !== "#radio") return;

    // Keep the old #radio deep link working, but make #culture the single
    // canonical destination for the FOR THE CULTURE ecosystem.
    if (hash === "#radio") {
      try {
        window.history.replaceState(null, "", "#culture");
      } catch {
        window.location.hash = "culture";
      }
    }

    const timer = window.setTimeout(() => {
      document.querySelector("#culture")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setRadioPlayerOpen(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gfs-radio-history") || "[]");
      if (Array.isArray(stored)) setRadioHistory(stored.slice(0, 8));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("gfs-radio-played-keys", JSON.stringify(radioPlayedKeys.slice(-200))); } catch {}
  }, [radioPlayedKeys]);

  useEffect(() => {
    const audio = radioAudioRef.current;
    if (!audio) return;
    audio.volume = radioVolume;
  }, [radioVolume]);

  useEffect(() => {
    updateRadioMediaSession(radioTrack);
  }, [radioTrackIndex, radioTrack.artist, radioTrack.title, currentProgramme.id]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const mediaSession = navigator.mediaSession;
    const setAction = (action: MediaSessionAction, handler: () => void) => {
      try { mediaSession.setActionHandler(action, handler); } catch {}
    };
    setAction("play", () => { void startRadio(true); });
    setAction("pause", pauseRadio);
    setAction("nexttrack", () => advanceRadioTrack());
    return () => {
      for (const action of ["play", "pause", "nexttrack"] as MediaSessionAction[]) {
        try { mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, [radioTrackIndex, radioPlaylist.length, radioPausedByUser, radioVolume]);

  useEffect(() => {
    const audio = radioAudioRef.current;
    if (!audio) return;

    audio.preload = "metadata";
    audio.setAttribute("playsinline", "true");

    let bufferRecoveryTimer: number | null = null;

    const clearBufferRecovery = () => {
      if (bufferRecoveryTimer !== null) {
        window.clearTimeout(bufferRecoveryTimer);
        bufferRecoveryTimer = null;
      }
    };

    const clearResumeTimer = () => {
      if (radioResumeTimerRef.current !== null) {
        window.clearTimeout(radioResumeTimerRef.current);
        radioResumeTimerRef.current = null;
      }
    };

    const scheduleResume = (delay = 500) => {
      if (radioPausedByUserRef.current || !audio.src || radioResumeTimerRef.current !== null) return;

      radioResumeTimerRef.current = window.setTimeout(async () => {
        radioResumeTimerRef.current = null;
        if (radioPausedByUserRef.current || !audio.src || !audio.paused) return;

        try {
          await audio.play();
          setRadioPlaying(true);
          setRadioStreamReady(true);
          updateRadioMediaSession();
        } catch {
          // A phone call, car-system interruption, or OS audio handoff can take
          // a moment to release the audio session. Retry without changing tracks.
          if (!radioPausedByUserRef.current) scheduleResume(1500);
        }
      }, delay);
    };

    const scheduleBufferRecovery = () => {
      if (!radioPlaylist.length || radioPausedByUserRef.current || bufferRecoveryTimer !== null) return;
      bufferRecoveryTimer = window.setTimeout(() => {
        bufferRecoveryTimer = null;
        if (!radioPausedByUserRef.current && audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
          scheduleResume(0);
        }
      }, 15000);
    };

    const onCanPlay = () => {
      clearBufferRecovery();
      setRadioStreamReady(true);
    };

    const onError = () => {
      clearBufferRecovery();
      setRadioStreamReady(false);
      if (radioPausedByUserRef.current || !radioPlaylist.length || radioRecoveryTimerRef.current) return;

      // First try to recover the current track. Only move to another track if
      // the current media source is genuinely unusable.
      if (audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        radioRecoveryTimerRef.current = window.setTimeout(() => {
          radioRecoveryTimerRef.current = null;
          advanceRadioTrack();
        }, 700);
      } else {
        scheduleResume(700);
      }
    };

    const onPause = () => {
      if (radioPausedByUserRef.current || radioSwitchingTrackRef.current || audio.ended) return;
      setRadioPlaying(false);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
      // The listener did not press PAUSE. Treat this as an external interruption
      // and resume the same song rather than starting another track.
      scheduleResume(500);
    };

    const onPlay = () => {
      clearResumeTimer();
      setRadioPlaying(true);
      setRadioStreamReady(true);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
      updateRadioMediaSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !radioPausedByUserRef.current && audio.paused) {
        scheduleResume(150);
      }
    };

    const onPageShow = () => {
      if (!radioPausedByUserRef.current && audio.paused) scheduleResume(150);
    };

    const onFocus = () => {
      if (!radioPausedByUserRef.current && audio.paused) scheduleResume(150);
    };

    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("canplaythrough", onCanPlay);
    audio.addEventListener("playing", onCanPlay);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("stalled", scheduleBufferRecovery);
    audio.addEventListener("waiting", scheduleBufferRecovery);
    audio.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);

    return () => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("canplaythrough", onCanPlay);
      audio.removeEventListener("playing", onCanPlay);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("stalled", scheduleBufferRecovery);
      audio.removeEventListener("waiting", scheduleBufferRecovery);
      audio.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      clearBufferRecovery();
      clearResumeTimer();
      if (radioRecoveryTimerRef.current) window.clearTimeout(radioRecoveryTimerRef.current);
      radioRecoveryTimerRef.current = null;
    };
  }, [radioPlaylist.length, radioTrackIndex]);

  const advanceRadioTrack = () => {
    if (!radioPlaylist.length) return;

    const current = radioTrack;
    const currentKey = current.src || `${current.artist}-${current.title}`;
    const historyEntry = { artist: current.artist, title: current.title };
    const nextHistory = [
      historyEntry,
      ...radioHistory.filter((item) => `${item.artist}-${item.title}` !== `${historyEntry.artist}-${historyEntry.title}`)
    ].slice(0, 8);
    setRadioHistory(nextHistory);
    try { localStorage.setItem("gfs-radio-history", JSON.stringify(nextHistory)); } catch {}

    // Smart shuffle:
    // 1) never immediately repeat the same track;
    // 2) use unplayed tracks before replaying the library;
    // 3) avoid the most recently heard artist where possible;
    // 4) add a little randomness so the sequence cannot be predicted.
    const artistKey = (track: any) => String(track?.artist || "").toLowerCase().trim();
    let played = [...radioPlayedKeys, currentKey].filter(Boolean);
    let candidates = radioPlaylist
      .map((track, index) => ({ track, index, key: track.src || `${track.artist}-${track.title}` }))
      .filter(({ key }) => key !== currentKey && !played.includes(key));

    if (!candidates.length) {
      // A full-library pass is complete. Start a new pass, but keep the current
      // track excluded so the same song cannot repeat immediately.
      played = [currentKey];
      setRadioPlayedKeys([currentKey]);
      candidates = radioPlaylist
        .map((track, index) => ({ track, index, key: track.src || `${track.artist}-${track.title}` }))
        .filter(({ key }) => key !== currentKey);
    }

    const recentArtists = new Set(
      [current, ...radioHistory.slice(0, 2)]
        .map(artistKey)
        .filter(Boolean)
    );
    const differentArtist = candidates.filter(({ track }) => !recentArtists.has(artistKey(track)));
    const pool = differentArtist.length ? differentArtist : candidates;
    const next = pool[Math.floor(Math.random() * pool.length)];

    setRadioPlayedKeys([...played, next.key].slice(-200));
    playRadioTrack(next.index, false);
  };

  useEffect(() => {
    if ((!radioStreamUrl && !radioPlaylist.length) || radioPausedByUser) return;
    const tryStart = () => { startRadio(false); };
    tryStart();
    const onFirstGesture = () => {
      if (!radioPausedByUser && !radioPlaying) startRadio(false);
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, [radioStreamUrl, radioPlaylist, radioPausedByUser]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function loadCultureStories(showLoading = false) {
      if (showLoading) setCultureFeedStatus("loading");
      const base = import.meta.env.BASE_URL || "./";
      const staticEndpoint = `${base.replace(/\/$/, "")}/editorial-feed.json`;
      const endpoints = [staticEndpoint, "/api/editorial-feed?limit=12"];
      let validEmptyFeedSeen = false;

      const results = await Promise.all(endpoints.map(async (endpoint) => {
        try {
          const response = await fetch(endpoint, {
            headers: { Accept: "application/json" },
            cache: "default",
          });
          if (!response.ok) return [];
          const data = await response.json();
          if (!Array.isArray(data.stories)) return [];
          if (data.stories.length === 0) validEmptyFeedSeen = true;
          return data.stories;
        } catch (error) {
          console.warn("FOR THE CULTURE editorial feed endpoint unavailable:", endpoint, error);
          return [];
        }
      }));

      const collectedStories = results.flat();
      const mergedStories = Array.from(
        new Map(
          collectedStories.map((story: any, index: number) => [
            story?.source_url || story?.id || `story-${index}`,
            story,
          ])
        ).values()
      )
        .sort((a: any, b: any) => {
          const aTime = Date.parse(a?.published_at || a?.source_published_at || "") || 0;
          const bTime = Date.parse(b?.published_at || b?.source_published_at || "") || 0;
          return bTime - aTime;
        })
        .slice(0, 12);

      if (!cancelled && mergedStories.length) {
        setCultureStories(mergedStories);
        setCultureFeedStatus("ready");
        return;
      }

      if (!cancelled) setCultureFeedStatus(validEmptyFeedSeen ? "empty" : "error");
    }

    const refresh = () => {
      if (document.visibilityState === "visible") loadCultureStories(false);
    };

    loadCultureStories(true);
    timer = setInterval(refresh, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    const sections = cultureTabs.map(([, , href]) => document.querySelector(href)).filter(Boolean) as Element[];
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const match = cultureTabs.find(([, , href]) => document.querySelector(href) === visible.target);
      if (match) setCultureActiveTab(match[0]);
    }, { rootMargin: "-25% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [cultureStories]);

  useEffect(() => {
    if (!cultureReaderStory) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCultureStory();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cultureReaderStory]);

  const [artistSubmission, setArtistSubmission] = useState({
    artistName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    genre: "",
    songTitle: "",
    releaseDate: "",
    socialLinks: "",
    purpose: "both",
    bio: "",
    songDescription: "",
    songUrl: "",
  });
  const [artistAudio, setArtistAudio] = useState<File | null>(null);
  const [artistArtwork, setArtistArtwork] = useState<File | null>(null);
  const [artistPortalOpen, setArtistPortalOpen] = useState(false);
  const [artistSubmitState, setArtistSubmitState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [artistSubmitMessage, setArtistSubmitMessage] = useState("");

  const encodeSmallFile = (file: File | null, maxBytes: number) =>
    new Promise<{ name: string; type: string; data: string } | null>((resolve, reject) => {
      if (!file) return resolve(null);
      if (file.size > maxBytes) return reject(new Error(`${file.name} is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB direct-upload limit. Please use the song link field for larger files.`));
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: String(reader.result).split(",")[1] || "",
      });
      reader.onerror = () => reject(new Error(`Could not read ${file.name}. Please try again.`));
      reader.readAsDataURL(file);
    });

  const submitArtistMusic = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!artistSubmission.artistName || !artistSubmission.email || !artistSubmission.songTitle || (!artistAudio && !artistSubmission.songUrl)) {
      setArtistSubmitState("error");
      setArtistSubmitMessage("Please provide your artist name, email, song title, and either an audio upload or a streaming/download link.");
      return;
    }

    setArtistSubmitState("sending");
    setArtistSubmitMessage("");
    try {
      const [audio, artwork] = await Promise.all([
        encodeSmallFile(artistAudio, 2 * 1024 * 1024),
        encodeSmallFile(artistArtwork, 700 * 1024),
      ]);

      const response = await fetch("/api/artist-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...artistSubmission,
          audio,
          artwork,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Submission could not be sent.");
      setArtistSubmitState("success");
      setArtistSubmitMessage("Submission received. The FOR THE CULTURE music/editorial team will review it for radio and/or editorial consideration.");
      setArtistSubmission({ artistName: "", email: "", phone: "", country: "", city: "", genre: "", songTitle: "", releaseDate: "", socialLinks: "", purpose: "both", bio: "", songDescription: "", songUrl: "" });
      setArtistAudio(null);
      setArtistArtwork(null);
      const form = document.getElementById("culture-artist-submission-form") as HTMLFormElement | null;
      form?.reset();
    } catch (error) {
      setArtistSubmitState("error");
      setArtistSubmitMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  };

  const [booking, setBooking] = useState({
    service: "The Fire Session",
    date: "",
    time: "",
    name: "",
    phone: "",
    email: "",
    notes: "",
    payment: "deposit",
  });

  const bookingServices = [
    { title: "The Fire Session", price: 130000, unit: "6 hours" },
    { title: "Studio Hour", price: 25000, unit: "per hour" },
    { title: "Professional Mix", price: 75000, unit: "per song" },
    { title: "Mastering", price: 35000, unit: "per song" },
    { title: "Mix + Master", price: 100000, unit: "per song" },
    { title: "Production Session", price: 30000, unit: "per hour" },
    { title: "Artist Photoshoot", price: 75000, unit: "starting price" },
    { title: "Cover Art Shoot", price: 50000, unit: "starting price" },
    { title: "Event Photography", price: 100000, unit: "starting price" },
    { title: "Music Video", price: 250000, unit: "starting price" },
    { title: "Performance Video", price: 150000, unit: "starting price" },
    { title: "Visualizer", price: 100000, unit: "starting price" },
    { title: "Lyric Video", price: 75000, unit: "starting price" },
    { title: "Social Content Package", price: 100000, unit: "starting price" },
  ];

  const selectedService = bookingServices.find((service) => service.title === booking.service) || bookingServices[0];
  const amountDue = booking.payment === "deposit" ? Math.round(selectedService.price * 0.5) : selectedService.price;
  const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
  const editorialStories = Array.isArray(cultureStories) ? cultureStories : [];
  const storyAt = (index: number) => editorialStories[index];
  const storyKey = (story: any) => story?.source_url || story?.id || story?.headline || story?.source_title;
  const storiesBy = (term: RegExp) => editorialStories.filter((story: any) => term.test(`${story.category || ""} ${story.headline || ""} ${story.dek || ""}`));
  const heroStory = storyAt(0);
  const heroKey = heroStory ? storyKey(heroStory) : null;
  // The hero already owns the newest story. Every lower module explicitly
  // excludes content already used above, so one source item can only appear
  // once on the FOR THE CULTURE landing page.
  const latestStories = editorialStories.slice(1, 4);
  const latestKeys = new Set(latestStories.map(storyKey));
  const heroAndLatestKeys = new Set([heroKey, ...latestKeys].filter(Boolean));
  const musicStories = storiesBy(/music|artist|album|single|afrobeats|hip-hop|ep|song/i).filter((story: any) => !heroAndLatestKeys.has(storyKey(story)));
  const cultureStoriesOnly = storiesBy(/culture|art|style|film|visual|creative|entertainment|media/i).filter((story: any) => !heroAndLatestKeys.has(storyKey(story)));
  // NEW MUSIC must contain only stories that have NOT already appeared in
  // the hero or latest-stories modules. If there are no distinct music stories,
  // keep the panel empty rather than repeating an article the visitor has seen.
  const deskMusicStories = musicStories.slice(0, 2);
  const usedDeskKeys = new Set([heroKey, ...latestKeys, ...deskMusicStories.map(storyKey)].filter(Boolean));
  const deskCultureStory = cultureStoriesOnly.find((story: any) => !usedDeskKeys.has(storyKey(story))) || editorialStories.find((story: any) => !usedDeskKeys.has(storyKey(story)));
  const usedKeys = new Set([...usedDeskKeys, ...(deskCultureStory ? [storyKey(deskCultureStory)] : [])]);
  const moreStories = editorialStories.filter((story: any) => !usedKeys.has(storyKey(story))).slice(0, 3);
  const hasMoreStories = moreStories.length > 0;
  const storyUrl = (story: any) => story?.source_url || "#";
  const storyImage = (story: any) => story?.image_url || story?.source_image_url || "";
  const storyTitle = (story: any) => story?.headline || story?.title || "Latest from the culture";
  const storyDek = (story: any) => story?.dek || story?.source_excerpt || "The FOR THE CULTURE editorial desk is following the story.";
  const storyDate = (story: any) => story?.published_at ? new Date(story.published_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "Latest";
  const handleStoryImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.dataset.ftcFallback === "true") return;
    image.dataset.ftcFallback = "true";
    image.src = cultureArt;
    image.classList.add("culture-image-fallback");
  };
  const openCultureStory = (story: any) => {
    setCultureReaderStory(story || null);
    if (story) {
      document.body.style.overflow = "hidden";
    }
  };
  const closeCultureStory = () => {
    setCultureReaderStory(null);
    document.body.style.overflow = "";
  };
  const storyLinkProps = (story: any) => ({
    href: "#culture-story-reader",
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      openCultureStory(story);
    },
  });
  const cultureTabs = [
    ["home", "HOME", "#culture-home"], ["stories", "STORIES", "#culture-stories"],
    ["discover", "DISCOVER", "#culture-discover"]
  ] as const;

  const storeProducts = [
    { id: "at2020", name: "Audio-Technica AT2020", category: "Microphones", market: 150000, price: 187500, stock: 5, badge: "BEST SELLER", desc: "Cardioid condenser microphone for vocals, instruments and home studios.", query: "Audio-Technica AT2020 microphone" },
    { id: "at2035", name: "Audio-Technica AT2035", category: "Microphones", market: 285000, price: 356250, stock: 3, badge: "PRO", desc: "Large-diaphragm condenser with detailed, low-noise vocal capture.", query: "Audio-Technica AT2035 microphone" },
    { id: "at2050", name: "Audio-Technica AT2050", category: "Microphones", market: 385000, price: 481250, stock: 2, badge: "PRO", desc: "Multi-pattern condenser for flexible professional recording.", query: "Audio-Technica AT2050 microphone" },
    { id: "at2020usb", name: "Audio-Technica AT2020USB+", category: "Microphones", market: 195000, price: 243750, stock: 3, badge: "CREATOR", desc: "USB condenser microphone with direct headphone monitoring.", query: "Audio-Technica AT2020USB+ microphone" },
    { id: "se-x1a", name: "sE Electronics X1 A", category: "Microphones", market: 146000, price: 182500, stock: 3, badge: "VALUE", desc: "Versatile large-diaphragm condenser for vocals and instruments.", query: "sE Electronics X1 A microphone" },
    { id: "uad-sd1", name: "UAD SD-1", category: "Microphones", market: 457500, price: 571875, stock: 1, badge: "ELITE", desc: "Dynamic microphone designed for vocals, broadcast and close miking.", query: "Universal Audio SD-1 microphone" },
    { id: "behr-c1", name: "Behringer C-1", category: "Microphones", market: 78500, price: 98125, stock: 5, badge: "STARTER", desc: "Affordable large-diaphragm condenser for first studio setups.", query: "Behringer C-1 microphone" },
    { id: "m20x", name: "Audio-Technica ATH-M20x", category: "Headphones", market: 85000, price: 106250, stock: 8, badge: "BEST SELLER", desc: "Closed-back monitoring headphones for recording and mixing.", query: "Audio-Technica ATH-M20x headphones" },
    { id: "m30x", name: "Audio-Technica ATH-M30x", category: "Headphones", market: 125000, price: 156250, stock: 5, badge: "VALUE", desc: "Professional monitoring headphones with strong isolation.", query: "Audio-Technica ATH-M30x headphones" },
    { id: "m40x", name: "Audio-Technica ATH-M40x", category: "Headphones", market: 180000, price: 225000, stock: 5, badge: "PRO", desc: "Accurate studio monitoring with rotating earcups.", query: "Audio-Technica ATH-M40x headphones" },
    { id: "m50x", name: "Audio-Technica ATH-M50x", category: "Headphones", market: 230000, price: 287500, stock: 5, badge: "BEST SELLER", desc: "Industry-loved closed-back headphones for detailed monitoring.", query: "Audio-Technica ATH-M50x headphones" },
    { id: "m70x", name: "Audio-Technica ATH-M70x", category: "Headphones", market: 450000, price: 562500, stock: 2, badge: "ELITE", desc: "High-resolution professional monitor headphones.", query: "Audio-Technica ATH-M70x headphones" },
    { id: "hd200", name: "Sennheiser HD 200 PRO", category: "Headphones", market: 115000, price: 143750, stock: 5, badge: "VALUE", desc: "Closed-back studio headphones for tracking and editing.", query: "Sennheiser HD 200 PRO headphones" },
    { id: "hd280", name: "Sennheiser HD 280 PRO", category: "Headphones", market: 155000, price: 193750, stock: 4, badge: "PRO", desc: "Reliable isolation and accurate monitoring for studio work.", query: "Sennheiser HD 280 PRO headphones" },
    { id: "hd300", name: "Sennheiser HD 300 PRO", category: "Headphones", market: 285000, price: 356250, stock: 2, badge: "PRO", desc: "High-isolation professional headphones for demanding sessions.", query: "Sennheiser HD 300 PRO headphones" },
    { id: "hc2000", name: "Behringer HC 2000", category: "Headphones", market: 35500, price: 44375, stock: 10, badge: "STARTER", desc: "Budget-friendly monitoring headphones for tracking.", query: "Behringer HC 2000 headphones" },
    { id: "umc204", name: "Behringer UMC204HD", category: "Audio Interfaces", market: 125500, price: 156875, stock: 5, badge: "STARTER", desc: "2-in/4-out USB interface with MIDAS-designed preamps.", query: "Behringer UMC204HD audio interface" },
    { id: "minifuse1", name: "Arturia MiniFuse 1", category: "Audio Interfaces", market: 152650, price: 190813, stock: 4, badge: "CREATOR", desc: "Compact one-channel USB interface for mobile and home studios.", query: "Arturia MiniFuse 1 audio interface" },
    { id: "volt1", name: "Universal Audio Volt 1", category: "Audio Interfaces", market: 205000, price: 256250, stock: 3, badge: "CREATOR", desc: "USB recording interface with vintage mic preamp mode.", query: "Universal Audio Volt 1 audio interface" },
    { id: "id4", name: "Audient iD4 MKII", category: "Audio Interfaces", market: 230000, price: 287500, stock: 3, badge: "PRO", desc: "Premium compact interface with Audient mic preamp.", query: "Audient iD4 MKII audio interface" },
    { id: "volt2", name: "Universal Audio Volt 2", category: "Audio Interfaces", market: 275000, price: 343750, stock: 3, badge: "BEST SELLER", desc: "2-in/2-out USB interface with vintage preamp mode.", query: "Universal Audio Volt 2 audio interface" },
    { id: "ssl2", name: "Solid State Logic SSL 2", category: "Audio Interfaces", market: 281500, price: 351875, stock: 3, badge: "PRO", desc: "Professional 2-in/2-out interface with SSL Legacy 4K mode.", query: "Solid State Logic SSL 2 audio interface" },
    { id: "id14", name: "Audient iD14 MKII", category: "Audio Interfaces", market: 345000, price: 431250, stock: 2, badge: "PRO", desc: "Expanded I/O and premium Audient conversion for serious creators.", query: "Audient iD14 MKII audio interface" },
    { id: "ssl2plus", name: "Solid State Logic SSL 2+", category: "Audio Interfaces", market: 386500, price: 483125, stock: 2, badge: "PRO", desc: "Expanded SSL interface with extra outputs and MIDI.", query: "Solid State Logic SSL 2 Plus audio interface" },
    { id: "iloud", name: "IK Multimedia iLoud Micro Monitor Pair", category: "Studio Monitors", market: 450000, price: 562500, stock: 2, badge: "BEST SELLER", desc: "Ultra-compact stereo monitors for small production spaces.", query: "IK Multimedia iLoud Micro Monitor pair" },
    { id: "kali-lp6", name: "Kali Audio LP-6 V2 Pair", category: "Studio Monitors", market: 548625, price: 685781, stock: 2, badge: "PRO", desc: "6.5-inch nearfield monitors designed for accurate mixing.", query: "Kali Audio LP-6 V2 studio monitors" },
    { id: "jbl305", name: "JBL 305P MkII Pair", category: "Studio Monitors", market: 650000, price: 812500, stock: 2, badge: "PRO", desc: "5-inch powered monitors with wide sweet spot.", query: "JBL 305P MkII studio monitors" },
    { id: "hs5", name: "Yamaha HS5 Pair", category: "Studio Monitors", market: 750000, price: 937500, stock: 2, badge: "PRO", desc: "Compact nearfields built for dependable mix translation.", query: "Yamaha HS5 studio monitors pair" },
    { id: "krk5", name: "KRK Rokit 5 G4 Pair", category: "Studio Monitors", market: 800000, price: 1000000, stock: 2, badge: "PRO", desc: "5-inch powered monitors with DSP-driven voicing.", query: "KRK Rokit 5 G4 studio monitors pair" },
    { id: "genelec8010", name: "Genelec 8010A Pair", category: "Studio Monitors", market: 950000, price: 1187500, stock: 1, badge: "ELITE", desc: "Compact professional monitors with exceptional imaging.", query: "Genelec 8010A studio monitors pair" },
    { id: "minilab3", name: "Arturia MiniLab 3", category: "MIDI & Production", market: 220000, price: 275000, stock: 4, badge: "BEST SELLER", desc: "Compact MIDI controller with pads, knobs and creative controls.", query: "Arturia MiniLab 3 MIDI controller" },
    { id: "mpkmini", name: "Akai MPK Mini MK3", category: "MIDI & Production", market: 220000, price: 275000, stock: 4, badge: "BEST SELLER", desc: "Portable keyboard and pad controller for producers.", query: "Akai MPK Mini MK3 MIDI controller" },
    { id: "keylab49", name: "Arturia KeyLab Essential 49 MK3", category: "MIDI & Production", market: 350000, price: 437500, stock: 2, badge: "PRO", desc: "49-key controller for hands-on production and composition.", query: "Arturia KeyLab Essential 49 MK3" },
    { id: "maschine", name: "Native Instruments Maschine Mikro MK3", category: "MIDI & Production", market: 350000, price: 437500, stock: 2, badge: "PRO", desc: "Pad-based production controller for beats and sampling.", query: "Native Instruments Maschine Mikro MK3" },
    { id: "tr8s", name: "Roland TR-8S", category: "Drum Machines", market: 1000000, price: 1250000, stock: 1, badge: "ELITE", desc: "Performance rhythm machine for modern and classic drum sounds.", query: "Roland TR-8S drum machine" },
    { id: "reflexion", name: "sE Reflexion Filter X", category: "Studio Accessories", market: 140000, price: 175000, stock: 3, badge: "VOCAL", desc: "Portable acoustic reflection filter for cleaner vocal recording.", query: "sE Reflexion Filter X" },
    { id: "popfilter", name: "Professional Metal Pop Filter", category: "Studio Accessories", market: 25000, price: 31250, stock: 10, badge: "ESSENTIAL", desc: "Helps control plosives and protects your vocal microphone.", query: "studio metal pop filter microphone" },
    { id: "micstand", name: "Heavy-Duty Boom Mic Stand", category: "Studio Accessories", market: 50000, price: 62500, stock: 8, badge: "ESSENTIAL", desc: "Stable boom stand for vocal and instrument microphones.", query: "heavy duty boom microphone stand" },
    { id: "xlr3", name: "Premium XLR Cable 3m", category: "Studio Accessories", market: 20000, price: 25000, stock: 15, badge: "ESSENTIAL", desc: "Balanced XLR connection for microphones and studio gear.", query: "premium XLR microphone cable 3m" },
    { id: "isopad", name: "Monitor Isolation Pads", category: "Studio Accessories", market: 35000, price: 43750, stock: 8, badge: "ESSENTIAL", desc: "Reduce vibration transfer between monitors and your desk.", query: "studio monitor isolation pads" },
    { id: "dibox", name: "Whirlwind IMP 2 DI Box", category: "Studio Accessories", market: 126500, price: 158125, stock: 3, badge: "PRO", desc: "Professional direct box for clean instrument connections.", query: "Whirlwind IMP 2 DI box" },
  ];
  const storeCategories = ["All", ...Array.from(new Set(storeProducts.map((p) => p.category)))];
  const [storeCategory, setStoreCategory] = useState("All");
  const [cart, setCart] = useState<Array<{ product: typeof storeProducts[number]; quantity: number }>>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [storeCheckoutOpen, setStoreCheckoutOpen] = useState(false);
  const [storeProcessing, setStoreProcessing] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState("");
  const [storeError, setStoreError] = useState("");
  const [storeCustomer, setStoreCustomer] = useState({ name: "", email: "", phone: "", address: "", city: "Abuja" });

  const filteredProducts = storeCategory === "All"
    ? storeProducts
    : storeProducts.filter((p) => p.category === storeCategory);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingHandling = cartSubtotal === 0 ? 0 : cartSubtotal >= 1000000 ? 45000 : cartSubtotal >= 500000 ? 30000 : cartSubtotal >= 200000 ? 18000 : 10000;
  const cartTotal = cartSubtotal + shippingHandling;

  const addToCart = (product: typeof storeProducts[number]) => {
    setStoreSuccess("");
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };
  const updateCartQuantity = (id: string, delta: number) => {
    setCart((current) => current.map((item) => item.product.id === id ? { ...item, quantity: Math.max(0, Math.min(item.quantity + delta, item.product.stock)) } : item).filter((item) => item.quantity > 0));
  };
  const productImage = (query: string) => `https://tse1.mm.bing.net/th?q=${encodeURIComponent(query + " product")}&w=700&h=700`;
  const checkoutStore = async () => {
    setStoreError("");
    if (!storeCustomer.name || !storeCustomer.email || !storeCustomer.phone || !storeCustomer.address) {
      setStoreError("Please complete your name, email, phone and delivery address.");
      return;
    }
    if (!cart.length || cartTotal <= 0) {
      setStoreError("Your cart is empty.");
      return;
    }

    setStoreProcessing(true);
    try {
      const publicKey = await getPaystackPublicKey();
      const PaystackPop = await loadPaystack();
      const reference = `GFS-SHOP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: publicKey,
        email: storeCustomer.email,
        amount: cartTotal * 100,
        currency: "NGN",
        reference,
        firstName: storeCustomer.name.trim().split(/\s+/)[0],
        phone: storeCustomer.phone,
        metadata: {
          custom_fields: [
            { display_name: "Order Type", variable_name: "order_type", value: "Galaxy Fire Studio Equipment Store" },
            { display_name: "Products", variable_name: "products", value: cart.map((i) => `${i.product.name} x${i.quantity}`).join(" | ") },
            { display_name: "Delivery City", variable_name: "delivery_city", value: storeCustomer.city },
            { display_name: "Delivery Address", variable_name: "delivery_address", value: storeCustomer.address },
          ],
        },
        onSuccess: async (transaction: { reference: string }) => {
          try {
            const response = await fetch("/api/verify-store-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference: transaction.reference, expectedAmount: cartTotal * 100, customer: storeCustomer, items: cart.map((i) => ({ id: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price })) }),
            });
            const result = await response.json();
            if (!response.ok || !result.verified) throw new Error(result.message || "Payment verification failed.");
            setStoreSuccess(`Payment confirmed. Your order reference is ${result.orderReference || transaction.reference}. We will contact you about delivery.`);
            setCart([]);
            setStoreCheckoutOpen(false);
          } catch (error) {
            console.error(error);
            setStoreError("Payment was completed, but verification is pending. Please keep your Paystack reference: " + transaction.reference);
          } finally { setStoreProcessing(false); }
        },
        onCancel: () => setStoreProcessing(false),
        onError: (error: any) => {
          console.error("Paystack store error:", error);
          setStoreProcessing(false);
          setStoreError(error?.message || "Paystack could not start the payment. Please try again.");
        },
      });
    } catch (error) {
      console.error("Paystack store launch error:", error);
      setStoreProcessing(false);
      setStoreError(error instanceof Error ? error.message : "Paystack could not load. Please try again.");
    }
  };

  const openBooking = (service?: string) => {
    setBookingSubmitted(false);
    if (service) setBooking((current) => ({ ...current, service }));
    setBookingOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeBooking = () => {
    setBookingOpen(false);
    document.body.style.overflow = "";
  };

  const updateBooking = (field: string, value: string) => {
    setBooking((current) => ({ ...current, [field]: value }));
  };

  const submitBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError("");

    // Check studio availability before opening Paystack.
    if (
      booking.service === "The Fire Session" ||
      booking.service === "Studio Hour" ||
      booking.service === "Production Session"
    ) {
      const durationHours = booking.service === "The Fire Session" ? 6 : 1;
      const startAt = new Date(`${booking.date}T${booking.time}`);
      const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);

      const formatTimestamp = (date: Date) => {
        const pad = (value: number) => String(value).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
      };

      try {
        const availabilityResponse = await fetch(
          "/api/check-availability",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              startAt: formatTimestamp(startAt),
              endAt: formatTimestamp(endAt),
            }),
          }
        );

        if (!availabilityResponse.ok) {
          const errorText = await availabilityResponse.text();
          console.error("Availability API error:", errorText);
          throw new Error("Could not check studio availability.");
        }

        const available = await availabilityResponse.json();

        if (available !== true) {
          setPaymentError(
            "Sorry, that time is already booked. Please choose another date or time."
          );
          return;
        }
      } catch (error) {
        // Availability is a scheduling aid, not the payment gateway.
        // If the optional Supabase availability check is temporarily unavailable,
        // do not prevent a customer from reaching Paystack. A confirmed payment
        // is still verified server-side before the booking is recorded.
        console.warn(
          "Availability check unavailable; continuing to Paystack:",
          error
        );
      }
    }

    setPaymentProcessing(true);

    try {
      const publicKey = await getPaystackPublicKey();
      const PaystackPop = await loadPaystack();
      const reference = `GFS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: publicKey,
        email: booking.email,
        amount: amountDue * 100,
        currency: "NGN",
        reference,
        firstName: booking.name.trim().split(/\s+/)[0],
        phone: booking.phone,
        metadata: {
          custom_fields: [
            { display_name: "Service", variable_name: "service", value: booking.service },
            { display_name: "Booking Date", variable_name: "booking_date", value: booking.date },
            { display_name: "Preferred Time", variable_name: "preferred_time", value: booking.time },
            { display_name: "Order Type", variable_name: "order_type", value: "Galaxy Fire Studio Booking" },
            { display_name: "Payment Type", variable_name: "payment_type", value: booking.payment === "deposit" ? "50% deposit" : "Full payment" },
            { display_name: "Notes", variable_name: "notes", value: booking.notes || "None" },
          ],
        },
        onSuccess: async (transaction: { reference: string }) => {
          try {
            const response = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reference: transaction.reference,
                expectedAmount: amountDue * 100,
                booking,
              }),
            });

            const result = await response.json();
            if (!response.ok || !result.verified) {
              throw new Error(result.message || "We could not verify the payment.");
            }

            setPaymentReference(transaction.reference);
            setPaymentProcessing(false);
            setBookingSubmitted(true);
          } catch (error) {
            console.error(error);
            setPaymentProcessing(false);
            setPaymentError("Payment was completed, but we could not verify it yet. Please contact us on WhatsApp with your payment reference: " + transaction.reference);
          }
        },
        onCancel: () => {
          setPaymentProcessing(false);
        },
        onError: (error: any) => {
          console.error("Paystack booking error:", error);
          setPaymentProcessing(false);
          setPaymentError(error?.message || "Paystack could not start the payment. Please try again.");
        },
      });
    } catch (error) {
      console.error("Paystack booking launch error:", error);
      setPaymentProcessing(false);
      setPaymentError(error instanceof Error ? error.message : "Paystack could not load. Please try again.");
    }
  };

  const services = [
    { number: "01", title: "RECORDING", text: "Professional recording sessions engineered to capture your performance with clarity, character and impact." },
    { number: "02", title: "MUSIC PRODUCTION", text: "Build your record from the first idea. Beat production, arrangement, sound selection and creative development." },
    { number: "03", title: "VOCAL PRODUCTION", text: "Performance direction, harmonies, ad-libs, vocal arrangement and detailed vocal preparation." },
    { number: "04", title: "MIXING", text: "Turn your recordings into a finished record with balance, depth, punch and clarity." },
    { number: "05", title: "MASTERING", text: "Give your finished music the final polish it needs before it reaches the world." },
    { number: "06", title: "RELEASE SUPPORT", text: "Get help preparing your music for release, including metadata, distribution guidance and release planning." },
  ];

  const visualImages = [
    visual01, visual02, visual03, visual04, visual05, visual06, visual07, visual08, visual09,
    visual10, visual11, visual12, visual13, visual14, visual15, visual16, visual17, visual18,
    visual19, visual20, visual21, visual22, visual23, visual24, visual25, visual26, visual27,
    visual28, visual29,
  ];
  // Keep the photography slider to three balanced slides while allowing new images to be added.
  const visualSlides = [0, 1, 2].map((slide) => {
    const start = slide * (visualImages.length === 29 ? 10 : 9);
    const end = slide === 2 && visualImages.length === 29 ? visualImages.length : start + 10;
    return visualImages.slice(start, end);
  });

  useEffect(() => {
    if (visualPaused) return;
    const timer = window.setInterval(() => {
      setVisualSlide((current) => (current + 1) % visualSlides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [visualPaused, visualSlides.length]);

  const beatArt = "/beats/galaxy-records-art.png";
  const fallbackBeats = [
    { id: "beat-01", title: "Crimson Motion", bpm: 110, key: "G♯ Minor", mode: "Minor", mood: "Dark / Cinematic", genre: "Galaxy Fire Original", preview: "/beats/beat_1_gsharp_minor_110.mp3" },
    { id: "beat-02", title: "Night Protocol", bpm: 110, key: "C♯ Minor", mode: "Minor", mood: "Moody / Driven", genre: "Galaxy Fire Original", preview: "/beats/beat_2_csharp_minor_110.mp3" },
    { id: "beat-03", title: "Golden Current", bpm: 97, key: "C Major", mode: "Major", mood: "Warm / Uplifting", genre: "Galaxy Fire Original", preview: "/beats/beat_3_c_major_97.mp3" },
    { id: "beat-04", title: "Midnight Pressure", bpm: 102, key: "A♯ Minor", mode: "Minor", mood: "Intense / Atmospheric", genre: "Galaxy Fire Original", preview: "/beats/beat_4_asharp_minor_102.mp3" },
    { id: "beat-05", title: "Velvet Heat", bpm: 100, key: "A Minor", mode: "Minor", mood: "Smooth / Emotional", genre: "Galaxy Fire Original", preview: "/beats/beat_5_a_minor_100.mp3" },
    { id: "beat-06", title: "Dark Frequency", bpm: 110, key: "D Minor", mode: "Minor", mood: "Heavy / Focused", genre: "Galaxy Fire Original", preview: "/beats/beat_6_d_minor_110.mp3" },
  ];
  type Beat = typeof fallbackBeats[number];
  const [beats, setBeats] = useState<Beat[]>(fallbackBeats);
  const [selectedBeat, setSelectedBeat] = useState<Beat>(fallbackBeats[0]);
  const [beatPlaying, setBeatPlaying] = useState(false);
  const [beatProgress, setBeatProgress] = useState(0);
  const [beatSearch, setBeatSearch] = useState("");
  const [beatFilter, setBeatFilter] = useState("ALL");
  const [beatDropdownOpen, setBeatDropdownOpen] = useState(false);
  const [vinylRotation, setVinylRotation] = useState(0);
  const [vinylState, setVinylState] = useState<"stopped" | "playing" | "slowing">("stopped");
  const beatAudioRef = useRef<HTMLAudioElement | null>(null);
  const vinylFrameRef = useRef<number | null>(null);
  const vinylLastFrameRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const [beatSoldMap, setBeatSoldMap] = useState<Record<string, boolean>>({});
  const [beatCheckoutOpen, setBeatCheckoutOpen] = useState(false);
  const [beatPurchaseProcessing, setBeatPurchaseProcessing] = useState(false);
  const [beatPurchaseError, setBeatPurchaseError] = useState("");
  const [beatPurchaseSuccess, setBeatPurchaseSuccess] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<"Basic" | "Premium" | "Unlimited" | "Exclusive">("Unlimited");
  const [beatCustomer, setBeatCustomer] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    let cancelled = false;
    fetch("/beats/beat-catalog.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Beat catalogue request failed: ${response.status}`);
        return response.json();
      })
      .then((catalog) => {
        if (cancelled || !Array.isArray(catalog?.beats) || !catalog.beats.length) return;
        const nextBeats = catalog.beats as Beat[];
        setBeats(nextBeats);
        setSelectedBeat((current) => nextBeats.find((beat) => beat.id === current.id) || nextBeats[0]);
      })
      .catch((error) => console.error("Automatic beat catalogue load failed; using built-in catalogue.", error));
    return () => { cancelled = true; };
  }, []);

  const licenseOptions = [
    { name: "Basic" as const, price: 20000, detail: "MP3 Lease" },
    { name: "Premium" as const, price: 40000, detail: "WAV Lease" },
    { name: "Unlimited" as const, price: 80000, detail: "Unlimited Use" },
    { name: "Exclusive" as const, price: 150000, detail: "Exclusive Rights" },
  ];

  const loadBeatAvailability = async () => {
    try {
      const response = await fetch("/api/beat-status");
      if (!response.ok) return;
      const result = await response.json();
      setBeatSoldMap(result.sold || {});
    } catch (error) {
      console.error("Beat availability check failed:", error);
    }
  };

  useEffect(() => {
    const section = document.getElementById("beats");
    if (!section || typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => loadBeatAvailability(), 1200);
      return () => window.clearTimeout(timer);
    }

    let loaded = false;
    const observer = new IntersectionObserver((entries) => {
      if (loaded || !entries.some((entry) => entry.isIntersecting)) return;
      loaded = true;
      observer.disconnect();
      loadBeatAvailability();
    }, { rootMargin: "500px 0px" });

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const openBeatCheckout = (license: typeof licenseOptions[number]) => {
    if (beatSoldMap[selectedBeat.id]) {
      setBeatPurchaseError("This beat has already been sold exclusively. You can still preview it, but it is no longer available for purchase.");
      return;
    }
    setSelectedLicense(license.name);
    setBeatPurchaseError("");
    setBeatPurchaseSuccess("");
    setBeatCheckoutOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeBeatCheckout = () => {
    if (beatPurchaseProcessing) return;
    setBeatCheckoutOpen(false);
    document.body.style.overflow = "";
  };

  const checkoutBeat = async () => {
    setBeatPurchaseError("");
    setBeatPurchaseSuccess("");
    if (!beatCustomer.name || !beatCustomer.email || !beatCustomer.phone) {
      setBeatPurchaseError("Please enter your name, email and phone number.");
      return;
    }
    if (beatSoldMap[selectedBeat.id]) {
      setBeatPurchaseError("This beat has already been sold exclusively and cannot be purchased.");
      return;
    }
    const license = licenseOptions.find((item) => item.name === selectedLicense)!;
    setBeatPurchaseProcessing(true);
    try {
      const publicKey = await getPaystackPublicKey();
      const PaystackPop = await loadPaystack();
      const reference = `GFS-BEAT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: publicKey,
        email: beatCustomer.email,
        amount: license.price * 100,
        currency: "NGN",
        reference,
        firstName: beatCustomer.name.trim().split(/\s+/)[0],
        phone: beatCustomer.phone,
        metadata: {
          custom_fields: [
            { display_name: "Order Type", variable_name: "order_type", value: "Galaxy Fire Beats Marketplace" },
            { display_name: "Beat", variable_name: "beat_id", value: selectedBeat.id },
            { display_name: "Beat Title", variable_name: "beat_title", value: selectedBeat.title },
            { display_name: "License", variable_name: "license", value: selectedLicense },
          ],
        },
        onSuccess: async (transaction: { reference: string }) => {
          try {
            const response = await fetch("/api/verify-beat-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reference: transaction.reference,
                expectedAmount: license.price * 100,
                beat: { id: selectedBeat.id, title: selectedBeat.title, bpm: selectedBeat.bpm, key: selectedBeat.key },
                license: selectedLicense,
                customer: beatCustomer,
              }),
            });
            const result = await response.json();
            if (!response.ok || !result.verified) throw new Error(result.message || "Payment verification failed.");
            if (result.exclusiveSold) {
              setBeatSoldMap((current) => ({ ...current, [selectedBeat.id]: true }));
            }
            setBeatPurchaseSuccess(`Payment confirmed. Your Galaxy Fire order reference is ${result.orderReference || transaction.reference}.`);
            setBeatPurchaseError("");
          } catch (error) {
            console.error(error);
            setBeatPurchaseError("Payment was completed, but verification is pending. Please keep your Paystack reference: " + transaction.reference);
          } finally {
            setBeatPurchaseProcessing(false);
          }
        },
        onCancel: () => setBeatPurchaseProcessing(false),
        onError: (error: any) => {
          console.error("Paystack beat error:", error);
          setBeatPurchaseProcessing(false);
          setBeatPurchaseError(error?.message || "Paystack could not start the payment. Please try again.");
        },
      });
    } catch (error) {
      console.error("Paystack beat launch error:", error);
      setBeatPurchaseProcessing(false);
      setBeatPurchaseError(error instanceof Error ? error.message : "Paystack could not load. Please try again.");
    }
  };

  const stopBeatPreview = (slow = true) => {
    const audio = beatAudioRef.current;
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    if (audio) {
      audio.pause();
      audio.currentTime = Math.min(audio.currentTime, 15);
    }
    setBeatPlaying(false);
    if (slow) {
      setVinylState("slowing");
      stopTimerRef.current = window.setTimeout(() => {
        setVinylState("stopped");
        setBeatProgress((current) => Math.min(current, 15));
      }, 1100);
    } else {
      setVinylState("stopped");
    }
  };

  const playBeat = async (beat: typeof beats[number]) => {
    const audio = beatAudioRef.current;
    if (!audio) return;
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    if (selectedBeat.id !== beat.id) {
      audio.pause();
      audio.currentTime = 0;
      setSelectedBeat(beat);
      setBeatProgress(0);
    } else if (beatPlaying) {
      stopBeatPreview(true);
      return;
    }
    audio.src = beat.preview;
    audio.currentTime = 0;
    try {
      await audio.play();
      setBeatPlaying(true);
      setVinylState("playing");
    } catch (error) {
      console.error(error);
      setBeatPlaying(false);
      setVinylState("stopped");
    }
  };

  const filteredBeats = beats.filter((beat) => {
    const matchesSearch = `${beat.title} ${beat.key} ${beat.bpm} ${beat.mood} ${beat.genre}`.toLowerCase().includes(beatSearch.toLowerCase());
    const matchesFilter = beatFilter === "ALL" || beat.mode === beatFilter;
    return matchesSearch && matchesFilter;
  });

  const selectBeatFromMenu = (beat: typeof beats[number]) => {
    stopBeatPreview(false);
    const audio = beatAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setSelectedBeat(beat);
    setBeatProgress(0);
    setBeatDropdownOpen(false);
    requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active?.tagName === "INPUT") active.blur();
      window.scrollTo({ top: window.scrollY, behavior: "auto" });
    });
  };

  useEffect(() => {
    const audio = beatAudioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      const current = Math.min(audio.currentTime, 15);
      setBeatProgress(current);
      if (current >= 14.98) stopBeatPreview(true);
    };
    const onEnded = () => stopBeatPreview(true);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const spin = (timestamp: number) => {
      if (vinylState === "playing") {
        if (vinylLastFrameRef.current === null) vinylLastFrameRef.current = timestamp;
        const delta = timestamp - vinylLastFrameRef.current;
        vinylLastFrameRef.current = timestamp;
        setVinylRotation((rotation) => (rotation + delta * (360 / 1800)) % 360);
        vinylFrameRef.current = requestAnimationFrame(spin);
      } else {
        vinylLastFrameRef.current = null;
        vinylFrameRef.current = null;
      }
    };
    if (vinylState === "playing") vinylFrameRef.current = requestAnimationFrame(spin);
    return () => {
      if (vinylFrameRef.current) cancelAnimationFrame(vinylFrameRef.current);
      vinylFrameRef.current = null;
    };
  }, [vinylState]);

  useEffect(() => {
    if (vinylState !== "slowing") return;
    const start = performance.now();
    const initial = vinylRotation;
    const duration = 1100;
    const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);
    const animateStop = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setVinylRotation((initial + 90 * (1 - easeOut(progress))) % 360);
      if (progress < 1) requestAnimationFrame(animateStop);
    };
    requestAnimationFrame(animateStop);
  }, [vinylState]);


  return (
    <div className="site">

      {/* NAVIGATION */}
      <header className="nav">
        <div className="logo">
          <img src={logoImg} alt="Galaxy Studios logo" className="logo-img" />
          <div>
            <div className="logo-title">GALAXY FIRE</div>
            <div className="logo-sub">STUDIOS · EST. 2020</div>
          </div>
        </div>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#home" onClick={() => setMenuOpen(false)}>HOME</a>
          <a href="#studio" onClick={() => setMenuOpen(false)}>STUDIO</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>SERVICES</a>
          <a href="#visuals" onClick={() => setMenuOpen(false)}>VISUALS</a>
          <a href="#booking" onClick={() => setMenuOpen(false)}>BOOK</a>
          <a href="#culture" onClick={enterForTheCulture}>FOR THE CULTURE</a>
          <a href="#beats" onClick={() => setMenuOpen(false)}>BEATS</a>
          <a href="#shop" onClick={() => setMenuOpen(false)}>SHOP</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>ABOUT</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>CONTACT</a>
        </nav>

        <a className="nav-button" href="#booking">BOOK A SESSION</a>

        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>


      {/* HERO */}
      <section className="hero" id="home">
        <img src={heroImg} alt="Galaxy Studios control room" className="hero-photo" fetchPriority="high" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="eyebrow">PROFESSIONAL RECORDING STUDIO · NIGERIA</div>
          <h1>YOUR SOUND.<br /><span>YOUR FIRE.</span></h1>
          <p>A professional recording and production studio built for artists who take their music seriously.</p>
          <div className="hero-buttons">
            <a href="#booking" className="button red">BOOK A SESSION</a>
            <a href="#studio" className="button outline">EXPLORE THE STUDIO</a>
          </div>
          <div className="hero-est">EST. 2020</div>
        </div>
        <div className="scroll">SCROLL TO EXPLORE <span>↓</span></div>
      </section>


      {/* INTRO */}
      <section className="intro" id="studio">
        <div className="intro-text">
          <div className="section-number">01 / THE STUDIO</div>
          <h2>ONE ROOM.<br /><span>BUILT FOR CREATION.</span></h2>
          <p>Galaxy Fire Studios is a professional recording and production environment created for artists, producers and creators who want more from their music.</p>
          <p>From the first vocal take to the final master, we give you the space, tools and expertise to bring your vision to life.</p>
          <div className="stats">
            <div><strong>2020</strong><span>ESTABLISHED</span></div>
            <div><strong>01</strong><span>STUDIO ROOM</span></div>
            <div><strong>∞</strong><span>POSSIBILITIES</span></div>
          </div>
        </div>
        <div className="intro-image">
          <img src={deskImg} alt="Galaxy Studios full desk setup with dual monitors and MPC" className="section-photo" loading="lazy" decoding="async" />
        </div>
      </section>


      {/* STUDIO EXPERIENCE */}
      <section className="experience">
        <div className="experience-image">
          <img src={micWideImg} alt="Condenser microphone with acoustic shield in the recording room" className="section-photo" loading="lazy" decoding="async" />
        </div>
        <div className="experience-content">
          <div className="section-number">02 / THE EXPERIENCE</div>
          <h2>WALK IN WITH<br /><span>AN IDEA.</span></h2>
          <h3>WALK OUT WITH A RECORD.</h3>
          <p>Galaxy Fire is designed to keep you focused on what matters — making great music.</p>
          <div className="steps">
            <div className="step"><span>01</span><div><strong>BOOK</strong><p>Choose your service and session.</p></div></div>
            <div className="step"><span>02</span><div><strong>CREATE</strong><p>Come into the studio and make the record.</p></div></div>
            <div className="step"><span>03</span><div><strong>REFINE</strong><p>Record, produce, mix and shape the sound.</p></div></div>
            <div className="step"><span>04</span><div><strong>RELEASE</strong><p>Leave with music ready for the world.</p></div></div>
          </div>
        </div>
      </section>


      {/* SERVICES */}
      <section className="services" id="services">
        <div className="section-heading">
          <div className="section-number">03 / SERVICES</div>
          <h2>WHAT<br /><span>WE DO.</span></h2>
          <p>Everything you need to take an idea from the first recording to a finished release.</p>
        </div>
        <div className="service-grid">
          {services.map((s) => (
            <div className="service-card" key={s.number}>
              <div className="service-number">{s.number}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <a href="#booking">GET STARTED →</a>
            </div>
          ))}
        </div>
      </section>


      {/* FEATURE BANNER */}
      <section className="feature">
        <div className="feature-image">
          <img src={monitorsImg} alt="Studio monitor speakers and audio interface on the mixing desk" className="feature-photo" loading="lazy" decoding="async" />
          <div className="feature-overlay" />
          <div className="feature-content">
            <div className="eyebrow">THE GALAXY FIRE STANDARD</div>
            <h2>GREAT MUSIC<br /><span>STARTS HERE.</span></h2>
            <a href="#booking" className="button red">BOOK YOUR SESSION</a>
          </div>
        </div>
      </section>


      {/* PHOTOGRAPHY & VISUALS */}
      <section className="visual-production" id="visuals">
        <div className="section-heading">
          <div className="section-number">04 / PHOTOGRAPHY &amp; VISUALS</div>
          <h2>BRING YOUR<br /><span>SOUND TO LIFE.</span></h2>
          <p>Professional photography, music videos and creative visual production designed to give your music and brand the visual identity it deserves.</p>
        </div>

        <div
          className={`visual-slider ${visualPaused ? "paused" : ""}`}
          onPointerEnter={() => setVisualPaused(true)}
          onPointerLeave={() => setVisualPaused(false)}
          onPointerDown={() => setVisualPaused(true)}
          onPointerUp={() => setVisualPaused(false)}
          onPointerCancel={() => setVisualPaused(false)}
        >
          <div className="visual-grid">
            {visualSlides[visualSlide].map((image, index) => (
              <div className={`visual-grid-item visual-grid-item-${index + 1}`} key={`${visualSlide}-${index}`}>
                <img
                  src={image}
                  alt={`Galaxy Fire Studios photography and visual production ${visualSlide * 10 + index + 1}`}
                  loading={visualSlide === 0 && index < 2 ? "eager" : "lazy"}
                  decoding="async"
                  width="1600"
                  height="1067"
                />
              </div>
            ))}
          </div>
          <div className="visual-slider-controls">
            <button type="button" onClick={() => setVisualSlide((visualSlide + 2) % 3)} aria-label="Previous visual slide">←</button>
            <div className="visual-slider-dots">
              {visualSlides.map((_, index) => (
                <button type="button" key={index} className={index === visualSlide ? "active" : ""} onClick={() => setVisualSlide(index)} aria-label={`Show visual slide ${index + 1}`} />
              ))}
            </div>
            <button type="button" onClick={() => setVisualSlide((visualSlide + 1) % 3)} aria-label="Next visual slide">→</button>
          </div>
          <div className="visual-slider-status" aria-live="polite">{visualPaused ? "PAUSED · RELEASE TO CONTINUE" : "AUTO PLAY · HOLD TO PAUSE"}</div>
        </div>

        <div className="visual-services-pricing">
          <div className="visual-price-group">
            <div className="visual-price-title">PHOTOGRAPHY</div>
            <div className="visual-price-row"><span>Artist Photoshoot</span><strong>₦75,000</strong></div>
            <div className="visual-price-row"><span>Cover Art Shoot</span><strong>₦50,000</strong></div>
            <div className="visual-price-row"><span>Event Photography</span><strong>₦100,000</strong></div>
          </div>
          <div className="visual-price-group">
            <div className="visual-price-title">VIDEOGRAPHY</div>
            <div className="visual-price-row"><span>Music Video</span><strong>From ₦250,000</strong></div>
            <div className="visual-price-row"><span>Performance Video</span><strong>From ₦150,000</strong></div>
            <div className="visual-price-row"><span>Visualizer</span><strong>From ₦100,000</strong></div>
            <div className="visual-price-row"><span>Lyric Video</span><strong>From ₦75,000</strong></div>
            <div className="visual-price-row"><span>Social Content Package</span><strong>From ₦100,000</strong></div>
          </div>
          <div className="visual-price-group">
            <div className="visual-price-title">CREATIVE DIRECTION</div>
            <div className="visual-price-row"><span>Creative Direction</span><strong>Custom Quote</strong></div>
          </div>
        </div>

        <div className="visual-cta">
          <div>
            <span className="eyebrow">YOUR IDEA. OUR VISUAL TEAM.</span>
            <h3>READY TO<br /><span>SHOOT?</span></h3>
          </div>
          <div className="visual-cta-buttons">
            <button type="button" className="button red" onClick={() => openBooking("Artist Photoshoot")}>BOOK A VISUAL SESSION</button>
            <a href="https://wa.me/2348035345977?text=Hi%20Galaxy%20Fire%20Studios%2C%20I%27d%20like%20a%20quote%20for%20a%20visual%20production%20project." className="button outline" target="_blank" rel="noreferrer">GET A QUOTE</a>
          </div>
        </div>
      </section>


      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="section-heading center">
          <div className="section-number">05 / PRICING</div>
          <h2>STUDIO<br /><span>RATES.</span></h2>
          <p>Professional services. Straightforward pricing. No unnecessary complications.</p>
        </div>
        <div className="pricing-grid">

          <div className="price-card featured">
            <div className="popular">MOST POPULAR</div>
            <div className="price-category">RECORDING</div>
            <h3>THE FIRE SESSION</h3>
            <div className="price">₦130,000</div>
            <div className="price-detail">6 HOURS · ENGINEER INCLUDED</div>
            <ul>
              <li>Studio access</li><li>Recording engineer</li><li>Vocal recording</li>
              <li>Basic vocal editing</li><li>Professional monitoring</li><li>Session files</li>
            </ul>
            <button type="button" className="price-button" onClick={() => openBooking("The Fire Session")}>BOOK THE FIRE SESSION →</button>
          </div>

          <div className="price-card">
            <div className="price-category">RECORDING</div>
            <h3>STUDIO HOUR</h3>
            <div className="price">₦25,000</div>
            <div className="price-detail">PER HOUR · ENGINEER INCLUDED</div>
            <ul>
              <li>Studio access</li><li>Recording engineer</li>
              <li>Professional recording setup</li><li>Session files</li>
            </ul>
            <button type="button" className="price-button" onClick={() => openBooking("Studio Hour")}>BOOK →</button>
          </div>

          <div className="price-card">
            <div className="price-category">MIXING</div>
            <h3>PROFESSIONAL MIX</h3>
            <div className="price">₦75,000</div>
            <div className="price-detail">PER SONG</div>
            <ul>
              <li>Full song mix</li><li>Vocal processing</li>
              <li>EQ &amp; compression</li><li>Effects</li><li>2 revisions</li>
            </ul>
            <button type="button" className="price-button" onClick={() => openBooking("Professional Mix")}>START A MIX →</button>
          </div>

          <div className="price-card">
            <div className="price-category">MASTERING</div>
            <h3>MASTERING</h3>
            <div className="price">₦35,000</div>
            <div className="price-detail">PER SONG</div>
            <ul>
              <li>Professional mastering</li><li>Streaming-ready master</li>
              <li>WAV delivery</li><li>MP3 reference</li>
            </ul>
            <button type="button" className="price-button" onClick={() => openBooking("Mastering")}>MASTER MY SONG →</button>
          </div>

          <div className="price-card">
            <div className="price-category">COMPLETE</div>
            <h3>MIX + MASTER</h3>
            <div className="price">₦100,000</div>
            <div className="price-detail">PER SONG</div>
            <ul>
              <li>Professional mix</li><li>Vocal processing</li>
              <li>2 mix revisions</li><li>Final master</li><li>WAV + MP3</li>
            </ul>
            <button type="button" className="price-button" onClick={() => openBooking("Mix + Master")}>COMPLETE MY SONG →</button>
          </div>

          <div className="price-card">
            <div className="price-category">PRODUCTION</div>
            <h3>PRODUCTION SESSION</h3>
            <div className="price">₦30,000</div>
            <div className="price-detail">PER HOUR</div>
            <ul>
              <li>Beat production</li><li>Arrangement</li>
              <li>Sound selection</li><li>MIDI production</li><li>Creative direction</li>
            </ul>
            <button type="button" className="price-button" onClick={() => openBooking("Production Session")}>START CREATING →</button>
          </div>

        </div>
      </section>


      {/* GALLERY */}
      <section className="gallery" id="gallery">
        <div className="section-heading">
          <div className="section-number">06 / GALLERY</div>
          <h2>INSIDE<br /><span>THE FIRE.</span></h2>
        </div>
        <div className="gallery-grid">
          <div className="gallery-large">
            <img src={heroImg} alt="Galaxy Studios control room with mixing desk and booth window" className="gallery-photo" loading="lazy" decoding="async" />
            <div className="gallery-caption">THE CONTROL ROOM</div>
          </div>
          <div className="gallery-col">
            <div className="gallery-small">
              <img src={micCloseImg} alt="Condenser microphone in the red acoustic vocal booth" className="gallery-photo" loading="lazy" decoding="async" />
              <div className="gallery-caption">THE VOCAL BOOTH</div>
            </div>
            <div className="gallery-small">
              <img src={mpcLitImg} alt="AKAI MPC X with lit cyan performance pads" className="gallery-photo" loading="lazy" decoding="async" />
              <div className="gallery-caption">PRODUCTION</div>
            </div>
            <div className="gallery-small">
              <img src={speakerImg} alt="Studio monitor speaker cone close-up against red velvet wall" className="gallery-photo" loading="lazy" decoding="async" />
              <div className="gallery-caption">THE MONITORS</div>
            </div>
          </div>
        </div>

        {/* Second row */}
        <div className="gallery-row2">
          <div className="gallery-med">
            <img src={deskImg} alt="Full studio desk with dual monitors, MPC and studio monitors" className="gallery-photo" loading="lazy" decoding="async" />
            <div className="gallery-caption">THE DESK</div>
          </div>
          <div className="gallery-med">
            <img src={keyboardImg} alt="Studio keyboard with blue LED lighting" className="gallery-photo" loading="lazy" decoding="async" />
            <div className="gallery-caption">THE KEYS</div>
          </div>
          <div className="gallery-med">
            <img src={monitorsImg} alt="AKG headphones and studio monitor on mixing desk" className="gallery-photo" loading="lazy" decoding="async" />
            <div className="gallery-caption">MONITORING</div>
          </div>
        </div>

        {/* Third row */}
        <div className="gallery-row2" style={{marginTop: '12px'}}>
          <div className="gallery-med">
            <img src={micWideImg} alt="Microphone with acoustic shield in the recording room" className="gallery-photo" loading="lazy" decoding="async" />
            <div className="gallery-caption">THE MIC SETUP</div>
          </div>
          <div className="gallery-med">
            <img src={mpcDemoImg} alt="AKAI MPC X showing genre demo selection screen" className="gallery-photo" loading="lazy" decoding="async" />
            <div className="gallery-caption">THE MPC</div>
          </div>
          <div className="gallery-med">
            <img src={interfaceImg} alt="Universal Audio interface close-up on the studio desk" className="gallery-photo" loading="lazy" decoding="async" />
            <div className="gallery-caption">AUDIO INTERFACE</div>
          </div>
        </div>
      </section>


      {/* FOR THE CULTURE */}
      <section className="culture-platform" id="culture">
        <div className="culture-platform-topline">
          <span>MUSIC. CULTURE. ENTERTAINMENT. COMMUNITY.</span>
          <span className="culture-platform-live">● LIVE EDITORIAL RADAR &nbsp; / &nbsp; FOR THE CULTURE</span>
        </div>

        <div className="culture-platform-shell">
          <div className="culture-brand-rail">
            <img src={cultureArt} alt="FOR THE CULTURE" className="culture-brand-art" />
            <div className="culture-brand-kicker">BY GALAXY FIRE STUDIOS</div>
            <p>Original editorial coverage powered by the FOR THE CULTURE newsroom.</p>
          </div>

          <div className="culture-platform-main">
            <nav className="culture-platform-nav" aria-label="FOR THE CULTURE sections">
              {cultureTabs.map(([key, label, href]) => (
                <a
                  key={key}
                  className={cultureActiveTab === key ? "active" : ""}
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    setCultureActiveTab(key);
                    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>

            {cultureFeedStatus === "ready" && heroStory ? (
              <article className="culture-hero-story" id="culture-home">
                <div className="culture-hero-copy">
                  <span className="culture-label">{heroStory.category || "FEATURED STORY"}</span>
                  <h2>{storyTitle(heroStory)}</h2>
                  <p>{storyDek(heroStory)}</p>
                  <a {...storyLinkProps(heroStory)} className="culture-action">READ THE STORY <span>→</span></a>
                  <small className="culture-story-byline">{heroStory.source_name || "FOR THE CULTURE"} · {storyDate(heroStory)}</small>
                </div>
                <div className="culture-hero-image-wrap">
                  {storyImage(heroStory) ? (
                    <img src={storyImage(heroStory)} alt={storyTitle(heroStory)} className="culture-hero-image" loading="eager" decoding="async" referrerPolicy="no-referrer" onError={handleStoryImageError} />
                  ) : (
                    <div className="culture-editorial-visual-fallback"><span>FOR THE<br />CULTURE</span></div>
                  )}
                  <div className="culture-hero-stamp">CULTURE<br />OVER<br />EVERYTHING.</div>
                </div>
                <div className="culture-hero-controls"><span className="active"></span><span></span><span></span></div>
              </article>
            ) : (
              <article className="culture-hero-story culture-editorial-empty" id="culture-home">
                <div className="culture-hero-copy">
                  <span className="culture-label">FOR THE CULTURE EDITORIAL DESK</span>
                  <h2>THE CULTURE<br /><em>IS MOVING.</em></h2>
                  <p>The newsroom is connected to the live culture radar. Fresh stories appear here as the editorial desk publishes them.</p>
                </div>
                <div className="culture-hero-image-wrap"><div className="culture-editorial-visual-fallback"><span>EDITORIAL<br />RADAR</span></div></div>
              </article>
            )}

            <div className="culture-content-grid">
              <section className="culture-stories-block culture-stories-block-wide" id="culture-stories">
                <div className="culture-section-head"><h3>LATEST STORIES</h3><span>FRESH FROM THE CULTURE RADAR</span></div>
                {cultureFeedStatus === "ready" && latestStories.length ? (
                  <div className="culture-story-grid">
                    {latestStories.map((story: any) => (
                      <a {...storyLinkProps(story)} className="culture-story-card culture-live-story-card" key={storyKey(story)}>
                        {storyImage(story) ? <img src={storyImage(story)} alt={storyTitle(story)} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={handleStoryImageError} /> : <div className="culture-story-no-image">FOR THE CULTURE</div>}
                        <div>
                          <span>{story.category || "CULTURE"}</span>
                          <h4>{storyTitle(story)}</h4>
                          <p>{storyDek(story)}</p>
                          <small>{story.source_name || "FOR THE CULTURE"} · {storyDate(story)}</small>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className={`culture-editorial-state ${cultureFeedStatus}`}>
                    <div className="culture-editorial-state-mark">●</div>
                    <div>
                      <strong>{cultureFeedStatus === "loading" ? "LOADING THE CULTURE RADAR" : cultureFeedStatus === "error" ? "EDITORIAL FEED UNAVAILABLE" : "EDITORIAL RADAR INITIALIZING"}</strong>
                      <p>{cultureFeedStatus === "loading" ? "Checking the latest stories from the editorial sources." : cultureFeedStatus === "error" ? "The live editorial feed could not be reached. The newsroom will retry automatically." : "The editorial feed is empty. Once the editorial engine publishes stories, this space will update automatically."}</p>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="culture-platform-columns culture-desk-grid" id="culture-discover">
              <section className="culture-panel music-panel" id="culture-music">
                <div className="culture-section-head"><h3>NEW MUSIC</h3><span>MUSIC FROM THE CULTURE RADAR</span></div>
                {deskMusicStories.length ? deskMusicStories.map((story: any) => (
                  <a {...storyLinkProps(story)} className="culture-music-row" key={storyKey(story)}>
                    {storyImage(story) ? <img src={storyImage(story)} alt={storyTitle(story)} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={handleStoryImageError} /> : <div className="culture-music-no-image">FTC</div>}
                    <div><strong>{storyTitle(story)}</strong><small>{storyDek(story)}</small><em>{story.source_name || "FOR THE CULTURE"}</em></div><span className="culture-play">→</span>
                  </a>
                )) : <div className="culture-panel-empty">NO ADDITIONAL MUSIC STORIES YET. THE DESK WILL FILL THIS SPACE AS NEW REPORTS ARRIVE.</div>}
              </section>

              {deskCultureStory && (
                <section className="culture-panel culture-feature-panel" id="culture-culture">
                  <div className="culture-section-head"><h3>CULTURE DESK</h3><span>POINT OF VIEW</span></div>
                  <a {...storyLinkProps(deskCultureStory)} className="culture-feature-link">
                    <div className="culture-feature-image">{storyImage(deskCultureStory) ? <img src={storyImage(deskCultureStory)} alt={storyTitle(deskCultureStory)} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={handleStoryImageError} /> : <div className="culture-editorial-visual-fallback"><span>CULTURE</span></div>}<span>{deskCultureStory.category || "CULTURE"}</span></div>
                    <h4>{storyTitle(deskCultureStory)}</h4><p>{storyDek(deskCultureStory)}</p><small>{deskCultureStory.source_name || "FOR THE CULTURE"} · {storyDate(deskCultureStory)}</small>
                  </a>
                </section>
              )}

              <aside className="culture-panel culture-idea-panel">
                <span>THE IDEA</span>
                <h3>STORIES.<br />SOUNDS.<br /><em>IDENTITY.</em></h3>
                <p>Music and culture belong in the same conversation. FOR THE CULTURE brings releases, voices, scenes and ideas together without forcing the same story into every panel.</p>
                <div className="culture-source-strip">
                  <small>EDITORIAL RADAR</small>
                  <strong>THE NATIVE · NOTJUSTOK · TOO XCLUSIVE · NAIJALOADED</strong>
                </div>
              </aside>
            </div>

            {hasMoreStories && (
              <section className="culture-more" id="culture-more">
                <div className="culture-section-head"><h3>MORE FROM THE CULTURE</h3><span>OLDER / DISTINCT STORIES</span></div>
                <div className="culture-more-grid">
                  {moreStories.map((story: any) => (
                    <a {...storyLinkProps(story)} className="culture-more-card" key={storyKey(story)}>
                      {storyImage(story) ? <img src={storyImage(story)} alt={storyTitle(story)} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={handleStoryImageError} /> : <div className="culture-story-no-image">FTC</div>}
                      <div><span>{story.category || "CULTURE"}</span><h4>{storyTitle(story)}</h4><p>{storyDek(story)}</p><small>{story.source_name || "FOR THE CULTURE"}</small></div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section className={`culture-artist-portal ${artistPortalOpen ? "is-open" : "is-closed"}`} id="culture-artist-submissions">
              <div className="culture-artist-portal-copy">
                <span>ARTIST SUBMISSIONS</span>
                <h3>YOUR MUSIC.<br /><em>YOUR VOICE.</em></h3>
                <p>Submit music for FOR THE CULTURE Radio, editorial coverage, or both. Every submission is reviewed by the music/editorial team.</p>
                <div className="culture-artist-review-note">
                  <strong>CURATED BY THE CULTURE DESK</strong>
                  <span>No automatic radio play or publication.</span>
                </div>
                <button type="button" className="culture-artist-toggle" onClick={() => setArtistPortalOpen((open) => !open)} aria-expanded={artistPortalOpen}>
                  {artistPortalOpen ? "CLOSE SUBMISSION FORM ↑" : "SUBMIT YOUR MUSIC →"}
                </button>
              </div>

              {artistPortalOpen && <form id="culture-artist-submission-form" className="culture-artist-form" onSubmit={submitArtistMusic}>
                <div className="culture-form-grid">
                  <label>Artist / Stage Name<input value={artistSubmission.artistName} onChange={(e) => setArtistSubmission({ ...artistSubmission, artistName: e.target.value })} required /></label>
                  <label>Email<input type="email" value={artistSubmission.email} onChange={(e) => setArtistSubmission({ ...artistSubmission, email: e.target.value })} required /></label>
                  <label>Phone / WhatsApp<input value={artistSubmission.phone} onChange={(e) => setArtistSubmission({ ...artistSubmission, phone: e.target.value })} /></label>
                  <label>Genre<input value={artistSubmission.genre} onChange={(e) => setArtistSubmission({ ...artistSubmission, genre: e.target.value })} placeholder="Afrobeats, Hip-Hop, R&B..." /></label>
                  <label>Country<input value={artistSubmission.country} onChange={(e) => setArtistSubmission({ ...artistSubmission, country: e.target.value })} /></label>
                  <label>City<input value={artistSubmission.city} onChange={(e) => setArtistSubmission({ ...artistSubmission, city: e.target.value })} /></label>
                  <label>Song Title<input value={artistSubmission.songTitle} onChange={(e) => setArtistSubmission({ ...artistSubmission, songTitle: e.target.value })} required /></label>
                  <label>Release Date<input type="date" value={artistSubmission.releaseDate} onChange={(e) => setArtistSubmission({ ...artistSubmission, releaseDate: e.target.value })} /></label>
                </div>

                <label>Submit For
                  <select value={artistSubmission.purpose} onChange={(e) => setArtistSubmission({ ...artistSubmission, purpose: e.target.value })}>
                    <option value="both">RADIO + BLOG / EDITORIAL</option>
                    <option value="radio">RADIO CONSIDERATION</option>
                    <option value="editorial">BLOG / EDITORIAL CONSIDERATION</option>
                  </select>
                </label>

                <label>Song Link <span className="culture-form-hint">(recommended for full-quality audio)</span><input type="url" value={artistSubmission.songUrl} onChange={(e) => setArtistSubmission({ ...artistSubmission, songUrl: e.target.value })} placeholder="Spotify, Audiomack, SoundCloud, Drive, Dropbox, etc." /></label>

                <div className="culture-form-grid culture-upload-grid">
                  <label>Audio Upload <span className="culture-form-hint">MP3/WAV · max 2 MB direct upload</span><input type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,.webm,audio/*" onChange={(e) => setArtistAudio(e.target.files?.[0] || null)} /></label>
                  <label>Artwork <span className="culture-form-hint">JPG/PNG/WebP · max 700 KB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setArtistArtwork(e.target.files?.[0] || null)} /></label>
                </div>

                <label>Artist Bio<textarea rows={3} value={artistSubmission.bio} onChange={(e) => setArtistSubmission({ ...artistSubmission, bio: e.target.value })} placeholder="Tell the culture desk who you are." /></label>
                <label>Song Description<textarea rows={3} value={artistSubmission.songDescription} onChange={(e) => setArtistSubmission({ ...artistSubmission, songDescription: e.target.value })} placeholder="What should listeners know about this record?" /></label>
                <label>Social Links<input value={artistSubmission.socialLinks} onChange={(e) => setArtistSubmission({ ...artistSubmission, socialLinks: e.target.value })} placeholder="@handle or profile links" /></label>

                <button type="submit" className="culture-artist-submit" disabled={artistSubmitState === "sending"}>
                  {artistSubmitState === "sending" ? "SENDING SUBMISSION…" : "SUBMIT MUSIC →"}
                </button>
                {artistSubmitState !== "idle" && <div className={`culture-submit-status ${artistSubmitState}`} role="status">{artistSubmitMessage}</div>}
                <small className="culture-form-disclaimer">Submission does not guarantee radio play, editorial coverage or publication. All material is reviewed by FOR THE CULTURE.</small>
              </form>}
            </section>

            <section className="culture-manifesto" id="culture-community">
              <div><span>FOR THE CULTURE</span><h3>WE ARE<br /><em>THE CULTURE.</em></h3></div>
              <p>One newsroom. One live feed. Music, stories, ideas and people connected without unnecessary repetition. When there is nothing new to say, the platform stays quiet rather than filling space for the sake of filling it.</p>
              <a href="#culture-stories" className="culture-action">EXPLORE THE LATEST →</a>
            </section>
          </div>
        </div>
      </section>

      {/* FOR THE CULTURE RADIO */}
      <section className="radio-station" id="radio">
        <div className="radio-station-topline">
          <span>FOR THE CULTURE RADIO</span>
          <span className="radio-live-line">● LIVE INTERNET RADIO</span>
          <span className="radio-topline-right">LIVE · GLOBAL · ALWAYS CULTURE</span>
        </div>

        <div className="radio-hero-grid">
          <div className="radio-intro">
            <div className="section-number">09 / RADIO</div>
            <h2>FOR THE<br /><span>CULTURE.</span><br />LIVE<span>.</span></h2>
            <p>The soundtrack of the culture. Music, conversation, new voices and sounds from Africa and the diaspora.</p>
            <div className="radio-actions">
              <button type="button" className="button red" onClick={toggleRadio}>{radioPlaying ? "PAUSE STREAM" : "PLAY RADIO →"}</button>
              <button type="button" className="button outline" onClick={() => setRadioPlayerOpen(true)}>OPEN PLAYER</button>
            </div>
            <div className="radio-status-note">
              <span className={radioPlaying ? "radio-dot live" : "radio-dot"}></span>
              {radioPlaying ? "ON AIR · STREAM LIVE" : radioStreamUrl ? "READY TO BROADCAST" : "RADIO ENGINE READY · STREAM URL TO BE CONNECTED"}
            </div>
          </div>

          <div className="radio-main-player">
            <div className="radio-player-glow"></div>
            <div className="radio-player-badge">{radioPlaying ? "ON AIR" : "FOR THE CULTURE RADIO"}</div>
            <div className="radio-player-body">
              <div className="radio-art-wrap">
                <img src={cultureArt} alt="For the Culture Radio artwork" />
                <div className="radio-art-overlay">{radioPlaying ? "LIVE" : "FTC"}</div>
              </div>
              <div className="radio-now-playing">
                <span>NOW PLAYING</span>
                <h3>{radioTrack.artist}</h3>
                <strong>{radioTrack.title}</strong>
                <small className="radio-programme-live-label">{currentProgramme.title} · {currentProgramme.host || "FOR THE CULTURE RADIO"} · {stationClockLabel}</small>
                <div className="radio-waveform" aria-hidden="true">{Array.from({ length: 48 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 17) % 44)}%` }} />)}</div>
                <div className="radio-meta"><span>{radioPlaying ? "LIVE" : "STANDBY"} <b>●</b></span><span>128 KBPS</span></div>
              </div>
              <button type="button" className={`radio-big-play ${radioPlaying ? "playing" : ""}`} onClick={toggleRadio} aria-label={radioPlaying ? "Pause radio" : "Play radio"}>{radioPlaying ? "Ⅱ" : "▶"}</button>
            </div>
            <div className="radio-player-footer">
              <div><span>HOST</span><strong>{currentProgramme.host || "FOR THE CULTURE RADIO"}</strong><small>{currentHost?.role || "STATION PROGRAMMING"}</small></div>
              <div><span>ON AIR NOW</span><strong>{currentProgramme.title}</strong><small>{currentProgramme.tagline}</small></div>
              <div><span>NEXT</span><strong>{nextProgramme.title}</strong><small>{formatRadioTime(nextProgramme.start)} · UP NEXT</small></div>
              <div className="radio-volume"><span>VOLUME</span><input type="range" min="0" max="1" step="0.01" value={radioVolume} onChange={(e) => setRadioVolume(Number(e.target.value))} /></div>
            </div>
          </div>
        </div>

        <div className="radio-content-grid">
          <section className="radio-panel recently-played">
            <div className="radio-panel-head"><h3>RECENTLY PLAYED</h3><span>VIEW ALL</span></div>
            {radioRecentlyPlayed.map((item: any, index) => (
              <div className="radio-track-row" key={`${item.artist}-${item.title}-${index}`}>
                <img src={cultureArt} alt="" />
                <div><strong>{item.artist}</strong><small>{item.title}</small></div>
                <span>{index === 0 && radioPlaying ? "NOW" : `${4 + index}:${String(32 - index * 2).padStart(2, "0")} PM`}</span>
              </div>
            ))}
            <button type="button" className="radio-panel-button">VIEW FULL PLAYLIST →</button>
          </section>

          <section className="radio-panel radio-schedule">
            <div className="radio-panel-head"><h3>PROGRAM SCHEDULE</h3><span>VIEW FULL SCHEDULE</span></div>
            {todayRadioSchedule.map((item) => (
              <div className={`radio-schedule-row ${item.id === currentProgramme.id ? "current" : ""}`} key={item.id}>
                <span className="schedule-time">{formatRadioTime(item.start)} – {item.end === "00:00" ? "12:00 AM" : formatRadioTime(item.end)}</span><div><strong>{item.title}</strong><small>{item.host || "FOR THE CULTURE RADIO"}</small></div><p>{item.tagline}</p><span className="schedule-state">{item.id === currentProgramme.id ? "ON AIR" : "○"}</span>
              </div>
            ))}
          </section>

          <aside className="radio-panel radio-connect">
            <div className="radio-panel-head"><h3>THE STATION</h3><span>{currentHost?.name || "FOR THE CULTURE"}</span></div>
            <h4>MUSIC.<br />CULTURE.<br /><em>CONNECTION.</em></h4>
            <p>FOR THE CULTURE RADIO is the live audio layer of the Galaxy Fire ecosystem — built for records, stories, artists, conversations and the sounds moving the culture.</p>
            <div className="radio-source-note"><span>RADIO ENGINE</span><strong>{radioPlaylist.length ? `${radioPlaylist.length} TRACK ROTATION READY` : (radioStreamUrl ? "STREAM CONFIGURED" : "PLAYLIST READYING")}</strong></div>
          </aside>
        </div>

        <audio ref={radioAudioRef} preload="auto" playsInline onPlaying={() => setRadioPlaying(true)} onPause={() => setRadioPlaying(false)} onEnded={advanceRadioTrack} onCanPlay={() => setRadioStreamReady(true)} onCanPlayThrough={() => setRadioStreamReady(true)} onError={() => setRadioStreamReady(false)} aria-label="For the Culture Radio" />
      </section>

      {radioPlayerOpen && (
        <div className="radio-player-drawer">
          <div className="radio-drawer-art"><img src={cultureArt} alt="For the Culture Radio" /></div>
          <div className="radio-drawer-track"><span>{radioPlaying ? "● LIVE" : "FOR THE CULTURE RADIO"}</span><strong>{radioTrack.artist}</strong><small>{radioTrack.title} · {currentProgramme.title} · {currentProgramme.host || "FOR THE CULTURE RADIO"}</small></div>
          <button type="button" className="radio-drawer-control" onClick={toggleRadio}>{radioPlaying ? "Ⅱ" : "▶"}</button>
          <input type="range" min="0" max="1" step="0.01" value={radioVolume} onChange={(e) => setRadioVolume(Number(e.target.value))} aria-label="Radio volume" />
          <span className="radio-drawer-quality">128 KBPS</span>
          <button type="button" className="radio-drawer-close" onClick={() => setRadioPlayerOpen(false)} aria-label="Close radio player">×</button>
        </div>
      )}

      <section className="ecosystem-preview dark" id="culture-blog-preview">
        <div className="ecosystem-preview-inner">
          <div>
            <div className="section-number">10 / BLOG</div>
            <h2>THE<br /><span>STORIES.</span></h2>
            <p>
              Artist interviews, producer spotlights, new releases, Abuja creative culture,
              events, tutorials and behind-the-scenes stories will live here.
            </p>
          </div>
          <a href="#contact" className="button outline">GET FEATURED →</a>
        </div>
      </section>

      <section className="beats-marketplace" id="beats">
        <div className="beats-shell">
          <div className="beats-heading">
            <div>
              <div className="section-number">11 / GALAXY FIRE BEATS</div>
              <h2>FIND YOUR<br /><span>SOUND.</span></h2>
              <p>Original Galaxy Fire beats, ready for your next record. Preview for 15 seconds, choose your license, and keep creating.</p>
            </div>
            <div className="beats-heading-note">
              <span>VINYL PREVIEW PLAYER</span>
              <small>SELECT A BEAT FROM THE PLAYER</small>
            </div>
          </div>

          <div className="beat-feature">
            <div className={`vinyl-player ${vinylState}`}>
              <div className="vinyl-platter" style={{ transform: `rotate(${vinylRotation}deg)` }}>
                <div className="vinyl-grooves" />
                <img src={beatArt} alt="Galaxy Records Limited artwork" className="vinyl-label" />
                <div className="vinyl-shine" />
              </div>
              <div className={`tonearm ${vinylState}`}><div className="tonearm-head" /></div>

              <div className="turntable-control">
                <span>33⅓ RPM</span>
                <span>{vinylState === "playing" ? "PLAYING" : vinylState === "slowing" ? "STOPPING" : "READY"}</span>
              </div>

              <button className="vinyl-play" onClick={() => playBeat(selectedBeat)} aria-label={beatPlaying ? "Pause preview" : "Play preview"}>
                {beatPlaying ? "Ⅱ" : "▶"}
              </button>
            </div>

            <div className="beat-feature-info">
              <div className={`beat-selector ${beatDropdownOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="beat-selector-trigger"
                  onClick={() => setBeatDropdownOpen((open) => !open)}
                  aria-expanded={beatDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <span className="beat-selector-icon">♪</span>
                  <span className="beat-selector-current">
                    <small>SELECT BEAT</small>
                    <strong>{selectedBeat.title}</strong>
                  </span>
                  <span className="beat-selector-meta">{selectedBeat.key} · {selectedBeat.bpm} BPM</span>
                  <span className="beat-selector-chevron">{beatDropdownOpen ? "⌃" : "⌄"}</span>
                </button>

                {beatDropdownOpen && (
                  <div className="beat-selector-menu" role="listbox" aria-label="Galaxy Fire beats">
                    <div className="beat-selector-tools">
                      <input
                        value={beatSearch}
                        onChange={(event) => setBeatSearch(event.target.value)}
                        placeholder="SEARCH BEATS..."
                        aria-label="Search beats"
                        autoFocus
                      />
                      <div className="beat-selector-filters">
                        {["ALL", "MAJOR", "MINOR"].map((filter) => (
                          <button
                            type="button"
                            key={filter}
                            className={beatFilter === filter ? "active" : ""}
                            onClick={() => setBeatFilter(filter)}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="beat-selector-list">
                      {filteredBeats.length > 0 ? filteredBeats.map((beat) => (
                        <button
                          type="button"
                          key={beat.id}
                          className={`beat-selector-option ${selectedBeat.id === beat.id ? "selected" : ""}`}
                          onClick={() => selectBeatFromMenu(beat)}
                          role="option"
                          aria-selected={selectedBeat.id === beat.id}
                        >
                          <span className="beat-selector-option-icon">{selectedBeat.id === beat.id ? "●" : "›"}</span>
                          <span className="beat-selector-option-title">{beat.title}</span>
                          <span className="beat-selector-option-meta">{beat.key}</span>
                          <span className="beat-selector-option-bpm">{beat.bpm}</span>
                        </button>
                      )) : (
                        <div className="beat-selector-empty">NO BEATS MATCH YOUR SEARCH.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="now-playing-label">{beatPlaying ? "NOW PLAYING" : "BEAT PREVIEW"}</div>
              <h3>{selectedBeat.title}</h3>
              <div className="beat-meta">
                <span>BPM <b>{selectedBeat.bpm}</b></span>
                <span>KEY <b>{selectedBeat.key}</b></span>
                <span>MODE <b>{selectedBeat.mode}</b></span>
                <span>MOOD <b>{selectedBeat.mood}</b></span>
              </div>
              <p>Galaxy Fire original production. Preview is limited to 15 seconds before the vinyl slows to a stop.</p>
              <div className="beat-progress-row">
                <div className="beat-progress"><span style={{ width: `${Math.min(100, (beatProgress / 15) * 100)}%` }} /></div>
                <span>{Math.floor(beatProgress).toString().padStart(2, "0")} / 15</span>
              </div>

              <div className="beat-license-grid">
                {licenseOptions.map((license) => {
                  const exclusiveUnavailable = !!beatSoldMap[selectedBeat.id];
                  return (
                    <div key={license.name} className={`${license.name === "Unlimited" ? "featured " : ""}${selectedLicense === license.name ? "chosen" : ""}${exclusiveUnavailable ? " sold" : ""}`}>
                      <small>{license.name.toUpperCase()}</small>
                      <strong>{formatNaira(license.price)}</strong>
                      <span>{exclusiveUnavailable ? "SOLD — PREVIEW ONLY" : license.detail}</span>
                      <button disabled={!!exclusiveUnavailable} onClick={() => openBeatCheckout(license)}>{exclusiveUnavailable ? "SOLD" : "BUY LICENSE"}</button>
                    </div>
                  );
                })}
              </div>
              {beatSoldMap[selectedBeat.id] && <div className="beat-sold-banner">SOLD · THIS BEAT REMAINS AVAILABLE TO PREVIEW BUT CANNOT BE PURCHASED.</div>}
              {beatPurchaseSuccess && <div className="beat-purchase-success">{beatPurchaseSuccess}</div>}
              {beatPurchaseError && <div className="beat-purchase-error">{beatPurchaseError}</div>}
              <div className="beat-license-note">Payments are verified server-side through Paystack. Exclusive purchases are recorded so the beat can remain visible and playable while being blocked from future purchase.</div>
            </div>
          </div>

          <audio ref={beatAudioRef} preload="none" aria-hidden="true" />
        </div>
      </section>

      {beatCheckoutOpen && (
        <div className="beat-checkout-overlay" onClick={() => !beatPurchaseProcessing && closeBeatCheckout()}>
          <div className="beat-checkout-modal" onClick={(event) => event.stopPropagation()}>
            <button className="store-close" onClick={closeBeatCheckout} disabled={beatPurchaseProcessing}>×</button>
            <div className="section-number">GALAXY FIRE BEATS · SECURE CHECKOUT</div>
            <h3>{selectedBeat.title}</h3>
            <p className="beat-checkout-license">{selectedLicense.toUpperCase()} LICENSE · {formatNaira(licenseOptions.find((item) => item.name === selectedLicense)?.price || 0)}</p>
            <div className="beat-checkout-form">
              <label>FULL NAME<input value={beatCustomer.name} onChange={(e) => setBeatCustomer({ ...beatCustomer, name: e.target.value })} /></label>
              <label>EMAIL<input type="email" value={beatCustomer.email} onChange={(e) => setBeatCustomer({ ...beatCustomer, email: e.target.value })} /></label>
              <label className="wide">PHONE<input value={beatCustomer.phone} onChange={(e) => setBeatCustomer({ ...beatCustomer, phone: e.target.value })} /></label>
            </div>
            <div className="beat-checkout-summary"><span>PAYMENT</span><strong>{formatNaira(licenseOptions.find((item) => item.name === selectedLicense)?.price || 0)}</strong></div>
            {beatPurchaseError && <div className="store-error">{beatPurchaseError}</div>}
            {beatPurchaseSuccess && <div className="store-success">{beatPurchaseSuccess}</div>}
            <button className="button red full" disabled={beatPurchaseProcessing || !!beatPurchaseSuccess} onClick={checkoutBeat}>{beatPurchaseProcessing ? "OPENING SECURE PAYMENT..." : beatPurchaseSuccess ? "PAYMENT CONFIRMED" : "PAY WITH PAYSTACK →"}</button>
            <p className="checkout-note">Your payment is verified on the server before the order is recorded. Do not close the payment window until Paystack confirms your transaction.</p>
          </div>
        </div>
      )}

      <section className="store-section" id="shop">
        <div className="store-shell">
          <div className="section-heading store-heading">
            <div className="section-number">12 / GALAXY FIRE PRO AUDIO</div>
            <h2>BUILD<br /><span>YOUR STUDIO.</span></h2>
            <p>Studio microphones, interfaces, monitors, headphones, production gear and essential accessories — selected for artists and creators.</p>
          </div>
          <div className="store-topbar">
            <div className="store-categories">
              {storeCategories.map((category) => (
                <button key={category} className={storeCategory === category ? "store-filter active" : "store-filter"} onClick={() => setStoreCategory(category)}>
                  {category}
                </button>
              ))}
            </div>
            <button className="cart-button" onClick={() => setCartOpen(true)}>CART <span>{cart.reduce((n, i) => n + i.quantity, 0)}</span> →</button>
          </div>
          {storeSuccess && <div className="store-success">{storeSuccess}</div>}
          <div className="store-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  <img
                    src={productImage(product.query)}
                    alt={product.name}
                    className="product-image"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = deskImg; }}
                  />
                  <span className="product-badge">{product.badge}</span>
                </div>
                <div className="product-info">
                  <div className="product-category">{product.category}</div>
                  <h3>{product.name}</h3>
                  <p>{product.desc}</p>
                  <div className="product-bottom">
                    <strong>{formatNaira(product.price)}</strong>
                    <button className="add-button" onClick={() => addToCart(product)}>ADD TO CART</button>
                  </div>
                  <small>{product.stock <= 2 ? "Limited stock" : "In stock"} · Ships across Nigeria</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {cartOpen && (
        <div className="store-overlay" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="store-close" onClick={() => setCartOpen(false)}>×</button>
            <div className="section-number">YOUR CART</div>
            <h2>READY<br /><span>TO ORDER.</span></h2>
            {cart.length === 0 ? <p className="empty-cart">Your cart is empty. Add some studio gear.</p> : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.product.id}>
                      <img src={productImage(item.product.query)} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = deskImg; }} />
                      <div>
                        <strong>{item.product.name}</strong>
                        <span>{formatNaira(item.product.price)}</span>
                        <div className="quantity-controls">
                          <button onClick={() => updateCartQuantity(item.product.id, -1)}>−</button>
                          <b>{item.quantity}</b>
                          <button onClick={() => updateCartQuantity(item.product.id, 1)}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <div><span>Products</span><strong>{formatNaira(cartSubtotal)}</strong></div>
                  <div><span>Shipping & handling</span><strong>{formatNaira(shippingHandling)}</strong></div>
                  <div className="cart-total"><span>TOTAL</span><strong>{formatNaira(cartTotal)}</strong></div>
                </div>
                <button className="button red full" onClick={() => { setCartOpen(false); setStoreCheckoutOpen(true); }}>CHECKOUT WITH PAYSTACK →</button>
              </>
            )}
          </aside>
        </div>
      )}

      {storeCheckoutOpen && (
        <div className="store-overlay" onClick={() => !storeProcessing && setStoreCheckoutOpen(false)}>
          <div className="store-checkout" onClick={(event) => event.stopPropagation()}>
            <button className="store-close" onClick={() => !storeProcessing && setStoreCheckoutOpen(false)}>×</button>
            <div className="section-number">12 / CHECKOUT</div>
            <h2>DELIVERY<br /><span>DETAILS.</span></h2>
            <p className="checkout-note">Secure payment is processed through your existing Paystack integration. Shipping and handling are included in the final total shown below.</p>
            <div className="checkout-grid">
              <label>FULL NAME<input value={storeCustomer.name} onChange={(e) => setStoreCustomer({...storeCustomer, name: e.target.value})} /></label>
              <label>EMAIL<input type="email" value={storeCustomer.email} onChange={(e) => setStoreCustomer({...storeCustomer, email: e.target.value})} /></label>
              <label>PHONE<input value={storeCustomer.phone} onChange={(e) => setStoreCustomer({...storeCustomer, phone: e.target.value})} /></label>
              <label>CITY<input value={storeCustomer.city} onChange={(e) => setStoreCustomer({...storeCustomer, city: e.target.value})} /></label>
              <label className="wide">DELIVERY ADDRESS<textarea rows={3} value={storeCustomer.address} onChange={(e) => setStoreCustomer({...storeCustomer, address: e.target.value})} /></label>
            </div>
            <div className="checkout-total"><span>TOTAL TO PAY</span><strong>{formatNaira(cartTotal)}</strong></div>
            {storeError && <div className="store-error">{storeError}</div>}
            <button className="button red full" disabled={storeProcessing || cart.length === 0} onClick={checkoutStore}>{storeProcessing ? "OPENING SECURE PAYMENT..." : "PAY WITH PAYSTACK →"}</button>
          </div>
        </div>
      )}

      <section className="about-preview" id="about">
        <div className="about-preview-inner">
          <div className="section-number">13 / ABOUT GALAXY FIRE</div>
          <h2>BUILT FOR<br /><span>CREATORS.</span></h2>
          <p>
            Galaxy Fire Studios is a professional recording and production environment for
            artists, producers and creators who want to take their music seriously.
          </p>
          <a href="#booking" className="button red">WORK WITH US →</a>
        </div>
      </section>

      {/* PROMO / SOCIAL */}
      <section className="promo-section">
        <div className="section-heading">
          <div className="section-number">14 / THE WORD</div>
          <h2>SPREAD<br /><span>THE FIRE.</span></h2>
          <p>Galaxy Fire Studios — where beats get built, voices get captured, and music gets finished.</p>
        </div>
        <div className="promo-grid">
          <div className="promo-card">
            <img src={promoStudioTimeImg} alt="Need some studio time? Reach out today" className="promo-img" loading="lazy" decoding="async" />
          </div>
          <div className="promo-card">
            <img src={promoBeatsImg} alt="Do you need beats or engineering? Contact us today" className="promo-img" loading="lazy" decoding="async" />
          </div>
          <div className="promo-card">
            <img src={promoSuperstarsImg} alt="Bring out the superstar in you — contact us now" className="promo-img" loading="lazy" decoding="async" />
          </div>
          <div className="promo-card">
            <img src={promoMixMasterImg} alt="Need to mix and master your music? Reach out to us today" className="promo-img" loading="lazy" decoding="async" />
          </div>
        </div>
      </section>


      {/* WHY GALAXY FIRE */}
      <section className="why">
        <div className="why-content">
          <div className="section-number">15 / THE STANDARD</div>
          <h2>YOUR MUSIC.<br /><span>OUR CRAFT.</span></h2>
          <div className="why-grid">
            <div><strong>01</strong><h3>PROFESSIONAL</h3><p>A serious environment for serious music.</p></div>
            <div><strong>02</strong><h3>CREATIVE</h3><p>A space designed to keep artists focused on creating.</p></div>
            <div><strong>03</strong><h3>PERSONAL</h3><p>Your record isn&#39;t treated like just another session.</p></div>
            <div><strong>04</strong><h3>QUALITY</h3><p>Every detail matters from recording to final master.</p></div>
          </div>
        </div>
      </section>


      {/* BOOKING */}
      <section className="booking" id="booking">
        <img src={interfaceImg} alt="Studio audio interface" className="booking-photo" loading="lazy" decoding="async" />
        <div className="booking-overlay" />
        <div className="booking-content">
          <div className="eyebrow">GALAXY FIRE STUDIOS · EST. 2020</div>
          <h2>READY TO<br /><span>MAKE SOME FIRE?</span></h2>
          <p>Choose your service, preferred session time and payment option. We will confirm your slot with you.</p>
          <div className="booking-buttons">
            <button type="button" className="button red" onClick={() => openBooking()}>BOOK & PAY ONLINE</button>
            <a href="https://wa.me/2348035345977" className="button outline">BOOK VIA WHATSAPP</a>
          </div>
          <div className="contact-details">
            <div><span>EMAIL</span>galaxyfirestudios@gmail.com</div>
            <div><span>PHONE / WHATSAPP</span>+234 803 534 5977</div>
          </div>
        </div>
      </section>

      {cultureReaderStory && (
        <div className="culture-story-reader" id="culture-story-reader" role="dialog" aria-modal="true" aria-labelledby="culture-story-reader-title">
          <div className="culture-story-reader-backdrop" onClick={closeCultureStory} />
          <article className="culture-story-reader-card">
            <button type="button" className="culture-story-reader-close" onClick={closeCultureStory} aria-label="Close story reader">×</button>
            {storyImage(cultureReaderStory) && (
              <img
                className="culture-story-reader-image"
                src={storyImage(cultureReaderStory)}
                alt={storyTitle(cultureReaderStory)}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={handleStoryImageError}
              />
            )}
            <div className="culture-story-reader-content">
              <div className="culture-story-reader-meta">
                <span>{cultureReaderStory.category || "CULTURE"}</span>
                <span>{cultureReaderStory.source_name || "FOR THE CULTURE"}</span>
                <span>{storyDate(cultureReaderStory)}</span>
              </div>
              <h2 id="culture-story-reader-title">{storyTitle(cultureReaderStory)}</h2>
              <p className="culture-story-reader-dek">{storyDek(cultureReaderStory)}</p>
              <div className="culture-story-reader-body">
                {(cultureReaderStory.body || cultureReaderStory.source_excerpt || "The FOR THE CULTURE editorial desk is following this story.")
                  .split(/\n\s*\n|(?<=\.)\s{2,}/)
                  .map((paragraph: string, index: number) => paragraph.trim() ? <p key={index}>{paragraph.trim()}</p> : null)}
              </div>
              {storyUrl(cultureReaderStory) !== "#" && (
                <a className="culture-story-reader-source" href={storyUrl(cultureReaderStory)} target="_blank" rel="noreferrer">READ THE ORIGINAL SOURCE ↗</a>
              )}
            </div>
          </article>
        </div>
      )}

      {bookingOpen && (
        <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
          <div className="booking-modal-backdrop" onClick={closeBooking} />
          <div className="booking-modal-card">
            <button type="button" className="booking-close" onClick={closeBooking} aria-label="Close booking form">×</button>
            {!bookingSubmitted ? (
              <>
                <div className="section-number">BOOKING / 01</div>
                <h2 id="booking-title">BOOK YOUR<br /><span>SESSION.</span></h2>
                <p className="booking-modal-intro">Reserve your preferred slot and choose whether you want to pay a 50% deposit or the full amount.</p>
                <form onSubmit={submitBooking} className="booking-form">
                  <label>
                    SERVICE
                    <select value={booking.service} onChange={(e) => updateBooking("service", e.target.value)}>
                      {bookingServices.map((service) => (
                        <option key={service.title} value={service.title}>{service.title} — {formatNaira(service.price)}</option>
                      ))}
                    </select>
                  </label>
                  <div className="booking-form-grid">
                    <label>DATE<input required type="date" min={new Date().toISOString().split("T")[0]} value={booking.date} onChange={(e) => updateBooking("date", e.target.value)} /></label>
                    <label>PREFERRED TIME<input required type="time" value={booking.time} onChange={(e) => updateBooking("time", e.target.value)} /></label>
                  </div>
                  <div className="booking-form-grid">
                    <label>FULL NAME<input required type="text" placeholder="Your name" value={booking.name} onChange={(e) => updateBooking("name", e.target.value)} /></label>
                    <label>PHONE / WHATSAPP<input required type="tel" placeholder="080..." value={booking.phone} onChange={(e) => updateBooking("phone", e.target.value)} /></label>
                  </div>
                  <label>EMAIL<input required type="email" placeholder="you@example.com" value={booking.email} onChange={(e) => updateBooking("email", e.target.value)} /></label>
                  <label>NOTES / SONG DETAILS<textarea rows={3} placeholder="Tell us anything we should know before the session..." value={booking.notes} onChange={(e) => updateBooking("notes", e.target.value)} /></label>
                  <div className="payment-options">
                    <button type="button" className={booking.payment === "deposit" ? "payment-option active" : "payment-option"} onClick={() => updateBooking("payment", "deposit")}><span>50% DEPOSIT</span><strong>{formatNaira(selectedService.price * 0.5)}</strong><small>Secure your booking</small></button>
                    <button type="button" className={booking.payment === "full" ? "payment-option active" : "payment-option"} onClick={() => updateBooking("payment", "full")}><span>FULL PAYMENT</span><strong>{formatNaira(selectedService.price)}</strong><small>Pay in full</small></button>
                  </div>
                  <div className="booking-total"><span>AMOUNT DUE</span><strong>{formatNaira(amountDue)}</strong></div>
                  <button className="button red booking-submit" type="submit" disabled={paymentProcessing}>
                    {paymentProcessing ? "OPENING PAYSTACK..." : `PAY ${formatNaira(amountDue)} WITH PAYSTACK →`}
                  </button>
                  {paymentError && <p className="booking-payment-error" role="alert">{paymentError}</p>}
                  <p className="booking-payment-note">Secure payment is processed by Paystack. Your booking is confirmed only after the payment is verified.</p>
                </form>
              </>
            ) : (
              <div className="booking-success">
                <div className="success-mark">✓</div>
                <div className="section-number">BOOKING REQUEST SENT</div>
                <h2>YOU'RE ON<br /><span>THE LIST.</span></h2>
                <p>Your payment has been received and verified. Galaxy Fire Studios will contact you to confirm your session slot.</p>
                {paymentReference && <p className="booking-reference">PAYMENT REFERENCE: <strong>{paymentReference}</strong></p>}
                <div className="booking-success-actions">
                  <a className="button outline" href={`https://wa.me/2348035345977?text=${encodeURIComponent(`Hi Galaxy Fire Studios, I just paid for ${booking.service}. Payment reference: ${paymentReference}. My preferred date/time is ${booking.date} at ${booking.time}.`)}`} target="_blank" rel="noreferrer">MESSAGE US ON WHATSAPP</a>
                  <button type="button" className="button red" onClick={closeBooking}>DONE</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer id="contact">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo">
              <img src={logoImg} alt="Galaxy Studios logo" className="logo-img" />
              <div>
                <div className="logo-title">GALAXY FIRE</div>
                <div className="logo-sub">STUDIOS · EST. 2020</div>
              </div>
            </div>
            <p>Record. Create. Ignite.</p>
          </div>
          <div className="footer-links">
            <div>
              <span>EXPLORE</span>
              <a href="#home">Home</a>
              <a href="#studio">Studio</a>
              <a href="#services">Services</a>
              <a href="#booking">Book a Session</a>
              <a href="#culture" onClick={enterForTheCulture}>For the Culture</a>
              <a href="#beats">Beats</a>
              <a href="#shop">Shop</a>
            </div>
            <div>
              <span>CONTACT</span>
              <a href="#booking">Book a Session</a>
              <a href="mailto:galaxyfirestudios@gmail.com">Email Us</a>
              <a href="https://wa.me/2348035345977">WhatsApp</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 GALAXY FIRE STUDIOS</span>
          <span>EST. 2020 · NIGERIA</span>
        </div>
      </footer>


      
    </div>
  );
}
