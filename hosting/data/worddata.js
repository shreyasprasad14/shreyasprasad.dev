import fsPromises from 'fs/promises';


export async function getWordData() {
    const path = await import('path');
    const filePath = path.join(process.cwd(), './data/words.txt');
    const fileData = await fsPromises.readFile(filePath, 'utf8');
    return fileData.split('\n');
}