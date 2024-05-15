import fsPromises from 'fs/promises';


export async function getWordData() {
    const path = await import('path');
    const filePath = path.join(process.cwd(), './data/words_alpha.txt');
    const fileData = await fsPromises.readFile(filePath, 'utf8');
    return fileData.split('\r\n');
}

export async function getStartingWords() {
    const path = await import('path');
    const filePath = path.join(process.cwd(), './data/filtered_ranked_words.txt');
    const fileData = await fsPromises.readFile(filePath, 'utf8');
    return fileData.split('\r\n');
}