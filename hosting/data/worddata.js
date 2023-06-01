import fsPromises from 'fs/promises';
import path from 'path';

export async function getWordData() {
    const filePath = path.join(process.cwd(), 'data/words.txt');
    const fileData = await fsPromises.readFile(filePath, 'utf8');
    return fileData.split('\n');
}