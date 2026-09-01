import { useEffect, useRef, useState } from "react";
import cultureArt from "@/imports/for-the-culture.webp";
import { getCurrentProgramme, getNextProgramme, getTodaySchedule, getHost, formatRadioTime, RADIO_TIME_ZONE } from "./radio/programming";

export default function App() {
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
    try { return Number(localStorage.getItem("ftc-radio-track-index") || "0"); } catch { return 0; }
  });
  const [radioHistory, setRadioHistory] = useState<any[]>([]);
  const [radioPlayedKeys, setRadioPlayedKeys] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("ftc-radio-played-keys") || "[]");
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
    try { localStorage.setItem("ftc-radio-track-index", String(index)); } catch {}

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
          const storedIndex = Number(localStorage.getItem("ftc-radio-track-index") || "0");
          if (Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < tracks.length) {
            restoredIndex = storedIndex;
          }
        } catch {}
        setRadioPlaylist(tracks);
        setRadioTrackIndex(restoredIndex);
        try { localStorage.setItem("ftc-radio-track-index", String(restoredIndex)); } catch {}
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
      const stored = JSON.parse(localStorage.getItem("ftc-radio-history") || "[]");
      if (Array.isArray(stored)) setRadioHistory(stored.slice(0, 8));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("ftc-radio-played-keys", JSON.stringify(radioPlayedKeys.slice(-200))); } catch {}
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
    try { localStorage.setItem("ftc-radio-history", JSON.stringify(nextHistory)); } catch {}

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

  return (
    <div className="site culture-standalone">
      {/* FOR THE CULTURE */}
      <section className="culture-platform" id="culture">
        <div className="culture-platform-topline">
          <span>MUSIC. CULTURE. ENTERTAINMENT. COMMUNITY.</span>
          <span className="culture-platform-live">● LIVE EDITORIAL RADAR &nbsp; / &nbsp; FOR THE CULTURE</span>
        </div>

        <div className="culture-platform-shell">
          <div className="culture-brand-rail">
            <img src={cultureArt} alt="FOR THE CULTURE" className="culture-brand-art" />
            <div className="culture-brand-kicker">INDEPENDENT CULTURE PLATFORM</div>
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
            <p>FOR THE CULTURE RADIO is the live audio layer of the culture platform — built for records, stories, artists, conversations and the sounds moving the culture.</p>
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

      <footer className="culture-standalone-footer">
        <div className="culture-standalone-footer-brand">
          <img src={cultureArt} alt="FOR THE CULTURE" />
          <div>
            <strong>FOR THE CULTURE</strong>
            <span>MUSIC · CULTURE · ENTERTAINMENT · COMMUNITY</span>
          </div>
        </div>
        <p>Stories. Sounds. Identity.</p>
        <span>© 2026 FOR THE CULTURE</span>
      </footer>
    </div>
  );
}
