import Head from 'next/head';
import {Toaster} from "react-hot-toast";
import {IBM_Plex_Mono, IBM_Plex_Sans, Newsreader} from "next/font/google";
import '../styles/globals.css';

const sans = IBM_Plex_Sans({
    weight: ["400", "500"],
    subsets: ["latin"],
});

const serif = Newsreader({
    weight: ["400", "500"],
    style: ["normal", "italic"],
    subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
    weight: "400",
    subsets: ["latin"],
});

export default function MyApp({ Component, pageProps }) {
    return (
        <>
            <style jsx global>
                {`
                  :root {
                    --font-sans: ${sans.style.fontFamily};
                    --font-serif: ${serif.style.fontFamily};
                    --font-mono: ${mono.style.fontFamily};
                  }
                `}
            </style>
            <Toaster />
            <Head>
                <link rel="icon" href="/favicon.svg" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#faf9f6" media="(prefers-color-scheme: light)" />
                <meta name="theme-color" content="#161513" media="(prefers-color-scheme: dark)" />
                <title>Shreyas Prasad</title>
            </Head>
            <Component {...pageProps} />
        </>
    );
}
