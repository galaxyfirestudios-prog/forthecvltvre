import { useEffect, useMemo, useRef, useState } from "react";
import cultureArt from "@/imports/for-the-culture.webp";

type Story = {
  id?: string;
  headline?: string;
  title?: string;
  dek?: string;
  body?: string;
  category?: string;
  source_name?: string;
  source_url?: string;
  image_url?: string;
  published_at?: string;
};

type Track = {
  artist?: string;
  title?: string;
  show?: string;
  host?: string;
  genre?: string;
  src: string;
  poster?: string;
};

type RadioCandidate = {
  track: Track;
  index: number;
  key: string;
};

const fallbackTrack: Track = {
  artist: "FOR THE CULTURE RADIO",
  title: "Waiting for the next transmission…",
  show: "FOR THE CULTURE LIVE",
  host: "DJ NEBULAE",
  src: "",
};

function formatDate(value?: string) {
  if (!value) return "LATEST";

  const time = Date.parse(value);

  if (!time) return "LATEST";

  return new Date(time).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadedSrcRef = useRef("");
  const playRequestRef = useRef(0);
  const radioAdvancingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const [stories, setStories] = useState<Story[]>([]);
  const [feedStatus, setFeedStatus] = useState<
    "loading" | "ready" | "empty" | "error"
  >("loading");

  const [readerStory, setReaderStory] = useState<Story | null>(null);

  const [radioPlaylist, setRadioPlaylist] = useState<Track[]>([]);
  const [radioIndex, setRadioIndex] = useState(-1);
  const [radioHistory, setRadioHistory] = useState<Track[]>([]);

  const [playedKeys, setPlayedKeys] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("ftc-radio-played-keys") || "[]";
      const value = JSON.parse(raw);

      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  });

  const [radioPlaying, setRadioPlaying] = useState(false);

  const [radioVolume, setRadioVolume] = useState(() => {
    try {
      const saved = localStorage.getItem("ftc-radio-volume");

      if (saved !== null) {
        const parsed = Number(saved);

        if (Number.isFinite(parsed)) {
          return Math.min(1, Math.max(0, parsed));
        }
      }
    } catch {}

    return 0.85;
  });

  /*
   * NOTE:
   *
   * There is intentionally NO radio drawer/popup state anymore.
   * The compact now-playing bar is the only radio player UI.
   */

  const [radioStreamUrl, setRadioStreamUrl] = useState(
    (import.meta.env.VITE_RADIO_STREAM_URL || "").trim()
  );

  const [radioPausedByUser, setRadioPausedByUser] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");

  const radioTrack = radioPlaylist[radioIndex] || fallbackTrack;

  /*
   * ------------------------------------------------------------
   * CONTENT HELPERS
   * ------------------------------------------------------------
   */

  const storyTitle = (story?: Story) =>
    story?.headline || story?.title || "Latest from the culture";

  const storyImage = (story?: Story) => story?.image_url || "";

  const storyKey = (story: Story) =>
    story.source_url || story.id || storyTitle(story);

  const safeImage = (story: Story | undefined) =>
    storyImage(story) || cultureArt;

  /*
   * ------------------------------------------------------------
   * RADIO ENGINE
   * ------------------------------------------------------------
   */

  const getTrackKey = (track: Track) =>
    track.src || `${track.artist || ""}-${track.title || ""}`;

  const getArtistKey = (track: Track) =>
    String(track.artist || "")
      .toLowerCase()
      .trim();

  const buildTrackSource = (track: Track) => {
    const base = import.meta.env.BASE_URL || "/";

    return `${base.replace(/\/$/, "")}/${track.src.replace(/^\//, "")}`;
  };

  const clearRadioRetry = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  /*
   * ------------------------------------------------------------
   * PLAY EXACT CURRENT TRACK
   * ------------------------------------------------------------
   *
   * This function NEVER chooses another track.
   *
   * If the same source is already loaded, audio.play()
   * simply resumes the existing track.
   */

  const playTrack = async (
    index: number,
    userInitiated = false
  ): Promise<boolean> => {
    const audio = audioRef.current;
    const track = radioPlaylist[index];

    if (!audio || !track?.src) {
      return false;
    }

    const requestId = ++playRequestRef.current;

    clearRadioRetry();

    if (userInitiated) {
      setRadioPausedByUser(false);
    }

    setRadioIndex(index);

    const src = buildTrackSource(track);
    const absolute = new URL(src, window.location.href).href;

    /*
     * CRITICAL:
     *
     * Only load the audio source when the source actually changes.
     *
     * This prevents PLAYING LIVE from restarting/changing tracks.
     */

    if (
      loadedSrcRef.current !== src ||
      audio.src !== absolute
    ) {
      try {
        audio.pause();
      } catch {}

      audio.src = src;
      loadedSrcRef.current = src;

      try {
        audio.load();
      } catch {}
    }

    audio.volume = radioVolume;

    try {
      await audio.play();

      if (requestId !== playRequestRef.current) {
        return false;
      }

      setRadioPlaying(true);

      return true;
    } catch {
      if (requestId === playRequestRef.current) {
        setRadioPlaying(false);
      }

      return false;
    }
  };

  /*
   * ------------------------------------------------------------
   * START / RESUME RADIO
   * ------------------------------------------------------------
   *
   * If a current track exists, this ALWAYS resumes that exact
   * track. It does not randomly select another one.
   */

  const startRadio = async (
    userInitiated = false
  ): Promise<boolean> => {
    clearRadioRetry();

    if (userInitiated) {
      setRadioPausedByUser(false);
    }

    /*
     * LOCAL PLAYLIST MODE
     */

    if (radioPlaylist.length) {
      const validIndex =
        radioIndex >= 0 &&
        radioIndex < radioPlaylist.length;

      /*
       * CURRENT TRACK EXISTS.
       *
       * Do not choose another track.
       */

      if (validIndex) {
        const audio = audioRef.current;

        /*
         * If already playing, simply keep playing it.
         */

        if (audio && !audio.paused) {
          setRadioPlaying(true);
          return true;
        }

        /*
         * Otherwise resume the SAME track.
         */

        return playTrack(
          radioIndex,
          userInitiated
        );
      }

      /*
       * ONLY choose a random track when the station
       * has never selected a current track.
       */

      const played = new Set(playedKeys);

      const recent = new Set(
        radioHistory
          .slice(0, 8)
          .map(getTrackKey)
      );

      const fresh = radioPlaylist
        .map((track, index) => ({
          track,
          index,
          key: getTrackKey(track),
        }))
        .filter(
          ({ key }) =>
            !played.has(key) &&
            !recent.has(key)
        );

      const pool = fresh.length
        ? fresh
        : radioPlaylist.map(
            (track, index) => ({
              track,
              index,
              key: getTrackKey(track),
            })
          );

      const chosen =
        pool[
          Math.floor(
            Math.random() * pool.length
          )
        ];

      if (!chosen) {
        return false;
      }

      setPlayedKeys((current) =>
        Array.from(
          new Set([
            ...current,
            chosen.key,
          ])
        ).slice(-200)
      );

      return playTrack(
        chosen.index,
        userInitiated
      );
    }

    /*
     * ----------------------------------------------------------
     * EXTERNAL LIVE STREAM MODE
     * ----------------------------------------------------------
     */

    if (
      !radioStreamUrl ||
      !audioRef.current
    ) {
      return false;
    }

    const requestId =
      ++playRequestRef.current;

    const audio =
      audioRef.current;

    /*
     * Do not reload an already-loaded stream.
     */

    if (
      loadedSrcRef.current !==
        radioStreamUrl ||
      !audio.src
    ) {
      try {
        audio.pause();
      } catch {}

      audio.src = radioStreamUrl;
      loadedSrcRef.current =
        radioStreamUrl;

      try {
        audio.load();
      } catch {}
    }

    audio.volume = radioVolume;

    try {
      await audio.play();

      if (
        requestId !==
        playRequestRef.current
      ) {
        return false;
      }

      setRadioPlaying(true);

      return true;
    } catch {
      if (
        requestId ===
        playRequestRef.current
      ) {
        setRadioPlaying(false);
      }

      return false;
    }
  };

  /*
   * ------------------------------------------------------------
   * PAUSE
   * ------------------------------------------------------------
   */

  const pauseRadio = () => {
    clearRadioRetry();

    /*
     * Invalidate pending play requests.
     */

    playRequestRef.current += 1;

    try {
      audioRef.current?.pause();
    } catch {}

    /*
     * Do NOT reset currentTime.
     */

    setRadioPlaying(false);
    setRadioPausedByUser(true);
  };

  /*
   * ------------------------------------------------------------
   * PLAY / PAUSE ONLY
   * ------------------------------------------------------------
   *
   * There is deliberately NO next or previous behavior.
   */

  const toggleRadio = () => {
    if (radioPlaying) {
      pauseRadio();
      return;
    }

    void startRadio(true);
  };

  /*
   * ------------------------------------------------------------
   * RADIO AUTOMATIC ADVANCEMENT
   * ------------------------------------------------------------
   *
   * The ONLY normal mechanism allowed to change tracks.
   *
   * This happens after the current song naturally ends.
   */

  const advanceRadio = async () => {
    if (!radioPlaylist.length) {
      return;
    }

    if (radioAdvancingRef.current) {
      return;
    }

    if (radioPausedByUser) {
      return;
    }

    radioAdvancingRef.current = true;

    try {
      const current =
        radioPlaylist[radioIndex] ||
        radioTrack;

      const currentKey =
        getTrackKey(current);

      if (current.src) {
        const nextHistory = [
          current,
          ...radioHistory.filter(
            (item) =>
              getTrackKey(item) !==
              currentKey
          ),
        ].slice(0, 8);

        setRadioHistory(
          nextHistory
        );

        try {
          localStorage.setItem(
            "ftc-radio-history",
            JSON.stringify(
              nextHistory
            )
          );
        } catch {}
      }

      let played = new Set(
        [
          ...playedKeys,
          currentKey,
        ].filter(Boolean)
      );

      let candidates: RadioCandidate[] =
        radioPlaylist
          .map((track, index) => ({
            track,
            index,
            key: getTrackKey(track),
          }))
          .filter(
            ({ key }) =>
              key !== currentKey &&
              !played.has(key)
          );

      /*
       * Entire library has been heard.
       * Start a fresh rotation.
       */

      if (!candidates.length) {
        played = new Set(
          currentKey
            ? [currentKey]
            : []
        );

        setPlayedKeys(
          currentKey
            ? [currentKey]
            : []
        );

        candidates =
          radioPlaylist
            .map(
              (
                track,
                index
              ) => ({
                track,
                index,
                key: getTrackKey(
                  track
                ),
              })
            )
            .filter(
              ({ key }) =>
                key !==
                currentKey
            );
      }

      /*
       * Prefer a different artist from the current
       * and most recent tracks.
       */

      const recentArtists =
        new Set(
          [
            current,
            ...radioHistory.slice(
              0,
              2
            ),
          ]
            .map(
              getArtistKey
            )
            .filter(Boolean)
        );

      const differentArtist =
        candidates.filter(
          ({ track }) =>
            !recentArtists.has(
              getArtistKey(
                track
              )
            )
        );

      const pool =
        differentArtist.length
          ? differentArtist
          : candidates;

      const shuffled = [
        ...pool,
      ].sort(
        () =>
          Math.random() -
          0.5
      );

      let started = false;

      /*
       * Try candidates until one successfully starts.
       */

      for (const next of shuffled) {
        if (radioPausedByUser) {
          break;
        }

        const success =
          await playTrack(
            next.index
          );

        if (success) {
          started = true;

          setPlayedKeys(
            (currentPlayed) =>
              Array.from(
                new Set([
                  ...currentPlayed,
                  next.key,
                ])
              ).slice(-200)
          );

          break;
        }
      }

      /*
       * Retry if all candidates failed.
       */

      if (
        !started &&
        !radioPausedByUser
      ) {
        setRadioPlaying(false);

        clearRadioRetry();

        retryTimerRef.current =
          setTimeout(() => {
            retryTimerRef.current =
              null;

            if (
              !radioPausedByUser
            ) {
              void advanceRadio();
            }
          }, 1500);
      }
    } finally {
      radioAdvancingRef.current =
        false;
    }
  };

  /*
   * ------------------------------------------------------------
   * RADIO CONFIG + PLAYLIST
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    const base =
      import.meta.env.BASE_URL ||
      "/";

    fetch(
      `${base.replace(
        /\/$/,
        ""
      )}/radio-config.json`,
      {
        cache: "force-cache",
      }
    )
      .then((response) =>
        response.ok
          ? response.json()
          : null
      )
      .then((data) => {
        if (
          !cancelled &&
          typeof data?.streamUrl ===
            "string"
        ) {
          setRadioStreamUrl(
            data.streamUrl.trim()
          );
        }
      })
      .catch(() => {});

    fetch(
      `${base.replace(
        /\/$/,
        ""
      )}/radio-playlist.json`,
      {
        cache: "force-cache",
      }
    )
      .then((response) =>
        response.ok
          ? response.json()
          : null
      )
      .then((data) => {
        if (
          cancelled ||
          !Array.isArray(
            data?.tracks
          )
        ) {
          return;
        }

        const tracks =
          data.tracks.filter(
            (track: Track) =>
              typeof track?.src ===
                "string" &&
              Boolean(track.src)
          );

        if (!tracks.length) {
          return;
        }

        setRadioPlaylist(
          tracks
        );

        /*
         * Select an initial track.
         *
         * Do NOT play automatically.
         */

        setRadioIndex(() => {
          const played =
            new Set(
              playedKeys
            );

          const recent =
            new Set(
              radioHistory
                .slice(0, 8)
                .map(
                  getTrackKey
                )
            );

          const fresh =
            tracks
              .map(
                (
                  track,
                  index
                ) => ({
                  track,
                  index,
                  key: getTrackKey(
                    track
                  ),
                })
              )
              .filter(
                ({
                  key,
                }) =>
                  !played.has(
                    key
                  ) &&
                  !recent.has(
                    key
                  )
              );

          const pool =
            fresh.length
              ? fresh
              : tracks.map(
                  (
                    track,
                    index
                  ) => ({
                    track,
                    index,
                    key: getTrackKey(
                      track
                    ),
                  })
                );

          return (
            pool[
              Math.floor(
                Math.random() *
                  pool.length
              )
            ]?.index ?? 0
          );
        });
      })
      .catch(() => {});

    /*
     * Restore radio history.
     */

    try {
      const raw =
        localStorage.getItem(
          "ftc-radio-history"
        ) || "[]";

      const value =
        JSON.parse(raw);

      if (
        Array.isArray(value)
      ) {
        setRadioHistory(
          value.slice(0, 8)
        );
      }
    } catch {}

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Persist played-track rotation.
   */

  useEffect(() => {
    try {
      localStorage.setItem(
        "ftc-radio-played-keys",
        JSON.stringify(
          playedKeys.slice(
            -200
          )
        )
      );
    } catch {}
  }, [playedKeys]);

  /*
   * Persist volume.
   */

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume =
        radioVolume;
    }

    try {
      localStorage.setItem(
        "ftc-radio-volume",
        String(
          radioVolume
        )
      );
    } catch {}
  }, [radioVolume]);

  /*
   * Cleanup.
   */

  useEffect(() => {
    return () => {
      clearRadioRetry();

      playRequestRef.current += 1;

      try {
        audioRef.current?.pause();
      } catch {}
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * EDITORIAL FEED
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    let timer:
      | ReturnType<typeof setInterval>
      | undefined;

    const loadFeed = async (
      loading = false
    ) => {
      if (loading) {
        setFeedStatus(
          "loading"
        );
      }

      const base =
        import.meta.env.BASE_URL ||
        "/";

      const staticUrl =
        `${base.replace(
          /\/$/,
          ""
        )}/editorial-feed.json`;

      const fetchJson = async (
        url: string,
        cache: RequestCache
      ) => {
        try {
          const response =
            await fetch(
              url,
              {
                headers: {
                  Accept:
                    "application/json",
                },
                cache,
              }
            );

          if (!response.ok) {
            return null;
          }

          const data =
            await response.json();

          return Array.isArray(
            data?.stories
          )
            ? data
            : null;
        } catch {
          return null;
        }
      };

      const [
        staticData,
        apiData,
      ] = await Promise.all([
        fetchJson(
          staticUrl,
          "default"
        ),
        fetchJson(
          "/api/editorial-feed?limit=24",
          "no-store"
        ),
      ]);

      const merged =
        Array.from(
          new Map(
            [
              ...(staticData
                ?.stories || []),
              ...(apiData
                ?.stories || []),
            ].map(
              (
                story: Story,
                index
              ) => [
                storyKey(
                  story
                ) ||
                  `story-${index}`,
                story,
              ]
            )
          ).values()
        )
          .sort(
            (a, b) =>
              (Date.parse(
                b.published_at ||
                  ""
              ) || 0) -
              (Date.parse(
                a.published_at ||
                  ""
              ) || 0)
          )
          .slice(0, 24);

      if (cancelled) {
        return;
      }

      if (merged.length) {
        setStories(
          merged
        );
        setFeedStatus(
          "ready"
        );
      } else {
        setFeedStatus(
          staticData
            ? "empty"
            : "error"
        );
      }
    };

    loadFeed(true);

    timer =
      setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            loadFeed(false);
          }
        },
        5 * 60 * 1000
      );

    const refresh = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadFeed(false);
      }
    };

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    return () => {
      cancelled = true;

      if (timer) {
        clearInterval(
          timer
        );
      }

      document.removeEventListener(
        "visibilitychange",
        refresh
      );
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * STORY READER
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!readerStory) {
      return;
    }

    const close = (
      event: KeyboardEvent
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setReaderStory(
          null
        );
      }
    };

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      close
    );

    return () => {
      document.body.style.overflow =
        "";

      window.removeEventListener(
        "keydown",
        close
      );
    };
  }, [readerStory]);

  /*
   * ------------------------------------------------------------
   * CONTENT
   * ------------------------------------------------------------
   */

  const hero = stories[0];

  const latest =
    stories.slice(1, 4);

  const musicStories =
    useMemo(() => {
      const matching =
        stories.filter(
          (story) =>
            /music|artist|album|single|afrobeats|hip-hop|song|release/i.test(
              `${story.category || ""} ${storyTitle(
                story
              )} ${story.dek || ""}`
            )
        );

      return [
        ...matching,
        ...stories.filter(
          (story) =>
            !matching.includes(
              story
            )
        ),
      ].slice(0, 3);
    }, [stories]);

  const cultureStories =
    useMemo(() => {
      const matching =
        stories.filter(
          (story) =>
            /culture|fashion|art|style|creative|entertainment|film|media/i.test(
              `${story.category || ""} ${storyTitle(
                story
              )} ${story.dek || ""}`
            )
        );

      return [
        ...matching,
        ...stories.filter(
          (story) =>
            !matching.includes(
              story
            )
        ),
      ].slice(0, 3);
    }, [stories]);

  /*
   * ------------------------------------------------------------
   * UP NEXT
   * ------------------------------------------------------------
   *
   * DISPLAY ONLY.
   *
   * No click action.
   * No manual skipping.
   */

  const upNextTracks =
    useMemo(() => {
      if (
        !radioPlaylist.length
      ) {
        return [];
      }

      const currentKey =
        getTrackKey(
          radioTrack
        );

      const recentKeys =
        new Set([
          currentKey,
          ...radioHistory
            .slice(0, 5)
            .map(
              getTrackKey
            ),
          ...playedKeys.slice(
            -10
          ),
        ]);

      const preferred =
        radioPlaylist
          .map(
            (
              track,
              index
            ) => ({
              track,
              index,
              key: getTrackKey(
                track
              ),
            })
          )
          .filter(
            ({ key }) =>
              !recentKeys.has(
                key
              )
          );

      const fallback =
        radioPlaylist
          .map(
            (
              track,
              index
            ) => ({
              track,
              index,
              key: getTrackKey(
                track
              ),
            })
          )
          .filter(
            ({ key }) =>
              key !==
              currentKey
          );

      return (
        preferred.length
          ? preferred
          : fallback
      ).slice(0, 4);
    }, [
      radioPlaylist,
      radioTrack,
      radioHistory,
      playedKeys,
    ]);

  const searchResults =
    useMemo(() => {
      if (
        !searchTerm.trim()
      ) {
        return stories.slice(
          0,
          6
        );
      }

      const term =
        searchTerm.toLowerCase();

      return stories
        .filter((story) =>
          `${storyTitle(
            story
          )} ${
            story.category ||
            ""
          } ${
            story.dek || ""
          } ${
            story.source_name ||
            ""
          }`
            .toLowerCase()
            .includes(term)
        )
        .slice(0, 8);
    }, [
      stories,
      searchTerm,
    ]);

  const openStory = (
    story: Story
  ) => {
    setReaderStory(
      story
    );
  };

  const submitNewsletter = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !newsletterEmail.includes(
        "@"
      )
    ) {
      setNewsletterMessage(
        "Enter a valid email address."
      );
      return;
    }

    setNewsletterMessage(
      "You're on the list. Welcome to the movement."
    );

    setNewsletterEmail("");
  };

  /*
   * ------------------------------------------------------------
   * RADIO DISPLAY HELPERS
   * ------------------------------------------------------------
   */

  const radioPoster =
    radioTrack.poster
      ? `${
          (
            import.meta.env
              .BASE_URL ||
            "/"
          ).replace(
            /\/$/,
            ""
          )
        }/${radioTrack.poster.replace(
          /^\//,
          ""
        )}`
      : cultureArt;

  const radioStatus =
    radioPlaying
      ? "● ON AIR"
      : radioPausedByUser
      ? "RADIO PAUSED"
      : "FOR THE CULTURE RADIO";

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div className="ftc-app">
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        onEnded={() => {
          if (
            !radioPausedByUser
          ) {
            void advanceRadio();
          }
        }}
        onPlay={() => {
          setRadioPlaying(
            true
          );
        }}
        onPause={() => {
          setRadioPlaying(
            false
          );
        }}
        onError={() => {
          setRadioPlaying(
            false
          );

          if (
            radioPausedByUser ||
            !radioPlaylist.length ||
            radioAdvancingRef.current
          ) {
            return;
          }

          clearRadioRetry();

          retryTimerRef.current =
            setTimeout(() => {
              retryTimerRef.current =
                null;

              if (
                !radioPausedByUser
              ) {
                void advanceRadio();
              }
            }, 500);
        }}
      />

      <header className="site-header">
        <a
          className="brand"
          href="#top"
          aria-label="For the Culture home"
        >
          <span className="brand-main">
            FOR THE
          </span>

          <span className="brand-accent">
            CULTURE
          </span>

          <span className="brand-tagline">
            THE SOUND. THE CULTURE. THE MOVEMENT.
          </span>
        </a>

        <nav
          className={`main-nav ${
            menuOpen
              ? "is-open"
              : ""
          }`}
          aria-label="Primary navigation"
        >
          {[
            ["HOME", "#top"],
            ["NEWS", "#news"],
            ["MUSIC", "#music"],
            [
              "ENTERTAINMENT",
              "#entertainment",
            ],
            ["CULTURE", "#culture"],
            ["VIDEOS", "#videos"],

            /*
             * RADIO NOW CONNECTS DIRECTLY TO
             * SECTION 05 / LIVE RADIO.
             */
            ["RADIO", "#radio-section"],

            ["EVENTS", "#events"],
          ].map(
            (
              [label, href],
              index
            ) => (
              <a
                key={label}
                className={
                  index === 0
                    ? "active"
                    : ""
                }
                href={href}
                onClick={() =>
                  setMenuOpen(
                    false
                  )
                }
              >
                {label}
              </a>
            )
          )}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() =>
              setSearchOpen(
                (value) =>
                  !value
              )
            }
            aria-label="Search"
          >
            ⌕
          </button>

          <button
            type="button"
            className="live-pill"
            onClick={() => {
              /*
               * IMPORTANT:
               *
               * This only starts/resumes the
               * existing current track.
               * It does NOT select a new track.
               */
              void startRadio(
                true
              );
            }}
          >
            ● LIVE RADIO
          </button>

          <button
            type="button"
            className="menu-button"
            onClick={() =>
              setMenuOpen(
                (value) =>
                  !value
              )
            }
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="search-panel">
          <div className="search-inner">
            <input
              autoFocus
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target
                    .value
                )
              }
              placeholder="Search news, music, culture…"
              aria-label="Search FTC"
            />

            <button
              type="button"
              onClick={() => {
                setSearchOpen(
                  false
                );

                document
                  .querySelector(
                    "#news"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  });
              }}
            >
              SEARCH
            </button>

            {searchTerm && (
              <div className="search-results">
                {searchResults.length ? (
                  searchResults.map(
                    (
                      story
                    ) => (
                      <button
                        key={storyKey(
                          story
                        )}
                        type="button"
                        onClick={() =>
                          openStory(
                            story
                          )
                        }
                      >
                        {storyTitle(
                          story
                        )}

                        <span>
                          {story.category ||
                            "CULTURE"}
                        </span>
                      </button>
                    )
                  )
                ) : (
                  <p>
                    No stories match
                    that search.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <main id="top">
        <section className="hero-grid">
          <div className="hero-copy">
            <div className="live-kicker">
              ● LIVE NOW
            </div>

            <h1>
              THE SOUND.
              <br />
              <em>THE CULTURE.</em>
              <br />
              THE MOVEMENT.
            </h1>

            <p>
              News, music, culture,
              entertainment and live
              radio from Nigeria,
              Africa and the world.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  void startRadio(
                    true
                  );
                }}
              >
                ▶{" "}
                {radioPlaying
                  ? "PLAYING LIVE"
                  : "LISTEN LIVE"}
              </button>

              <a
                className="secondary-button"
                href="#radio"
              >
                ▣ VIEW SCHEDULE
              </a>
            </div>

            <div
              className="hero-wave"
              aria-hidden="true"
            >
              {Array.from(
                {
                  length: 34,
                },
                (_, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${
                        18 +
                        ((index *
                          29) %
                          70)
                      }%`,
                    }}
                  />
                )
              )}
            </div>
          </div>

          <div className="hero-visual">
            <img
              src={cultureArt}
              alt="For the Culture visual"
              fetchPriority="high"
            />

            <div className="hero-visual-glow" />

            <div className="hero-stamp">
              FOR
              <br />
              THE
              <br />
              <strong>
                CULTURE
              </strong>
            </div>
          </div>

          <aside className="hero-story">
            <span className="story-label">
              {hero
                ? (
                    hero.category ||
                    "NEWS"
                  ).toUpperCase()
                : "EDITORIAL"}
            </span>

            {hero ? (
              <>
                <button
                  type="button"
                  className="hero-story-button"
                  onClick={() =>
                    openStory(
                      hero
                    )
                  }
                >
                  <h2>
                    {storyTitle(
                      hero
                    )}
                  </h2>
                </button>

                <div className="story-meta">
                  {hero.source_name ||
                    "FOR THE CULTURE"}{" "}
                  ·{" "}
                  {formatDate(
                    hero.published_at
                  )}
                </div>

                <p>
                  {hero.dek ||
                    "Fresh stories, voices and movements from across the culture."}
                </p>

                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    openStory(
                      hero
                    )
                  }
                >
                  READ STORY →
                </button>
              </>
            ) : (
              <>
                <h2>
                  The culture is
                  always moving.
                </h2>

                <p>
                  The editorial desk
                  is ready for the next
                  wave. Live stories
                  will appear here
                  automatically when
                  the editorial engine
                  publishes them.
                </p>
              </>
            )}
          </aside>
        </section>

        {/* ----------------------------------------------------
            RADIO NOW PLAYING BAR
        ----------------------------------------------------- */}

        <section
          className="now-playing-bar"
          id="radio"
          aria-label="For the Culture live radio"
        >
          <div className="now-art">
            <img
              src={radioPoster}
              alt="For the Culture Radio"
              onError={(event) => {
                event.currentTarget.src =
                  cultureArt;
              }}
            />
          </div>

          <div className="now-copy">
            <span>
              {radioStatus}
            </span>

            <strong>
              {radioTrack.artist}
            </strong>

            <small>
              {radioTrack.title}
            </small>

            {(radioTrack.show ||
              radioTrack.host ||
              radioTrack.genre) && (
              <div className="now-program">
                {radioTrack.show && (
                  <span>
                    {radioTrack.show}
                  </span>
                )}

                {radioTrack.host && (
                  <span>
                    WITH{" "}
                    {radioTrack.host}
                  </span>
                )}

                {radioTrack.genre && (
                  <span>
                    {radioTrack.genre}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="now-control-group">
            <button
              type="button"
              className="round-control"
              onClick={
                toggleRadio
              }
              aria-label={
                radioPlaying
                  ? "Pause radio"
                  : "Play radio"
              }
            >
              {radioPlaying
                ? "Ⅱ"
                : "▶"}
            </button>

            <span className="station-label">
              LIVE
            </span>
          </div>

          <div
            className="bar-wave"
            aria-hidden="true"
          >
            {Array.from(
              {
                length: 24,
              },
              (_, index) => (
                <i
                  key={index}
                  style={{
                    height: `${
                      20 +
                      ((index *
                        13) %
                        70)
                    }%`,
                  }}
                />
              )
            )}
          </div>

          <div className="now-meta">
            <span className="quality">
              128 KBPS
            </span>

            <label className="compact-volume">
              <span>
                VOL
              </span>

              <input
                aria-label="Radio volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={
                  radioVolume
                }
                onChange={(
                  event
                ) =>
                  setRadioVolume(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              />
            </label>

            <span className="radio-auto-label">
              AUTO
            </span>
          </div>
        </section>

        {/* ----------------------------------------------------
            NEWS
        ----------------------------------------------------- */}

        <section
          className="content-section"
          id="news"
        >
          <div className="section-head">
            <div>
              <span className="eyebrow">
                01 / NEWSROOM
              </span>

              <h2>NEWS</h2>
            </div>

            <a href="#news-grid">
              VIEW ALL →
            </a>
          </div>

          <div className="featured-grid">
            {(
              latest.length
                ? latest
                : [
                    {
                      headline:
                        "The culture is always moving.",
                      dek:
                        "Your latest stories will appear here.",
                      category:
                        "CULTURE",
                    },
                    {
                      headline:
                        "Music. Culture. Entertainment.",
                      dek:
                        "Discover the voices shaping the moment.",
                      category:
                        "MUSIC",
                    },
                    {
                      headline:
                        "FOR THE CULTURE ORIGINALS",
                      dek:
                        "Original conversations, sessions and stories are coming into focus.",
                      category:
                        "ORIGINALS",
                    },
                  ]
            ).map(
              (
                story,
                index
              ) => (
                <article
                  className={`feature-card ${
                    index === 0
                      ? "feature-card-large"
                      : ""
                  }`}
                  key={storyKey(
                    story as Story
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      story.id ||
                      story.source_url
                        ? openStory(
                            story as Story
                          )
                        : undefined
                    }
                  >
                    <img
                      src={safeImage(
                        story as Story
                      )}
                      alt={storyTitle(
                        story as Story
                      )}
                      loading="lazy"
                      decoding="async"
                      onError={(
                        event
                      ) => {
                        event.currentTarget.src =
                          cultureArt;
                      }}
                    />

                    <span className="card-overlay" />

                    <div className="card-copy">
                      <span className="story-label">
                        {(
                          story.category ||
                          "CULTURE"
                        ).toUpperCase()}
                      </span>

                      <h3>
                        {storyTitle(
                          story as Story
                        )}
                      </h3>

                      <small>
                        {story.id
                          ? formatDate(
                              story.published_at
                            )
                          : "COMING SOON"}
                      </small>
                    </div>
                  </button>
                </article>
              )
            )}
          </div>
        </section>

        {/* ----------------------------------------------------
            LATEST
        ----------------------------------------------------- */}

        <section
          className="content-section split-section"
          id="news-grid"
        >
          <div className="section-head">
            <div>
              <span className="eyebrow">
                02 / LATEST
              </span>

              <h2>
                LATEST FROM THE CULTURE
              </h2>
            </div>

            <span className="muted">
              {feedStatus ===
              "ready"
                ? "LIVE EDITORIAL RADAR · NIGERIA · AFRICA · WORLD"
                : feedStatus ===
                  "loading"
                ? "LOADING EDITORIAL RADAR"
                : "EDITORIAL RADAR"}
            </span>
          </div>

          <div className="latest-layout">
            <div className="latest-list">
              {stories
                .slice(0, 6)
                .map(
                  (
                    story,
                    index
                  ) => (
                    <button
                      type="button"
                      className="latest-row"
                      key={storyKey(
                        story
                      )}
                      onClick={() =>
                        openStory(
                          story
                        )
                      }
                    >
                      <span className="latest-number">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <img
                        src={safeImage(
                          story
                        )}
                        alt=""
                        loading="lazy"
                      />

                      <span className="latest-text">
                        <small>
                          {(
                            story.category ||
                            "CULTURE"
                          ).toUpperCase()}{" "}
                          ·{" "}
                          {formatDate(
                            story.published_at
                          )}
                        </small>

                        <strong>
                          {storyTitle(
                            story
                          )}
                        </strong>

                        <span>
                          {story.dek ||
                            "Fresh from the culture radar."}
                        </span>
                      </span>

                      <b>↗</b>
                    </button>
                  )
                )}

              {!stories.length && (
                <div className="empty-feed">
                  <strong>
                    {feedStatus ===
                    "loading"
                      ? "CONNECTING TO THE CULTURE RADAR…"
                      : "THE EDITORIAL DESK IS BETWEEN STORIES."}
                  </strong>

                  <p>
                    When the live feed
                    publishes, this
                    section updates
                    automatically.
                  </p>
                </div>
              )}
            </div>

            <aside className="trend-panel">
              <div className="trend-head">
                <span>
                  TRENDING NOW
                </span>

                <b>03</b>
              </div>

              {stories
                .slice(0, 3)
                .map(
                  (
                    story,
                    index
                  ) => (
                    <button
                      type="button"
                      key={storyKey(
                        story
                      )}
                      onClick={() =>
                        openStory(
                          story
                        )
                      }
                    >
                      <span>
                        {index + 1}
                      </span>

                      <img
                        src={safeImage(
                          story
                        )}
                        alt=""
                      />

                      <div>
                        <strong>
                          {storyTitle(
                            story
                          )}
                        </strong>

                        <small>
                          {(
                            story.category ||
                            "CULTURE"
                          ).toUpperCase()}
                        </small>
                      </div>
                    </button>
                  )
                )}

              {!stories.length && (
                <p className="trend-empty">
                  Trending stories
                  will appear
                  automatically as
                  the editorial feed
                  fills.
                </p>
              )}
            </aside>
          </div>
        </section>

        {/* ----------------------------------------------------
            MUSIC
        ----------------------------------------------------- */}

        <section
          className="content-section"
          id="music"
        >
          <div className="section-head">
            <div>
              <span className="eyebrow">
                03 / SOUND
              </span>

              <h2>
                MUSIC DISCOVERY
              </h2>
            </div>

            <span className="muted">
              NEW MUSIC · TRENDING · AFRICAN SOUND
            </span>
          </div>

          <div className="music-grid">
            {musicStories.map(
              (
                story,
                index
              ) => (
                <article
                  className="music-card"
                  key={storyKey(
                    story
                  )}
                >
                  <img
                    src={safeImage(
                      story
                    )}
                    alt={storyTitle(
                      story
                    )}
                    loading="lazy"
                  />

                  <div>
                    <span>
                      0
                      {index + 1} /{" "}
                      {(
                        story.category ||
                        "MUSIC"
                      ).toUpperCase()}
                    </span>

                    <h3>
                      {storyTitle(
                        story
                      )}
                    </h3>

                    {story.dek && (
                      <p>
                        {story.dek}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openStory(
                          story
                        )
                      }
                    >
                      EXPLORE →
                    </button>
                  </div>
                </article>
              )
            )}

            {!stories.length && (
              <div className="empty-feed">
                <strong>
                  THE MUSIC DESK IS
                  BETWEEN STORIES.
                </strong>

                <p>
                  Music stories will
                  appear automatically
                  as the editorial feed
                  fills.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------
            ENTERTAINMENT
        ----------------------------------------------------- */}

        <section
          className="content-section"
          id="entertainment"
        >
          <div className="section-head">
            <div>
              <span className="eyebrow">
                04 / ENTERTAINMENT
              </span>

              <h2>
                ENTERTAINMENT
              </h2>
            </div>

            <span className="muted">
              CELEBRITY · FILM · TV · EVENTS · TRENDS
            </span>
          </div>

          <div className="culture-grid">
            {stories
              .filter(
                (story) =>
                  /ENTERTAINMENT|FILM|EVENTS|STYLE/i.test(
                    `${
                      story.category ||
                      ""
                    } ${storyTitle(
                      story
                    )}`
                  )
              )
              .slice(0, 4)
              .map(
                (
                  story
                ) => (
                  <article
                    key={storyKey(
                      story
                    )}
                  >
                    <img
                      src={safeImage(
                        story
                      )}
                      alt={storyTitle(
                        story
                      )}
                      loading="lazy"
                    />

                    <div>
                      <span>
                        {(
                          story.category ||
                          "ENTERTAINMENT"
                        ).toUpperCase()}
                      </span>

                      <h3>
                        {storyTitle(
                          story
                        )}
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          openStory(
                            story
                          )
                        }
                      >
                        READ →
                      </button>
                    </div>
                  </article>
                )
              )}
          </div>
        </section>

        {/* ----------------------------------------------------
            RADIO FEATURE — SECTION 05
        ----------------------------------------------------- */}

        <section
          id="radio-section"
          className="radio-feature"
          aria-label="For the Culture live radio"
        >
          <div className="radio-feature-art">
            <img
              src={cultureArt}
              alt="For the Culture Radio"
            />

            <div className="live-badge">
              ● ON AIR
            </div>
          </div>

          <div className="radio-feature-copy">
            <span className="eyebrow">
              05 / LIVE RADIO
            </span>

            <h2>
              THE SOUND
              <br />
              <em>
                NEVER STOPS.
              </em>
            </h2>

            <p>
              FOR THE CULTURE RADIO is
              the live audio layer of the
              Galaxy Fire ecosystem -
              built for records, stories,
              artists, conversations and
              the sounds moving the
              culture. Discover the voices
              shaping Nigeria, Africa and
              the diaspora, with a special
              ear for the next wave coming
              out of Abuja.
            </p>

            <div className="radio-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  void startRadio(
                    true
                  );
                }}
              >
                ▶{" "}
                {radioPlaying
                  ? "PLAYING LIVE"
                  : "LISTEN LIVE"}
              </button>

              <a
                className="secondary-button"
                href="#radio"
              >
                VIEW SCHEDULE
              </a>
            </div>
          </div>

          <div className="radio-side">
            <div className="radio-side-heading">
              <span>
                UP NEXT
              </span>

              <small>
                STATION ROTATION
              </small>
            </div>

            {upNextTracks.map(
              ({
                track,
                index,
              }) => (
                /*
                 * DISPLAY ONLY.
                 *
                 * This is deliberately NOT a button.
                 *
                 * The listener cannot manually
                 * jump forward.
                 */
                <div
                  className="up-next-track"
                  key={`${track.src}-${index}`}
                >
                  <img
                    src={
                      track.poster
                        ? `${
                            (
                              import.meta
                                .env
                                .BASE_URL ||
                              "/"
                            ).replace(
                              /\/$/,
                              ""
                            )
                          }/${track.poster.replace(
                            /^\//,
                            ""
                          )}`
                        : cultureArt
                    }
                    alt=""
                    onError={(
                      event
                    ) => {
                      event.currentTarget.src =
                        cultureArt;
                    }}
                  />

                  <div>
                    <strong>
                      {track.artist}
                    </strong>

                    <small>
                      {track.title}
                    </small>
                  </div>

                  <span className="up-next-status">
                    QUEUED
                  </span>
                </div>
              )
            )}

            {!upNextTracks.length &&
              radioPlaylist.length > 0 && (
                <div className="radio-side-empty">
                  <small>
                    ROTATION LOADING
                  </small>
                </div>
              )}
          </div>
        </section>

        {/* ----------------------------------------------------
            CULTURE
        ----------------------------------------------------- */}

        <section
          className="content-section"
          id="culture"
        >
          <div className="section-head">
            <div>
              <span className="eyebrow">
                06 / CULTURE
              </span>

              <h2>
                MORE THAN MUSIC.
              </h2>
            </div>

            <span className="muted">
              FASHION · ART · LIFESTYLE · AFRICA
            </span>
          </div>

          <div className="culture-grid">
            {cultureStories.map(
              (
                story
              ) => (
                <article
                  key={storyKey(
                    story
                  )}
                >
                  <img
                    src={safeImage(
                      story
                    )}
                    alt={storyTitle(
                      story
                    )}
                    loading="lazy"
                  />

                  <div>
                    <span>
                      {(
                        story.category ||
                        "CULTURE"
                      ).toUpperCase()}
                    </span>

                    <h3>
                      {storyTitle(
                        story
                      )}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        openStory(
                          story
                        )
                      }
                    >
                      READ →
                    </button>
                  </div>
                </article>
              )
            )}

            {!stories.length && (
              <div className="empty-feed">
                <strong>
                  THE CULTURE DESK IS
                  BETWEEN STORIES.
                </strong>

                <p>
                  Culture stories will
                  appear automatically
                  as the editorial feed
                  fills.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------
            ORIGINALS
        ----------------------------------------------------- */}

        <section
          className="originals-section"
          id="videos"
        >
          <div className="originals-copy">
            <span className="eyebrow">
              07 / FTC ORIGINALS
            </span>

            <h2>
              WATCH.
              <br />
              <em>LISTEN.</em>
              <br />
              DISCOVER.
            </h2>

            <p>
              Interviews, studio
              sessions, documentaries,
              culture conversations and
              original video — built to
              give FTC a voice beyond the
              feed.
            </p>

            <a
              className="secondary-button"
              href="#events"
            >
              EXPLORE ORIGINALS →
            </a>
          </div>

          <div className="video-grid">
            {stories
              .slice(0, 4)
              .map(
                (
                  story,
                  index
                ) => (
                  <article
                    key={storyKey(
                      story
                    )}
                  >
                    <img
                      src={safeImage(
                        story
                      )}
                      alt={storyTitle(
                        story
                      )}
                      loading="lazy"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        openStory(
                          story
                        )
                      }
                    >
                      <span>
                        ▶
                      </span>

                      <div>
                        <small>
                          FTC ORIGINALS · 0
                          {index + 1}
                        </small>

                        <strong>
                          {storyTitle(
                            story
                          )}
                        </strong>
                      </div>
                    </button>
                  </article>
                )
              )}

            {!stories.length && (
              <div className="empty-feed">
                <strong>
                  FTC ORIGINALS ARE
                  COMING INTO FOCUS.
                </strong>

                <p>
                  New stories and
                  original media will
                  appear here as they
                  are published.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------
            EVENTS
        ----------------------------------------------------- */}

        <section
          className="events-section"
          id="events"
        >
          <div className="section-head">
            <div>
              <span className="eyebrow">
                08 / EVENTS
              </span>

              <h2>
                THE CULTURE, IRL.
              </h2>
            </div>

            <span className="muted">
              LIVE · COMMUNITY · EXPERIENCES
            </span>
          </div>

          <div className="events-card">
            <div className="event-date">
              <strong>
                FTC
              </strong>

              <span>
                LIVE
              </span>
            </div>

            <div>
              <span className="story-label">
                COMING SOON
              </span>

              <h3>
                LISTENING PARTIES,
                CULTURE NIGHTS & LIVE
                EXPERIENCES
              </h3>

              <p>
                Event listings can plug
                into the platform without
                changing the core
                experience. New dates
                and locations will appear
                here as they are
                published.
              </p>
            </div>

            <a
              href="mailto:fortheculture184@gmail.com"
              className="text-link"
            >
              GET EVENT UPDATES →
            </a>
          </div>
        </section>

        {/* ----------------------------------------------------
            NEWSLETTER
        ----------------------------------------------------- */}

        <section className="newsletter-section">
          <div>
            <span className="eyebrow">
              09 / JOIN THE MOVEMENT
            </span>

            <h2>
              STAY CONNECTED.
            </h2>

            <p>
              Get the latest news,
              updates and exclusive
              stories delivered to you.
            </p>
          </div>

          <form
            onSubmit={
              submitNewsletter
            }
          >
            <input
              type="email"
              value={
                newsletterEmail
              }
              onChange={(
                event
              ) =>
                setNewsletterEmail(
                  event.target
                    .value
                )
              }
              placeholder="Enter your email"
              aria-label="Email address"
            />

            <button type="submit">
              SUBSCRIBE
            </button>

            {newsletterMessage && (
              <small>
                {newsletterMessage}
              </small>
            )}
          </form>

          <div className="socials">
            <span>
              FOLLOW US
            </span>

            <a
              href="https://www.instagram.com/forthecultureondy/?hl=en"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              ◎
            </a>

            <a
              href="https://x.com/forthecult90010?s=11"
              target="_blank"
              rel="noreferrer"
              aria-label="X"
            >
              𝕏
            </a>
          </div>

          <div className="contact-strip">
            <a href="mailto:fortheculture184@gmail.com">
              fortheculture184@gmail.com
            </a>

            <a href="tel:+2348145939698">
              +234 814 593 9698
            </a>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------
          FOOTER
      ------------------------------------------------------- */}

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="brand-main">
            FOR THE
          </span>

          <span className="brand-accent">
            CULTURE
          </span>

          <span className="brand-tagline">
            THE MOVEMENT.
          </span>

          <p className="footer-contact">
            <a href="mailto:fortheculture184@gmail.com">
              fortheculture184@gmail.com
            </a>

            <a href="tel:+2348145939698">
              +234 814 593 9698
            </a>
          </p>
        </div>

        <div className="footer-links">
          <div>
            <span>
              EXPLORE
            </span>

            <a href="#radio">
              Radio
            </a>

            <a href="#news">
              News
            </a>

            <a href="#music">
              Music
            </a>

            <a href="#videos">
              Videos
            </a>
          </div>

          <div>
            <span>
              DISCOVER
            </span>

            <a href="#culture">
              Culture
            </a>

            <a href="#events">
              Events
            </a>

            <a href="#top">
              About
            </a>

            <a href="mailto:fortheculture184@gmail.com">
              Contact
            </a>
          </div>

          <div>
            <span>
              SUPPORT
            </span>

            <a
              href="https://www.instagram.com/forthecultureondy/?hl=en"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>

            <a
              href="https://x.com/forthecult90010?s=11"
              target="_blank"
              rel="noreferrer"
            >
              X
            </a>

            <a href="mailto:fortheculture184@gmail.com">
              Email FTC
            </a>

            <a href="tel:+2348145939698">
              Call FTC
            </a>
          </div>
        </div>

        <blockquote>
          “The culture isn’t just
          what we consume.
          <br />
          It’s what we create.”

          <cite>
            — FOR THE CULTURE
          </cite>
        </blockquote>

        <div className="footer-bottom">
          <span>
            © 2026 FOR THE CULTURE.
            ALL RIGHTS RESERVED.
          </span>

          <span>
            NEWS · MUSIC · CULTURE ·
            ENTERTAINMENT · VIDEO · RADIO
          </span>
        </div>
      </footer>

      {/* ------------------------------------------------------
          IMPORTANT:
          THE LARGE RADIO DRAWER HAS BEEN COMPLETELY REMOVED.
          
          There is NO radio-drawer JSX here.
          The compact now-playing bar above is now the
          ONLY radio player interface.
      ------------------------------------------------------- */}

      {/* ------------------------------------------------------
          STORY READER
      ------------------------------------------------------- */}

      {readerStory && (
        <div
          className="reader-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reader-title"
        >
          <button
            type="button"
            className="reader-backdrop"
            onClick={() =>
              setReaderStory(
                null
              )
            }
            aria-label="Close story"
          />

          <article className="reader-card">
            <button
              type="button"
              className="reader-close"
              onClick={() =>
                setReaderStory(
                  null
                )
              }
              aria-label="Close"
            >
              ×
            </button>

            <img
              src={safeImage(
                readerStory
              )}
              alt={storyTitle(
                readerStory
              )}
            />

            <div className="reader-content">
              <div className="reader-meta">
                <span>
                  {(
                    readerStory.category ||
                    "CULTURE"
                  ).toUpperCase()}
                </span>

                <span>
                  {readerStory.source_name ||
                    "FOR THE CULTURE"}
                </span>

                <span>
                  {formatDate(
                    readerStory.published_at
                  )}
                </span>
              </div>

              <h2 id="reader-title">
                {storyTitle(
                  readerStory
                )}
              </h2>

              <p className="reader-dek">
                {readerStory.dek ||
                  "Fresh from the culture radar."}
              </p>

              <div className="reader-body">
                {(
                  readerStory.body ||
                  readerStory.dek ||
                  "This story is available through the FTC editorial feed."
                )
                  .split(
                    /\n+/
                  )
                  .map(
                    (
                      paragraph,
                      index
                    ) => (
                      <p
                        key={
                          index
                        }
                      >
                        {paragraph}
                      </p>
                    )
                  )}
              </div>

              {readerStory.source_url && (
                <a
                  className="primary-button"
                  href={
                    readerStory.source_url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  READ ORIGINAL SOURCE ↗
                </a>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}