import {getStartingWords, getWordData} from "../data/worddata";
import Layout from "../components/Layout";
import {useEffect, useRef, useState} from "react";
import {Dialog} from "@headlessui/react";
import toast from "react-hot-toast";

const seedrandom = require('seedrandom');

enum GameState {
    INIT,
    PLAYING,
    FINISHED
}

export const getStaticProps = (async () => {
    const raw_starting_words = await getStartingWords();
    const starting_words = raw_starting_words.map((word) => {
        return word.split(" ")[0];
    });

    const words = await getWordData();

    return {
        props: {
            words,
            starting_words
        }
    }
});

export default function Anagrams({ words, starting_words }) {
    const scoreTable = [-1, -1, -1, 100, 400, 1200, 2000, 5000];

    const handleWordSubmit = () => {
        let word = userLetters.join('');
        if (!userWords.includes(word)
            && word.length > 2
            && isPseudoAnagram(word, gameLetters)
            && words.includes(word.toLowerCase())
        ) {
            const wordScore = scoreTable[word.length];
            setScore(score + wordScore);
            toast.dismiss()
            toast.success(`+${wordScore}`, {duration: 500})
            setUserLetters([]);
            setUserIndices([]);
            setUserWords([...userWords, word])
        } else {
            if (userWords.includes(word)) {
                toast.dismiss()
                toast.error("Word already submitted", {duration: 500});
            } else {
                toast.dismiss()
                toast.error("Invalid Word", {duration: 1000});
            }
        }
    }
    const [gameLetters, setGameLetters] = useState<string[]>(generateLetterSet(starting_words));
    const [gameState, setGameState] = useState<GameState>(GameState.INIT);

    const [mutableLetters, setMutableLetters] = useState<string[]>(gameLetters);
    const [userLetters, setUserLetters] = useState<string[]>([]);
    const [userIndices, setUserIndices] = useState<number[]>([]);
    const [userWords, setUserWords] = useState<string[]>([]);

    const [score, setScore] = useState<number>(0);

    const [countdown, setCountdown] = useState<number>(60);
    const countdownRef = useRef(countdown);

    useEffect(() => {
        countdownRef.current = countdown;
    }, [countdown]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (countdownRef.current === 0) {
                setGameState(GameState.FINISHED);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (gameState === GameState.PLAYING && countdownRef.current > 0) {
            const timeout = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);

            return () => clearTimeout(timeout);
        }
    }, [gameState, countdown]);

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Backspace') {
                setUserLetters(userLetters.slice(0, userLetters.length - 1));
                setUserIndices(userIndices.slice(0, userIndices.length - 1));
            }
            else if (e.key === 'Enter') {
                handleWordSubmit();
            } else if (e.keyCode >= 65 && e.keyCode <= 90
                && userLetters.length < 7
                && gameLetters.includes(e.key)
                && gameState === GameState.PLAYING
                // && !userLetters.includes(e.key)
            ) {
                setUserLetters([...userLetters, e.key]);

                const index = gameLetters.indexOf(e.key);
                setUserIndices([...userIndices, index]);
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        }
    });



    if (gameState === GameState.INIT) {
        return (
            <Layout title="Anagrams">
                <StartDialog
                    setPlaying={() => setGameState(GameState.PLAYING)}
                    state={gameState}
                />
            </Layout>
        );
    }

    if (gameState === GameState.FINISHED) {
        return (
            <Layout title="Anagrams">
                <EndDialog  score={score} words={userWords} />
            </Layout>
        );
    }

    const clearLetter = (index: number) => {
        const newLetters = userLetters.slice();
        const letterToRemove = newLetters[index];
        newLetters.splice(index, 1);
        setUserLetters(newLetters);

        const newIndices = userIndices.slice();
        const letterIndex = gameLetters.indexOf(letterToRemove);
        newIndices.splice(newIndices.indexOf(letterIndex), 1);
        setUserIndices(newIndices);
    }

    return (
        <Layout title="Anagrams">
            <div className="flex flex-col items-center pt-8 sm:pt-12">
                <h1 className="font-serif text-[2.5rem] leading-tight tracking-[-0.015em]">Anagrams</h1>
                <div className="mt-6 flex gap-12 font-mono text-sm text-muted">
                    <span>Time <span className="text-ink tabular-nums">{countdown}</span></span>
                    <span>Score <span className="text-accent tabular-nums">{score}</span></span>
                </div>

                <div className="mt-10 flex gap-1.5 sm:gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <Box key={i} letter={userLetters[i]} onClick={() => clearLetter(i)} />
                    ))}
                </div>
                <div className="mt-4 flex gap-1.5 sm:gap-2">
                    {mutableLetters.map((letter,index) => {
                        return (
                            <Box
                                letter={letter}
                                key={index}
                                primaryTheme={true}
                                onClick={() => {
                                    if (userLetters.length < 7
                                        // && !userIndices.includes(index)
                                        && gameState === GameState.PLAYING
                                    ) {
                                        setUserLetters([...userLetters, letter]);
                                        setUserIndices([...userIndices, index]);
                                    }
                                }}
                                isUsed={userIndices.includes(index)}
                            />
                        )
                    })}
                    {/*<button onClick={() => setMutableLetters(shuffleLetters(mutableLetters))}>Shuffle</button>*/}
                </div>
                <button type="button" onClick={handleWordSubmit} className={buttonClass + " mt-8"}>
                    Submit word
                </button>
            </div>
        </Layout>
    )
}

const buttonClass = "bg-ink px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent";
const panelClass = "w-full max-w-sm border border-rule bg-paper p-8 text-center";

function StartDialog({ setPlaying, state }) {
    return (
        <Dialog open={state === GameState.INIT} onClose={setPlaying} className="relative z-50">
            <div className="fixed inset-0 bg-ink/20" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className={panelClass}>
                    <Dialog.Title className="font-serif text-3xl">Anagrams</Dialog.Title>
                    <Dialog.Description className="mt-2 text-muted">Rearrange the letters to form words.</Dialog.Description>
                    <button type="button" onClick={setPlaying} className={buttonClass + " mt-6"}>Start</button>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}

function EndDialog({ score, words }) {
    const sortedWords = words.sort((a, b) => b.length - a.length);
    return (
        <Dialog open={true} onClose={() => {}} className="relative z-50">
            <div className="fixed inset-0 bg-ink/20" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className={panelClass}>
                    <Dialog.Title className="font-serif text-3xl">Time's up</Dialog.Title>
                    <Dialog.Description className="mt-2 text-muted">Your score</Dialog.Description>
                    <div className="font-mono text-3xl text-accent">{score}</div>
                    <ul className="mt-6 max-h-64 overflow-y-auto border-t border-rule pt-4 font-mono uppercase">
                        {sortedWords.map((word, index) => (
                            <li key={index}>{word}</li>
                        ))}
                    </ul>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}

function shuffleLetters(letters: string[]): string[] {
    const newLetters: string[] = letters.slice();
    for (let i = 0; i < newLetters.length; i++) {
        const randomIndex = Math.floor(Math.random() * newLetters.length);
        const temp = newLetters[i];
        newLetters[i] = newLetters[randomIndex];
        newLetters[randomIndex] = temp;
    }
    return newLetters;
}

function Box({ letter, primaryTheme=false, onClick=null, isUsed=false }) {
    const isEmpty = letter === "" || letter === undefined;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isEmpty || isUsed}
            className={"flex h-11 w-11 items-center justify-center font-mono text-2xl uppercase transition-colors sm:h-14 sm:w-14 sm:text-3xl " +
                (primaryTheme
                    ? "bg-ink text-paper hover:bg-accent disabled:bg-ink/25 "
                    : "border border-rule text-ink hover:border-muted ") +
                "disabled:cursor-not-allowed disabled:hover:border-rule"
        }>
            {letter}
        </button>
    )
}


function isPseudoAnagram(str: string, letters: string[]): boolean {
    for (let i = 0; i < str.length; i++) {
        if (!letters.includes(str[i])) {
            return false;
        }
    }
    return true;
}

function generateLetterSet(allWords: string[]): string[] {
    const date: Date = new Date();
    const seed = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
    const random = new seedrandom(seed);

    const randomIndex = Math.floor(random() * allWords.length);
    const randomWord = allWords[randomIndex];
    return shuffleLetters(shuffleLetters(randomWord.split('')));
}