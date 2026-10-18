import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  MoreVertical,
  Layers,
  Grid2X2,
  Brain,
  CheckCheck,
  Folder,
  Check,
  BookOpen,
} from "lucide-react";
import { useStore } from "../core/store";
import { SetCard, Empty } from "../components/ui";
export function Dashboard() {
  const s = useStore();
  const recent = [...s.sets].sort(
    (a, b) => (b.lastStudied ?? b.updated) - (a.lastStudied ?? a.updated),
  );
  const first = recent[0];
  const [offset, setOffset] = useState(0);
  const due = Object.values(s.reviews).filter(
    (r) => r.due <= Date.now(),
  ).length;
  return (
    <div className="home-feed">
      <h1 className="sr-only">Home</h1>
      <section className="feed-section">
        <h2>Pick up where you left off</h2>
        {first ? (
          <div className="feed-promo">
            <div className="feed-promo-copy">
              <span className="large-mode-symbol">
                <Layers size={37} />
              </span>
              <h3>{first.title}</h3>
              <p>
                {first.lastStudied
                  ? "Keep your momentum going. Review your flashcards and see what sticks."
                  : "Get to know your terms, then put your knowledge into practice."}
              </p>
              <Link
                className="button primary"
                to={"/set/" + first.id + "/flashcards"}
              >
                Study flashcards
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="promo-art cards-art" aria-hidden="true">
              <div className="art-card art-card-back" />
              <div className="art-card art-card-front">
                <span>TERM</span>
                <BookOpen size={44} />
                <b>{first.cards[0]?.term}</b>
                <i />
              </div>
              <span className="art-dot one" />
              <span className="art-dot two" />
            </div>
          </div>
        ) : (
          <Empty
            title="Create your first flashcard set"
            description="Start with your notes. Make a set. Find your flow."
            action="Create flashcards"
          />
        )}
      </section>
      <section className="feed-section">
        <div className="row between">
          <h2>Your study sets</h2>
          <div className="row gap">
            <button
              className="icon-button"
              aria-label="Previous study sets"
              disabled={!offset}
              onClick={() => setOffset((x) => Math.max(0, x - 2))}
            >
              <ArrowLeft size={21} />
            </button>
            <button
              className="icon-button"
              aria-label="Next study sets"
              disabled={offset + 2 >= recent.length}
              onClick={() => setOffset((x) => x + 2)}
            >
              <ArrowRight size={21} />
            </button>
          </div>
        </div>
        <div className="home-set-carousel">
          {recent.slice(offset, offset + 2).map((x) => (
            <Link className="feed-set" key={x.id} to={"/set/" + x.id}>
              <Layers size={22} />
              <h3>{x.title}</h3>
              <span>
                {x.cards.length} cards •{" "}
                {x.sample ? "StudyFlow originals" : s.settings.name}
              </span>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
        <Link className="text-button" to="/library">
          View your library
          <ArrowRight size={16} />
        </Link>
      </section>
      <section className="feed-section">
        <h2>Make it part of your routine</h2>
        <div className="feed-promo review-promo">
          <div className="feed-promo-copy">
            <span className="large-mode-symbol">
              <CheckCheck size={37} />
            </span>
            <h3>
              {due
                ? `${due} cards are ready to review`
                : "Remember more with daily review"}
            </h3>
            <p>
              {due
                ? "A few minutes of focused review can make the difference. Your next session is ready."
                : "Spaced repetition brings your flashcards back when it’s time for another look."}
            </p>
            <Link className="button secondary" to="/reviews">
              {due ? "Start daily review" : "View your review schedule"}
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="promo-art review-art" aria-hidden="true">
            {[38, 72, 55, 86].map((n, i) => (
              <div className="art-review-row" key={i}>
                <span>
                  <Check size={18} />
                </span>
                <i>
                  <b style={{ width: n + "%" }} />
                </i>
              </div>
            ))}
          </div>
        </div>
      </section>
      {first && (
        <section className="feed-section">
          <h2>Switch it up with a game</h2>
          <div className="feed-promo match-promo">
            <div className="feed-promo-copy">
              <span className="large-mode-symbol">
                <Grid2X2 size={37} />
              </span>
              <h3>{first.title}</h3>
              <p>Race against the clock to match terms</p>
              <Link
                className="button primary"
                to={"/set/" + first.id + "/match"}
              >
                Play Match
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="promo-art match-art" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={n === 1 || n === 4 ? "art-matched" : ""}
                >
                  {n === 1 || n === 4 ? (
                    <Check size={24} />
                  ) : (
                    <Layers size={22} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="feed-section">
        <h2>Study exactly what you need</h2>
        <div className="feed-promo create-promo">
          <div className="feed-promo-copy">
            <span className="large-mode-symbol">
              <Layers size={37} />
            </span>
            <h3>Create your own flashcards</h3>
            <p>Turn your class notes into a set you can study your way.</p>
            <Link className="button primary" to="/create">
              Create flashcards
              <Plus size={19} />
            </Link>
          </div>
        </div>
      </section>
      <div className="feed-footer">
        <Link to="/features">About StudyFlow</Link>
        <Link to="/settings">Settings</Link>
        <span>Your library, in sync</span>
      </div>
    </div>
  );
}
