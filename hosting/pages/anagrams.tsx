import {getStartingWords, getWordData} from "../data/worddata";
import Navigation from "../components/Navbar";
import {ArrowLongRightIcon, ArrowPathRoundedSquareIcon} from "@heroicons/react/24/solid";
import {useEffect, useRef, useState} from "react";
import {Button} from "flowbite-react";
import {Dialog, Transition} from "@headlessui/react";
import toast, {Toaster} from "react-hot-toast";


const seedrandom = require('seedrandom');

enum GameState {
    INIT,
    PLAYING,
    FINISHED
}

export const getStaticProps = (async () => {
    console.log("Getting words...")
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
            <div>
                <Navigation />
                <StartDialog
                    setPlaying={() => setGameState(GameState.PLAYING)}
                    state={gameState}
                />
            </div>
        );
    }

    if (gameState === GameState.FINISHED) {
        return (
            <div>
                <Navigation />
                <EndDialog  score={score} words={userWords} />
            </div>
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
        <div>
            <Navigation />
            <div className="h-full" onKeyDown={() => console.log("fire") }>
                <h1 className="text-4xl text-center">Anagrams</h1>
                <div className="flex justify-center items-center">
                    <div className="flex flex-col justify-center items-center">
                        <div className="flex justify-center items-center">
                            <Box letter={userLetters[0]} onClick={()=>clearLetter(0)} />
                            <Box letter={userLetters[1]} onClick={()=>clearLetter(1)} />
                            <Box letter={userLetters[2]} onClick={()=>clearLetter(2)} />
                            <Box letter={userLetters[3]} onClick={()=>clearLetter(3)} />
                            <Box letter={userLetters[4]} onClick={()=>clearLetter(4)} />
                            <Box letter={userLetters[5]} onClick={()=>clearLetter(5)} />
                            <Box letter={userLetters[6]} onClick={()=>clearLetter(6)} />
                            <ArrowLongRightIcon
                                className="w-8 h-8 m-2 hover:cursor-pointer hover:text-blue-700"
                                onClick={handleWordSubmit}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-center items-center hover:cursor-pointer">
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
                    {/*<ArrowPathRoundedSquareIcon*/}
                    {/*    className="w-8 h-8 m-2 hover:cursor-pointer hover:text-blue-700"*/}
                    {/*    onClick={() => setMutableLetters(shuffleLetters(mutableLetters))}*/}
                    {/*/>*/}
                </div>
                <div className="flex justify-center items-center">
                    <h1 className="text-4xl">{countdown}</h1>
                </div>
                <div className="flex justify-center items-center">
                    <h1 className="text-4xl text-blue-700">{score}</h1>
                </div>
            </div>
        </div>
    )
}

function StartDialog({ setPlaying, state }) {
    return (
        <>
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog open={state === GameState.INIT} onClose={setPlaying} className="relative z-50 flex justify-center items-center">
                    <Dialog.Panel className="w-full max-w-sm rounded bg-white">
                        <Dialog.Title className="text-4xl text-center">Anagrams</Dialog.Title>
                        <Dialog.Description className="text-center">Rearrange the letters to form words!</Dialog.Description>
                        <div className="flex justify-center items-center">
                            <Button onClick={setPlaying}>Start</Button>
                        </div>
                    </Dialog.Panel>
                </Dialog>
            </div>
        </>
    )
}

function EndDialog({ score, words }) {
    const sortedWords = words.sort((a, b) => b.length - a.length);
    return (
        <>
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog open={true} onClose={() => {}} className="relative z-50 flex justify-center items-center">
                    <Dialog.Panel className="w-full max-w-sm rounded bg-white">
                        <Dialog.Title className="text-4xl text-center">Game Over!</Dialog.Title>
                        <Dialog.Description className="text-center">Your score was: </Dialog.Description>
                        <div className="flex justify-center items-center text-blue-700 text-3xl">
                            {score}
                        </div>
                        <div className="flex justify-center items-center">
                            <div className="flex flex-col justify-center items-center">
                                {sortedWords.map((word, index) => {
                                    return (
                                        <div key={index} className="flex justify-center items-center">
                                            <div className="text-2xl text-center">{word}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </Dialog.Panel>
                </Dialog>
            </div>
        </>
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
    return (
        <div
            onClick={onClick}
            className={"w-16 h-16 m-2 flex justify-center items-center " +
                (isUsed ? "bg-gray-400 hover:bg-gray-400 " : "") +
                (primaryTheme ? "bg-blue-700 " : "bg-gray-200 ") +
                (primaryTheme ? "hover:bg-blue-800 " : "hover:bg-gray-300 ") +
                (letter === "" || letter === undefined || isUsed ? "hover:cursor-not-allowed" : "hover:cursor-pointer")
        }>
            <h1 className={"text-4xl " + (primaryTheme ? "text-white" : "text-black")}>{letter}</h1>
        </div>
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
    console.log("Selected Word: ", randomWord);
    return shuffleLetters(shuffleLetters(randomWord.split('')));
}