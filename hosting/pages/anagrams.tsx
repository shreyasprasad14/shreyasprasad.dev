import { getWordData } from "../data/worddata";
import Navigation from "../components/Navbar";
import {ArrowLongRightIcon, ArrowPathRoundedSquareIcon} from "@heroicons/react/24/solid";
import {useEffect, useState} from "react";
import {Button} from "flowbite-react";
import {Dialog, Transition} from "@headlessui/react";
import {LocalToastTarget, useLocalToast} from "react-local-toast";

const seedrandom = require('seedrandom');

import 'react-local-toast/dist/bundle.css';


enum GAME_STATE {
    INIT,
    PLAYING,
    FINISHED
}
export async function getStaticProps() {
    const words = await getWordData();
    return {
        props: {
            words
        }
    }
}
export default function Anagrams({ words }) {

    const { showToast } = useLocalToast();
    const scoreTable = [0, 25, 50, 100, 400, 1200, 2000];
    const handleWordSubmit = () => {
        const word = userLetters.join('');
        if (!userWords.includes(word) && isPseudoAnagram(word, gameLetters) && words.includes(word)) {
            const wordScore = scoreTable[word.length];
            setScore(score + wordScore);
            showToast("anagrams", `+${wordScore} points`, {type:"success", duration: 1000});
            setUserLetters([]);
            setUserIndices([]);
            setUserWords([...userWords, word])
        } else {
            if (userWords.includes(word)) {
                showToast("anagrams", "Word already submitted", {type:"error", duration: 500});
            } else {
                showToast("anagrams", "Invalid word", {type: "error", duration: 500});
            }
        }
    }
    const [gameLetters, setGameLetters] = useState<string[]>(generateLetterSet());
    const [countdown, setCountdown] = useState<number>(60);
    const [gameState, setGameState] = useState<GAME_STATE>(GAME_STATE.INIT);

    const [mutableLetters, setMutableLetters] = useState<string[]>(gameLetters);
    const [userLetters, setUserLetters] = useState<string[]>([]);
    const [userIndices, setUserIndices] = useState<number[]>([]);
    const [userWords, setUserWords] = useState<string[]>([]);

    const [score, setScore] = useState<number>(0);


    useEffect(() => {
        const interval = setInterval(() => {
            if (countdown === 0) {
                setGameState(GAME_STATE.FINISHED);
                clearInterval(interval);
            }

            if (gameState === GAME_STATE.PLAYING && countdown > 0) {
                setCountdown(countdown - 1);
            }
        }, 1000);
        return () => clearInterval(interval);
    });

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Backspace') {
                setUserLetters(userLetters.slice(0, userLetters.length - 1));
                setUserIndices(userIndices.slice(0, userIndices.length - 1));
            }
            else if (e.key === 'Enter') {
                handleWordSubmit();
            } else if (e.keyCode >= 65 && e.keyCode <= 90 && userLetters.length < 6) {
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



    if (gameState === GAME_STATE.INIT) {
        return (
            <div>
                <Navigation />
                <StartDialog
                    setPlaying={() => setGameState(GAME_STATE.PLAYING)}
                    state={gameState}
                />
            </div>
        );
    }

    if (gameState === GAME_STATE.FINISHED) {
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
                        <LocalToastTarget name={"anagrams"}>
                            <div className="flex justify-center items-center">
                                <Box letter={userLetters[0]} onClick={()=>clearLetter(0)} />
                                <Box letter={userLetters[1]} onClick={()=>clearLetter(1)} />
                                <Box letter={userLetters[2]} onClick={()=>clearLetter(2)} />
                                <Box letter={userLetters[3]} onClick={()=>clearLetter(3)} />
                                <Box letter={userLetters[4]} onClick={()=>clearLetter(4)} />
                                <Box letter={userLetters[5]} onClick={()=>clearLetter(5)} />
                                <ArrowLongRightIcon
                                    className="w-8 h-8 m-2 hover:cursor-pointer hover:text-blue-700"
                                    onClick={handleWordSubmit}
                                />
                            </div>
                        </LocalToastTarget>
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
                                    if (userLetters.length < 6 && !userIndices.includes(index) && gameState === GAME_STATE.PLAYING) {
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
                <Dialog open={state === GAME_STATE.INIT} onClose={setPlaying} className="relative z-50 flex justify-center items-center">
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

function generateLetterSet(): string[] {
    // For each day, generate a set of 6 letters

    //Check the current day
    const date: Date = new Date();
    const seed = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
    const random = new seedrandom(seed);

    const allLetters: string[] = [];

    // Generate the letter set
    for (let i = 0; i < 26; i++) {
        allLetters.push(String.fromCharCode(97 + i));
    }

    const weights: number[] = [13,5,6,7,24,6,7,6,12,2,2,8,8,11,15,4,2,12,10,10,6,2,4,2,2,2];
    let totalWeight = 0;
    weights.forEach((weight) => {
        totalWeight += weight;
    });

    for (let i = 0; i < weights.length; i++) {
        weights[i] = weights[i] / totalWeight;
    }

    const letters: string[] = [];

    // Generate a set of 6 letters as per the weights
    for (let i = 0; i < 6; i++) {
        const randomNum = random();
        let sum = 0;
        for (let j = 0; j < weights.length; j++) {
            sum += weights[j];
            if (randomNum <= sum) {
               // If there are 2 or more of the same letter, only add it if there are less than 2 of it
                if (letters.includes(allLetters[j]) && letters.filter((letter) => letter === allLetters[j]).length >= 2) {
                    i--;
                    break;
                }
                letters.push(allLetters[j]);
                break;
            }
        }
    }

    return letters;
}