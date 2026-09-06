const fs = require("fs");

const path = "src/App.tsx";
const content = fs.readFileSync(path, "utf8");

function replaceOnce(source, oldText, newText, label) {
  const count = source.split(oldText).length - 1;

  if (count !== 1) {
    throw new Error(
      `STOP: ${label} expected exactly 1 match, found ${count}. No file was written.`
    );
  }

  return source.replace(oldText, newText);
}

let updated = content;

const newline = content.includes("\r\n") ? "\r\n" : "\n";

/*
 * ------------------------------------------------------------
 * 1. Add submission state
 * ------------------------------------------------------------
 */

const stateAnchor =
  `  const [newsletterEmail, setNewsletterEmail] = useState("");${newline}` +
  `  const [newsletterMessage, setNewsletterMessage] = useState("");`;

const stateAddition =
  `${stateAnchor}${newline}` +
  `  const [submissionOpen, setSubmissionOpen] = useState(false);${newline}` +
  `  const [submissionName, setSubmissionName] = useState("");${newline}` +
  `  const [submissionEmail, setSubmissionEmail] = useState("");${newline}` +
  `  const [submissionArtist, setSubmissionArtist] = useState("");${newline}` +
  `  const [submissionType, setSubmissionType] = useState("Music");${newline}` +
  `  const [submissionTitle, setSubmissionTitle] = useState("");${newline}` +
  `  const [submissionDescription, setSubmissionDescription] = useState("");${newline}` +
  `  const [submissionLink, setSubmissionLink] = useState("");${newline}` +
  `  const [submissionSocial, setSubmissionSocial] = useState("");${newline}` +
  `  const [submissionAdditional, setSubmissionAdditional] = useState("");${newline}` +
  `  const [submissionMessage, setSubmissionMessage] = useState("");`;

updated = replaceOnce(
  updated,
  stateAnchor,
  stateAddition,
  "submission state"
);

/*
 * ------------------------------------------------------------
 * 2. Add submission handler
 * ------------------------------------------------------------
 */

const newsletterEnd =
  `  const submitNewsletter = (${newline}` +
  `    event: React.FormEvent${newline}` +
  `  ) => {${newline}` +
  `    event.preventDefault();${newline}${newline}` +
  `    if (${newline}` +
  `      !newsletterEmail.includes(${newline}` +
  `        "@"${newline}` +
  `      ) {${newline}` +
  `      setNewsletterMessage(${newline}` +
  `        "Enter a valid email address."${newline}` +
  `      );${newline}` +
  `      return;${newline}` +
  `    }${newline}${newline}` +
  `    setNewsletterMessage(${newline}` +
  `      "You're on the list. Welcome to the movement."${newline}` +
  `    );${newline}${newline}` +
  `    setNewsletterEmail("");${newline}` +
  `  };`;

const submissionHandler =
  `${newsletterEnd}${newline}${newline}` +
  `  const submitContent = (${newline}` +
  `    event: React.FormEvent${newline}` +
  `  ) => {${newline}` +
  `    event.preventDefault();${newline}${newline}` +
  `    if (${newline}` +
  `      !submissionName.trim() ||${newline}` +
  `      !submissionEmail.includes("@") ||${newline}` +
  `      !submissionTitle.trim() ||${newline}` +
  `      !submissionDescription.trim() ||${newline}` +
  `      !submissionLink.trim()${newline}` +
  `    ) {${newline}` +
  `      setSubmissionMessage(${newline}` +
  `        "Please complete all required fields."${newline}` +
  `      );${newline}` +
  `      return;${newline}` +
  `    }${newline}${newline}` +
  `    const subject = encodeURIComponent(${newline}` +
  `      \`FTC CONTENT SUBMISSION — \${submissionType} — \${submissionTitle.trim()}\`${newline}` +
  `    );${newline}${newline}` +
  `    const body = encodeURIComponent(${newline}` +
  `      [${newline}` +
  `        "FOR THE CULTURE CONTENT SUBMISSION",${newline}` +
  `        "",${newline}` +
  `        \`Name: \${submissionName.trim()}\`,${newline}` +
  `        \`Email: \${submissionEmail.trim()}\`,${newline}` +
  `        \`Artist / Brand / Organisation: \${submissionArtist.trim() || "Not provided"}\`,${newline}` +
  `        \`Content Type: \${submissionType}\`,${newline}` +
  `        \`Title: \${submissionTitle.trim()}\`,${newline}` +
  `        "",${newline}` +
  `        "Description:",${newline}` +
  `        submissionDescription.trim(),${newline}` +
  `        "",${newline}` +
  `        \`Content Link: \${submissionLink.trim()}\`,${newline}` +
  `        \`Social Handle(s): \${submissionSocial.trim() || "Not provided"}\`,${newline}` +
  `        "",${newline}` +
  `        "Additional Information:",${newline}` +
  `        submissionAdditional.trim() || "Not provided",${newline}` +
  `      ].join("\\n")${newline}` +
  `    );${newline}${newline}` +
  `    window.location.href =${newline}` +
  `      \`mailto:fortheculture184@gmail.com?subject=\${subject}&body=\${body}\`;${newline}` +
  `  };`;

updated = replaceOnce(
  updated,
  newsletterEnd,
  submissionHandler,
  "submitNewsletter handler"
);

/*
 * ------------------------------------------------------------
 * 3. Replace Originals CTA
 * ------------------------------------------------------------
 */

const ctaRegex =
  /<a\s+className="secondary-button"\s+href="#events"\s*>\s*EXPLORE ORIGINALS\s*(?:→|â†’)\s*<\/a>/;

const ctaMatches = updated.match(ctaRegex);

if (!ctaMatches || ctaMatches.length !== 1) {
  throw new Error(
    `STOP: FTC Originals CTA expected exactly 1 match, found ${ctaMatches ? ctaMatches.length : 0}. No file was written.`
  );
}

const newCta =
  `<button${newline}` +
  `  type="button"${newline}` +
  `  className="secondary-button"${newline}` +
  `  onClick={() => {${newline}` +
  `    setSubmissionMessage("");${newline}` +
  `    setSubmissionOpen(true);${newline}` +
  `  }}${newline}` +
  `>${newline}` +
  `  SUBMIT CONTENT →${newline}` +
  `</button>`;

updated = updated.replace(ctaRegex, newCta);

/*
 * ------------------------------------------------------------
 * 4. Replace reader image with actual video player
 * ------------------------------------------------------------
 */

const readerMediaRegex =
  /\s+<img\s+src=\{safeImage\(\s+readerStory\s+\)\}\s+alt=\{storyTitle\(\s+readerStory\s+\)\}\s*\/>/;

const readerMediaMatches = updated.match(readerMediaRegex);

if (!readerMediaMatches || readerMediaMatches.length !== 1) {
  throw new Error(
    `STOP: reader media expected exactly 1 match, found ${readerMediaMatches ? readerMediaMatches.length : 0}. No file was written.`
  );
}

const newReaderMedia =
  `${newline}      {getVideoEmbedUrl(readerStory) ? (` +
  `${newline}        <div` +
  `${newline}          style={{` +
  `${newline}            position: "relative",` +
  `${newline}            width: "100%",` +
  `${newline}            aspectRatio: "16 / 9",` +
  `${newline}            overflow: "hidden",` +
  `${newline}            background: "#000",` +
  `${newline}          }}` +
  `${newline}        >` +
  `${newline}          <iframe` +
  `${newline}            src={getVideoEmbedUrl(readerStory)}` +
  `${newline}            title={storyTitle(readerStory)}` +
  `${newline}            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"` +
  `${newline}            allowFullScreen` +
  `${newline}            style={{` +
  `${newline}              width: "100%",` +
  `${newline}              height: "100%",` +
  `${newline}              border: 0,` +
  `${newline}            }}` +
  `${newline}          />` +
  `${newline}        </div>` +
  `${newline}      ) : (` +
  `${newline}        <img` +
  `${newline}          src={safeImage(` +
  `${newline}            readerStory` +
  `${newline}          )}` +
  `${newline}          alt={storyTitle(` +
  `${newline}            readerStory` +
  `${newline}          )}` +
  `${newline}        />` +
  `${newline}      )}`;

updated = updated.replace(readerMediaRegex, newReaderMedia);

/*
 * ------------------------------------------------------------
 * 5. Add submission modal before readerStory
 * ------------------------------------------------------------
 */

const readerMarker = `${newline}      {readerStory && (`;

const readerMarkerCount =
  updated.split(readerMarker).length - 1;

if (readerMarkerCount !== 1) {
  throw new Error(
    `STOP: reader marker expected exactly 1 match, found ${readerMarkerCount}. No file was written.`
  );
}

const submissionModal =
  `${newline}      {submissionOpen && (` +
  `${newline}        <div` +
  `${newline}          className="reader-overlay"` +
  `${newline}          role="dialog"` +
  `${newline}          aria-modal="true"` +
  `${newline}          aria-labelledby="submission-title"` +
  `${newline}        >` +
  `${newline}          <button` +
  `${newline}            type="button"` +
  `${newline}            className="reader-backdrop"` +
  `${newline}            onClick={() => setSubmissionOpen(false)}` +
  `${newline}            aria-label="Close submission form"` +
  `${newline}          />` +
  `${newline}` +
  `${newline}          <article className="reader-card">` +
  `${newline}            <button` +
  `${newline}              type="button"` +
  `${newline}              className="reader-close"` +
  `${newline}              onClick={() => setSubmissionOpen(false)}` +
  `${newline}              aria-label="Close"` +
  `${newline}            >` +
  `${newline}              ×` +
  `${newline}            </button>` +
  `${newline}` +
  `${newline}            <div className="reader-content">` +
  `${newline}              <div className="reader-meta">` +
  `${newline}                <span>FTC SUBMISSIONS</span>` +
  `${newline}                <span>FOR THE CULTURE</span>` +
  `${newline}              </div>` +
  `${newline}` +
  `${newline}              <h2 id="submission-title">` +
  `${newline}                SUBMIT CONTENT` +
  `${newline}              </h2>` +
  `${newline}` +
  `${newline}              <p className="reader-dek">` +
  `${newline}                Have something the culture should see, hear or experience?` +
  `${newline}                Send it to FTC for consideration.` +
  `${newline}              </p>` +
  `${newline}` +
  `${newline}              <form` +
  `${newline}                onSubmit={submitContent}` +
  `${newline}                style={{` +
  `${newline}                  display: "grid",` +
  `${newline}                  gap: "1rem",` +
  `${newline}                }}` +
  `${newline}              >` +
  `${newline}                <input` +
  `${newline}                  type="text"` +
  `${newline}                  value={submissionName}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionName(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  placeholder="Your name *"` +
  `${newline}                  aria-label="Your name"` +
  `${newline}                  required` +
  `${newline}                />` +
  `${newline}` +
  `${newline}                <input` +
  `${newline}                  type="email"` +
  `${newline}                  value={submissionEmail}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionEmail(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  placeholder="Your email *"` +
  `${newline}                  aria-label="Your email"` +
  `${newline}                  required` +
  `${newline}                />` +
  `${newline}` +
  `${newline}                <input` +
  `${newline}                  type="text"` +
  `${newline}                  value={submissionArtist}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionArtist(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  placeholder="Artist / Brand / Organisation"` +
  `${newline}                  aria-label="Artist, brand or organisation"` +
  `${newline}                />` +
  `${newline}` +
  `${newline}                <select` +
  `${newline}                  value={submissionType}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionType(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  aria-label="Content type"` +
  `${newline}                >` +
  `${newline}                  <option value="Music">Music</option>` +
  `${newline}                  <option value="Music Video">Music Video</option>` +
  `${newline}                  <option value="Film / Short Film">Film / Short Film</option>` +
  `${newline}                  <option value="Interview">Interview</option>` +
  `${newline}                  <option value="Art / Photography">Art / Photography</option>` +
  `${newline}                  <option value="Fashion">Fashion</option>` +
  `${newline}                  <option value="Event">Event</option>` +
  `${newline}                  <option value="Editorial / Article">Editorial / Article</option>` +
  `${newline}                  <option value="Creative Project">Creative Project</option>` +
  `${newline}                  <option value="Other">Other</option>` +
  `${newline}                </select>` +
  `${newline}` +
  `${newline}                <input` +
  `${newline}                  type="text"` +
  `${newline}                  value={submissionTitle}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionTitle(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  placeholder="Submission title *"` +
  `${newline}                  aria-label="Submission title"` +
  `${newline}                  required` +
  `${newline}                />` +
  `${newline}` +
  `${newline}                <textarea` +
  `${newline}                  value={submissionDescription}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionDescription(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  placeholder="Tell FTC about your submission *"` +
  `${newline}                  aria-label="Submission description"` +
  `${newline}                  rows={5}` +
  `${newline}                  required` +
  `${newline}                />` +
  `${newline}` +
  `${newline}                <input` +
  `${newline}                  type="url"` +
  `${newline}                  value={submissionLink}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionLink(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  placeholder="Content link *"` +
  `${newline}                  aria-label="Content link"` +
  `${newline}                  required` +
  `${newline}                />` +
  `${newline}` +
  `${newline}                <input` +
  `${newline}                  type="text"` +
  `${newline}                  value={submissionSocial}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionSocial(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  placeholder="Social handle(s)"` +
  `${newline}                  aria-label="Social media handles"` +
  `${newline}                />` +
  `${newline}` +
  `${newline}                <textarea` +
  `${newline}                  value={submissionAdditional}` +
  `${newline}                  onChange={(event) =>` +
  `${newline}                    setSubmissionAdditional(event.target.value)` +
  `${newline}                  }` +
  `${newline}                  placeholder="Anything else FTC should know?"` +
  `${newline}                  aria-label="Additional information"` +
  `${newline}                  rows={4}` +
  `${newline}                />` +
  `${newline}` +
  `${newline}                <button` +
  `${newline}                  type="submit"` +
  `${newline}                  className="primary-button"` +
  `${newline}                >` +
  `${newline}                  SEND SUBMISSION →` +
  `${newline}                </button>` +
  `${newline}` +
  `${newline}                {submissionMessage && (` +
  `${newline}                  <small>` +
  `${newline}                    {submissionMessage}` +
  `${newline}                  </small>` +
  `${newline}                )}` +
  `${newline}              </form>` +
  `${newline}            </div>` +
  `${newline}          </article>` +
  `${newline}        </div>` +
  `${newline}      )}`;

updated = updated.replace(
  readerMarker,
  submissionModal + readerMarker
);

/*
 * ------------------------------------------------------------
 * 6. Final verification
 * ------------------------------------------------------------
 */

const requiredPatterns = [
  ["submission state", /const \[submissionOpen, setSubmissionOpen\]/],
  ["submission handler", /const submitContent = \(/],
  ["SUBMIT CONTENT", /SUBMIT CONTENT/],
  ["reader iframe", /getVideoEmbedUrl\(readerStory\)/],
  ["FTC submission email", /mailto:fortheculture184@gmail\.com/],
];

for (const [label, pattern] of requiredPatterns) {
  if (!pattern.test(updated)) {
    throw new Error(
      `STOP: final verification failed for ${label}. No file was written.`
    );
  }
}

/*
 * Do not write until every check above has passed.
 */
fs.writeFileSync(path, updated, "utf8");

console.log(
  "SUCCESS: FTC video popup + SUBMIT CONTENT patch applied safely."
);
