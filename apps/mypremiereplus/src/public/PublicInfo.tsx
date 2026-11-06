import { appUrl } from "../paths";
import { useEffect, useState } from "react";
import { PRICING, quotePrice } from "../../shared/pricing";
import { fontFamily, splashBackground } from "../appearance";
import Icon from "../admin/Icon";
import StudioAttribution from "../StudioAttribution";
import { LegalLinks } from "./LegalPage";
import "./public.css";

export const euro = (value: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    value,
  );

export function PublicHeader({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="pub-header">
      <a
        className="pub-brand"
        href={appUrl("/about")}
        aria-label="MyPremierePlus, introduction"
      >
        <Icon name="cinema" size={30} />
        <span>
          MY<span className="pub-brand-light">PREMIERE</span>PLUS<sup>+</sup>
        </span>
      </a>
      {!compact && (
        <button
          className="pub-menu"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="public-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      )}
      <nav
        id="public-navigation"
        aria-label="Main navigation"
        className={open ? "is-open" : ""}
      >
        {!compact && (
          <>
            <a href="#your-cinema" onClick={() => setOpen(false)}>
              Your cinema
            </a>
            <a href="#how-it-works" onClick={() => setOpen(false)}>
              How it works
            </a>
            <a href="#pricing" onClick={() => setOpen(false)}>
              Pricing
            </a>
          </>
        )}
        {compact && <a href={appUrl("/about")}>Discover MyPremierePlus</a>}
        <a href={appUrl("/")} className="pub-signin">
          Sign in <Icon name="arrow" size={16} />
        </a>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="pub-footer">
      <div className="pub-wrap">
        <div className="pub-footer-top">
          <a className="pub-brand" href={appUrl("/about")}>
            <Icon name="cinema" size={27} />
            <span>
              MYPREMIEREPLUS<sup>+</sup>
            </span>
          </a>
          <p>
            A little more cinema.
            <br />A lot more you.
          </p>
          <a href={appUrl("/?create=1")}>
            Create your cinema <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="pub-footer-bottom">
          <LegalLinks />
          <span>Local demonstration · fictional artwork · no payments</span>
        </div>
        <p className="pub-stock-credit">
          Demo footage by creators on{" "}
          <a
            href="https://www.pexels.com/license/"
            target="_blank"
            rel="noreferrer"
          >
            Pexels
          </a>{" "}
          and{" "}
          <a
            href="https://mixkit.co/license/#videoFree"
            target="_blank"
            rel="noreferrer"
          >
            Mixkit
          </a>
          . Archive titles are fictional.{" "}
          <a href={appUrl("/legal/legal-notice#stock-credits")}>
            Sources & licences
          </a>
        </p>
        <StudioAttribution />
      </div>
    </footer>
  );
}

const faqs = [
  [
    "What is MyPremierePlus?",
    "A private browser based cinema for your own videos. Add your footage, organise collections, create covers and moments, and invite the people you choose. This version is a working local demonstration with licensed public stock footage and fictional archive titles.",
  ],
  [
    "Who can see my videos?",
    "People sign in to an archive with an owner, editor or viewer account. Administrators can limit individual videos and collections to selected accounts. Viewing profiles personalise the experience; they do not create separate security permissions. Anyone with shared account credentials has that account’s access.",
  ],
  [
    "Can family members send me their footage?",
    "Yes. An administrator can create an upload link with an expiry, file and upload limits. Guests can send a contribution through that link without browsing your library. New contributions wait for administrator review before they become part of the published archive.",
  ],
  [
    "Is this a native television or phone app?",
    "This build runs in a web browser and adapts to large and small screens. It includes a cinema view, playback controls and a TV style interface. It does not claim a published app store application or support for every television browser.",
  ],
  [
    "What does the AI cover studio do?",
    "The local demo creates previews from bundled fictional artwork and your selected title treatment. It does not send your family footage to an AI service. A real external generator or transcription service would need separate configuration, provider information and an appropriate permission flow.",
  ],
  [
    "Can I take my archive with me?",
    "Administrators can export archive metadata, such as titles, collections and descriptions, as JSON. That export does not contain original video or audio files. Keep your own originals and backups; the demo is not a preservation service.",
  ],
  [
    "Will creating a cinema charge me?",
    "No. Account creation, billing details, prices and invoices in this build are demonstrations. No payment processor is connected. The calculator explains an example footage based plan, and does not create a paid subscription.",
  ],
];

export default function PublicInfo() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Your stories. Your cinema. · MyPremierePlus";
    return () => {
      document.title = previousTitle;
    };
  }, []);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [hours, setHours] = useState(10);
  const [palette, setPalette] = useState("midnight");
  const [name, setName] = useState("THE WILLOW FAMILY");
  const [brandFont, setBrandFont] = useState("inter");
  const quote = quotePrice(hours, period);
  function changeHours(value: string) {
    const next = Number(value);
    if (Number.isFinite(next)) setHours(Math.min(1000, Math.max(0, next)));
  }
  return (
    <div className="mpp-public">
      <a className="pub-skip" href="#public-main">
        Skip to content
      </a>
      <PublicHeader />
      <main id="public-main">
        <section className="pub-hero" aria-labelledby="public-title">
          <img
            className="pub-hero-image"
            src={appUrl("/artwork/cinema.png")}
            alt="A warmly lit home cinema overlooking a lake at sunset"
            fetchPriority="high"
          />
          <div className="pub-hero-shade" />
          <div className="pub-wrap pub-hero-content">
            <span className="pub-eyebrow">
              <span /> YOUR FAMILY. CENTRE STAGE.
            </span>
            <h1 id="public-title">
              Your stories.
              <br />
              <em>Your cinema.</em>
            </h1>
            <p>
              Give the films that mean everything
              <br className="pub-desktop-break" /> a place that feels just as
              special.
            </p>
            <div className="pub-actions">
              <a className="pub-button gold" href={appUrl("/?create=1")}>
                Create your cinema <Icon name="arrow" size={20} />
              </a>
              <a className="pub-text-link" href="#how-it-works">
                <span className="pub-circle">
                  <Icon name="play" size={15} />
                </span>{" "}
                Discover the experience
              </a>
            </div>
            <span className="pub-hero-note">
              <Icon name="lock" size={14} /> A private archive, made for your
              people.
            </span>
          </div>
          <div className="pub-hero-caption">
            <span>EVERYDAY MOMENTS. OPENING NIGHT FEELING.</span>
            <span>01 / YOUR OWN BIG SCREEN</span>
          </div>
        </section>

        <section className="pub-intro pub-wrap" id="your-cinema">
          <div>
            <span className="pub-eyebrow">MORE THAN A FOLDER OF FILES</span>
            <h2>
              Some films deserve
              <br />
              <em>a front row.</em>
            </h2>
          </div>
          <div>
            <p>
              The summer you still talk about. The birthday everyone remembers.
              The quiet little moments you almost forgot.
            </p>
            <p>
              Bring your footage together in a cinema that belongs to your
              family, with your name above the door and your stories on the
              screen.
            </p>
          </div>
        </section>

        <section
          className="pub-gallery"
          aria-label="A fictional family film collection"
        >
          <div className="pub-gallery-track">
            {[
              {
                image: "lake",
                title: "A summer by the lake",
                tag: "OUR SUMMERS · 2007",
              },
              {
                image: "garden",
                title: "The day we said yes",
                tag: "CELEBRATIONS · 2022",
              },
              {
                image: "coast",
                title: "The long way home",
                tag: "LITTLE ADVENTURES · 2019",
              },
            ].map((film, i) => (
              <figure key={film.image} className={`pub-film pub-film-${i}`}>
                <img
                  src={appUrl(`/artwork/${film.image}.png`)}
                  alt=""
                  loading="lazy"
                />
                <figcaption>
                  <span>{film.tag}</span>
                  <h3>{film.title}</h3>
                  <span className="pub-film-line" />
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="pub-illustration-label">
            Fictional collection and artwork shown for illustration.
          </p>
        </section>

        <section className="pub-how pub-wrap" id="how-it-works">
          <div className="pub-centered">
            <span className="pub-eyebrow">
              FROM CAMERA ROLL TO OPENING CREDITS
            </span>
            <h2>
              A new home for
              <br />
              <em>everything worth keeping.</em>
            </h2>
          </div>
          <div className="pub-steps">
            <article>
              <span className="pub-step-number">01</span>
              <div className="pub-step-icon">
                <Icon name="upload" size={31} />
              </div>
              <h3>Bring your stories</h3>
              <p>
                Upload your videos, or invite family to contribute through a
                controlled upload link. Review every addition before it joins
                your archive.
              </p>
            </article>
            <article>
              <span className="pub-step-number">02</span>
              <div className="pub-step-icon">
                <Icon name="image" size={31} />
              </div>
              <h3>Make them yours</h3>
              <p>
                Give each film a title, a cover and a place in a collection. Add
                dates, people, stories and small moments you want to find again.
              </p>
            </article>
            <article>
              <span className="pub-step-number">03</span>
              <div className="pub-step-icon">
                <Icon name="tv" size={31} />
              </div>
              <h3>Make a night of it</h3>
              <p>
                Choose a film, settle into Family TV or plan a personal
                premiere. Your family’s memories become something to watch
                together.
              </p>
            </article>
          </div>
        </section>

        <section className="pub-brand-section">
          <div className="pub-wrap pub-brand-layout">
            <div className="pub-editorial">
              <span className="pub-eyebrow">YOUR NAME ABOVE THE DOOR</span>
              <h2>
                It looks like cinema.
                <br />
                <em>It feels like you.</em>
              </h2>
              <p>
                Choose your archive name, a welcome message, a typeface and a
                colour palette. The first screen sets the mood before the first
                film begins.
              </p>
              <div className="pub-brand-controls">
                <label htmlFor="preview-archive-name">
                  Try your archive name
                </label>
                <input
                  id="preview-archive-name"
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your family cinema"
                />
                <fieldset>
                  <legend>Choose a mood</legend>
                  <div className="pub-swatches">
                    {[
                      {
                        id: "midnight",
                        color: "#426a9b",
                        label: "Midnight Cinema",
                      },
                      { id: "plum", color: "#806098", label: "Velvet Plum" },
                      { id: "forest", color: "#49816e", label: "Forest Night" },
                      { id: "amber", color: "#bd9259", label: "Golden Hour" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        className={palette === p.id ? "selected" : ""}
                        style={{ backgroundColor: p.color }}
                        aria-label={p.label}
                        aria-pressed={palette === p.id}
                        onClick={() => setPalette(p.id)}
                      >
                        {palette === p.id && <Icon name="check" size={17} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label htmlFor="preview-font">Choose a typeface</label>
                <select
                  id="preview-font"
                  value={brandFont}
                  onChange={(e) => setBrandFont(e.target.value)}
                >
                  <option value="inter">Inter · modern</option>
                  <option value="playfair">Playfair Display · classic</option>
                  <option value="manrope">Manrope · understated</option>
                  <option value="cormorant">
                    Cormorant Garamond · expressive
                  </option>
                </select>
              </div>
            </div>
            <div className="pub-screen-scene">
              <div
                className="pub-screen"
                style={{ background: splashBackground(palette) }}
              >
                <div
                  className="pub-screen-content"
                  style={{ fontFamily: fontFamily(brandFont) }}
                >
                  <div className="pub-screen-spark">
                    <Icon name="cinema" size={65} />
                  </div>
                  <strong>{name.trim() || "YOUR FAMILY CINEMA"}</strong>
                  <span>OUR STORIES. OUR CINEMA.</span>
                </div>
              </div>
              <div className="pub-screen-stand" />
              <p className="pub-illustration-label">
                Interactive welcome screen preview · 10 palettes and 10 fonts in
                the archive editor
              </p>
            </div>
          </div>
        </section>

        <section className="pub-tv pub-wrap">
          <div className="pub-tv-art">
            <img
              src={appUrl("/artwork/mountains.png")}
              alt="A peaceful mountain landscape under a warm evening sky"
              loading="lazy"
            />
            <div className="pub-tv-station">
              <span className="pub-live-dot" />
              <span>FAMILY TV</span>
              <span>YOUR OWN SCHEDULE</span>
            </div>
            <div className="pub-tv-programme">
              <span>OUR SUMMERS</span>
              <h3>
                A familiar place.
                <br />A fresh little discovery.
              </h3>
              <div>
                <span className="pub-programme-line" />
                <Icon name="cinema" size={24} />
              </div>
            </div>
          </div>
          <div className="pub-editorial">
            <span className="pub-eyebrow">LET THE MEMORIES COME TO YOU</span>
            <h2>
              Family TV.
              <br />
              <em>Press pause on choosing.</em>
            </h2>
            <p>
              Build a channel from your collections. Mix favourite films and
              shorter moments into a viewing session, with the people, dates and
              stories that bring them to life.
            </p>
            <p>
              Make a channel for summers, celebrations or everyday life. Choose
              what belongs in the mix and what stays out.
            </p>
            <a className="pub-text-link gold-text" href={appUrl("/?create=1")}>
              Make room for a little nostalgia <Icon name="arrow" size={18} />
            </a>
          </div>
        </section>

        <section className="pub-memory-grid pub-wrap">
          <article>
            <div className="pub-memory-image">
              <img
                src={appUrl("/artwork/garden.png")}
                alt="A garden celebration in golden evening light"
                loading="lazy"
              />
              <span className="pub-image-badge">
                <Icon name="star" size={17} /> A PERSONAL PREMIERE
              </span>
            </div>
            <span className="pub-eyebrow">ONE FILM. YOUR PEOPLE.</span>
            <h2>
              Give it an <em>opening night.</em>
            </h2>
            <p>
              Set a date, write a welcome and give a special film its own
              premiere page. A lovely reason to watch, even when you are in
              different places. Playback is individual; this demo does not
              synchronise everyone’s player.
            </p>
          </article>
          <article>
            <div className="pub-memory-image">
              <img
                src={appUrl("/artwork/coast.png")}
                alt="A sunlit coastal road with the sea beyond"
                loading="lazy"
              />
              <span className="pub-image-badge">
                <Icon name="heart" size={17} /> THE LITTLE THINGS
              </span>
            </div>
            <span className="pub-eyebrow">THE STORY INSIDE THE FILM</span>
            <h2>
              Small moments.
              <br />
              <em>All the feeling.</em>
            </h2>
            <p>
              Mark a favourite scene, add a note or record a voice memory. Those
              few seconds can become a moment of their own, ready to find again
              without searching through a whole film.
            </p>
          </article>
        </section>

        <section className="pub-private">
          <div className="pub-wrap pub-private-inner">
            <div className="pub-private-symbol">
              <Icon name="lock" size={38} />
            </div>
            <div>
              <span className="pub-eyebrow">
                A PERSONAL ARCHIVE, THOUGHTFULLY SHARED
              </span>
              <h2>
                Your people.
                <br />
                <em>Your choice.</em>
              </h2>
              <p>
                Invite accounts with the access they need. Keep sensitive films
                limited to selected members. Review guest contributions. Export
                your archive’s metadata when you need it.
              </p>
              <a href={appUrl("/legal/privacy")}>
                Read how the demo handles data <Icon name="arrow" size={17} />
              </a>
            </div>
            <ul>
              <li>
                <Icon name="check" size={20} />
                <span>Account based viewing permissions</span>
              </li>
              <li>
                <Icon name="check" size={20} />
                <span>No advertising or analytics SDK in this build</span>
              </li>
              <li>
                <Icon name="check" size={20} />
                <span>No automatic face recognition</span>
              </li>
              <li>
                <Icon name="check" size={20} />
                <span>AI cover previews stay local in the demo</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="pub-pricing pub-wrap" id="pricing">
          <div className="pub-centered">
            <span className="pub-eyebrow">ROOM FOR YOUR STORY TO GROW</span>
            <h2>
              A cinema for your family.
              <br />
              <em>A plan for your footage.</em>
            </h2>
            <p>
              Explore the example price for the amount of video you want to
              bring.
            </p>
          </div>
          <div className="pub-price-layout">
            <div className="pub-price-calculator">
              <div
                className="pub-period"
                role="group"
                aria-label="Example billing period"
              >
                <button
                  onClick={() => setPeriod("monthly")}
                  aria-pressed={period === "monthly"}
                  className={period === "monthly" ? "selected" : ""}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setPeriod("annual")}
                  aria-pressed={period === "annual"}
                  className={period === "annual" ? "selected" : ""}
                >
                  Yearly
                </button>
              </div>
              <label className="pub-hours-label" htmlFor="footage-hours">
                How much footage will you bring?
                <span>
                  <input
                    id="footage-hours"
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={hours}
                    onChange={(e) => changeHours(e.target.value)}
                  />{" "}
                  hours
                </span>
              </label>
              <input
                className="pub-hours-range"
                aria-label="Footage hours slider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.min(100, hours)}
                onChange={(e) => changeHours(e.target.value)}
              />
              <div className="pub-range-ticks">
                <span>0 hours</span>
                <span>50 hours</span>
                <span>100+ hours</span>
              </div>
              <div className="pub-price" aria-live="polite">
                <span>{euro(quote.total)}</span>
                <span>/{period === "monthly" ? "month" : "year"}</span>
              </div>
              <p className="pub-price-summary">
                {period === "annual"
                  ? `${euro(quote.monthlyTotal)} per month equivalent · ${euro(quote.total)} for 12 months`
                  : `${euro(quote.annualTotal)} for 12 months at this example rate`}
              </p>
              <dl className="pub-price-breakdown">
                <div>
                  <dt>
                    Family Cinema · {PRICING.includedHours} hours included
                  </dt>
                  <dd>{euro(quote.base)}</dd>
                </div>
                <div>
                  <dt>
                    {quote.extraBlocks} additional {PRICING.blockHours} hour{" "}
                    {quote.extraBlocks === 1 ? "block" : "blocks"}
                  </dt>
                  <dd>{euro(quote.total - quote.base)}</dd>
                </div>
                <div className="pub-price-capacity">
                  <dt>Footage capacity in this example</dt>
                  <dd>{PRICING.includedHours + quote.extraHours} hours</dd>
                </div>
              </dl>
              <a className="pub-button gold" href={appUrl("/?create=1")}>
                Create your cinema <Icon name="arrow" size={20} />
              </a>
              <p className="pub-price-disclaimer">
                Illustrative consumer prices in EUR, shown as VAT inclusive for
                this example. No real offer, checkout or charge. The yearly
                example equals 12 monthly amounts; no annual discount is
                implied.{" "}
                <a href={appUrl("/legal/billing")}>Example pricing explained</a>
                .
              </p>
            </div>
            <div className="pub-price-includes">
              <span className="pub-eyebrow">FAMILY CINEMA</span>
              <h3>
                All the ways to make
                <br />
                <em>your memories yours.</em>
              </h3>
              <ul>
                {[
                  "Your own archive name and welcome screen",
                  "Films, covers and curated collections",
                  "Moments, written stories and voice memories",
                  "Family TV channels and personal premieres",
                  "Member accounts and viewing profiles",
                  "Guest upload links with review controls",
                  "Metadata export and a 30 day recovery window",
                ].map((item) => (
                  <li key={item}>
                    <Icon name="check" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="pub-price-note">
                <Icon name="storage" size={23} />
                <p>
                  The example includes {PRICING.includedHours} hours. Above
                  that, footage is rounded up in {PRICING.blockHours} hour
                  blocks at {euro(PRICING.extraBlockMonthly)} a month or{" "}
                  {euro(PRICING.extraBlockAnnual)} a year per block. Keep your
                  original files and backups.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pub-faq pub-wrap">
          <div>
            <span className="pub-eyebrow">BEFORE THE OPENING CREDITS</span>
            <h2>
              A few things
              <br />
              <em>you might wonder.</em>
            </h2>
            <p>
              Clear answers about the experience and this local demonstration.
            </p>
          </div>
          <div>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="pub-closing">
          <img src={appUrl("/artwork/lake.png")} alt="" loading="lazy" />
          <div className="pub-closing-shade" />
          <div className="pub-wrap">
            <span className="pub-eyebrow">
              THE BEST FILMS ARE ALREADY YOURS
            </span>
            <h2>
              Let’s give them
              <br />
              <em>a cinema.</em>
            </h2>
            <a className="pub-button gold" href={appUrl("/?create=1")}>
              Create your cinema <Icon name="arrow" size={20} />
            </a>
            <p>A local demonstration. Your first look at something personal.</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
