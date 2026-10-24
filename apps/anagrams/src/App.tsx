import type {ComponentChildren} from "preact";
import {useEffect, useRef, useState} from "preact/hooks";
import seedrandom from "seedrandom";

enum GameState {
  LOADING,
  INIT,
  PLAYING,
  FINISHED,
}

const ROUND_SECONDS = 60;
const MAX_LETTERS = 7;
// Points by word length; words shorter than three letters don't count
const scoreTable = [-1, -1, -1, 100, 400, 1200, 2000, 5000];

type Toast = {id: number; text: string; kind: "success" | "error"};

export default function App() {
  const [dictionary, setDictionary] = useState<Set<string>>(new Set());
  const [gameLetters, setGameLetters] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [loadError, setLoadError] = useState(false);

  const [userLetters, setUserLetters] = useState<string[]>([]);
  const [userIndices, setUserIndices] = useState<number[]>([]);
  const [userWords, setUserWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(ROUND_SECONDS);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    Promise.all([loadWords("dictionary.txt"), loadWords("starters.txt")])
      .then(([words, starters]) => {
        setDictionary(new Set(words));
        setGameLetters(generateLetterSet(starters));
        setGameState(GameState.INIT);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    if (countdown === 0) {
      setGameState(GameState.FINISHED);
      return;
    }
    const timeout = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timeout);
  }, [gameState, countdown]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), toast.kind === "success" ? 500 : 1000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const showToast = (text: string, kind: Toast["kind"]) => setToast({id: ++toastId.current, text, kind});

  const addLetter = (letter: string, index: number) => {
    if (gameState !== GameState.PLAYING || userLetters.length >= MAX_LETTERS) return;
    setUserLetters([...userLetters, letter]);
    setUserIndices([...userIndices, index]);
  };

  const removeLetter = (position: number) => {
    setUserLetters(userLetters.filter((_, i) => i !== position));
    setUserIndices(userIndices.filter((_, i) => i !== position));
  };

  const handleWordSubmit = () => {
    if (gameState !== GameState.PLAYING) return;
    const word = userLetters.join("");
    if (userWords.includes(word)) {
      showToast("Word already submitted", "error");
    } else if (word.length > 2 && isPseudoAnagram(word, gameLetters) && dictionary.has(word)) {
      const wordScore = scoreTable[word.length];
      setScore(score + wordScore);
      showToast(`+${wordScore}`, "success");
      setUserLetters([]);
      setUserIndices([]);
      setUserWords([...userWords, word]);
    } else {
      showToast("Invalid word", "error");
    }
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (e.key === "Backspace") {
        setUserLetters(userLetters.slice(0, -1));
        setUserIndices(userIndices.slice(0, -1));
      } else if (e.key === "Enter") {
        // Let Enter activate a focused button instead of also submitting
        if (document.activeElement instanceof HTMLButtonElement) return;
        handleWordSubmit();
      } else if (/^[a-z]$/.test(key) && gameLetters.includes(key)) {
        // Prefer an unused tile with this letter, so the right one greys out
        const unused = gameLetters.findIndex((l, i) => l === key && !userIndices.includes(i));
        addLetter(key, unused === -1 ? gameLetters.indexOf(key) : unused);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const start = () => {
    setUserLetters([]);
    setUserIndices([]);
    setUserWords([]);
    setScore(0);
    setCountdown(ROUND_SECONDS);
    setGameState(GameState.PLAYING);
  };

  return (
    <div class="page">
      <header class="topbar">
        <a href="https://shreyasprasad.dev/apps/">← Apps</a>
        <a href="https://shreyasprasad.dev/">shreyasprasad.dev</a>
      </header>

      <main class="game">
        <h1>Anagrams</h1>

        {gameState === GameState.LOADING && (
          <Panel title="Anagrams">
            <p class="muted">{loadError ? "Couldn't load the word list. Try refreshing." : "Loading words…"}</p>
          </Panel>
        )}

        {gameState === GameState.INIT && (
          <Panel title="Ready?">
            <p class="muted">
              Rearrange the letters to form words. You have {ROUND_SECONDS} seconds, and longer words score more.
            </p>
            <p class="muted small">Type or tap letters, Enter to submit, Backspace to undo.</p>
            <button type="button" class="button" onClick={start} autoFocus>
              Start
            </button>
          </Panel>
        )}

        {gameState === GameState.PLAYING && (
          <>
            <div class="stats">
              <span>
                Time <strong class="time">{countdown}</strong>
              </span>
              <span>
                Score <strong class="score">{score}</strong>
              </span>
            </div>

            <div class="row" aria-label="Your word">
              {Array.from({length: MAX_LETTERS}, (_, i) => (
                <Tile
                  key={i}
                  letter={userLetters[i]}
                  onClick={() => removeLetter(i)}
                  label={userLetters[i] ? `Remove ${userLetters[i]}` : "Empty"}
                />
              ))}
            </div>
            <div class="row" aria-label="Letters">
              {gameLetters.map((letter, index) => (
                <Tile
                  key={index}
                  letter={letter}
                  primary
                  isUsed={userIndices.includes(index)}
                  onClick={() => addLetter(letter, index)}
                  label={`Add ${letter}`}
                />
              ))}
            </div>
            <button type="button" class="button" onClick={handleWordSubmit}>
              Submit word
            </button>
          </>
        )}

        {gameState === GameState.FINISHED && (
          <Panel title="Time's up">
            <p class="muted">Your score</p>
            <p class="final">{score}</p>
            {userWords.length > 0 && (
              <ul class="words">
                {[...userWords]
                  .sort((a, b) => b.length - a.length)
                  .map((word) => (
                    <li key={word}>{word}</li>
                  ))}
              </ul>
            )}
            <button type="button" class="button" onClick={start} autoFocus>
              Play again
            </button>
          </Panel>
        )}

        <div class="toast-region" role="status" aria-live="polite">
          {toast && (
            <span key={toast.id} class={`toast ${toast.kind}`}>
              {toast.text}
            </span>
          )}
        </div>
      </main>
    </div>
  );
}

function Panel({title, children}: {title: string; children: ComponentChildren}) {
  return (
    <section class="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Tile({
  letter,
  primary = false,
  isUsed = false,
  onClick,
  label,
}: {
  letter?: string;
  primary?: boolean;
  isUsed?: boolean;
  onClick: () => void;
  label: string;
}) {
  const isEmpty = !letter;
  return (
    <button
      type="button"
      class={`tile ${primary ? "primary" : ""}`}
      onClick={onClick}
      disabled={isEmpty || isUsed}
      aria-label={label}
    >
      {letter}
    </button>
  );
}

async function loadWords(file: string): Promise<string[]> {
  const response = await fetch(import.meta.env.BASE_URL + file);
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  return (await response.text()).split("\n").filter(Boolean);
}

// Letters may repeat: every letter of the word only has to appear among the tiles
function isPseudoAnagram(str: string, letters: string[]): boolean {
  for (const char of str) {
    if (!letters.includes(char)) return false;
  }
  return true;
}

function shuffleLetters(letters: string[]): string[] {
  const newLetters = letters.slice();
  for (let i = 0; i < newLetters.length; i++) {
    const randomIndex = Math.floor(Math.random() * newLetters.length);
    [newLetters[i], newLetters[randomIndex]] = [newLetters[randomIndex], newLetters[i]];
  }
  return newLetters;
}

// The same starting word for everyone on a given day; only the tile order varies
function generateLetterSet(allWords: string[]): string[] {
  const date = new Date();
  const seed = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
  const random = seedrandom(seed);

  const randomWord = allWords[Math.floor(random() * allWords.length)];
  return shuffleLetters(shuffleLetters(randomWord.split("")));
}
