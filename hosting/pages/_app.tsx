import Head from 'next/head';
import {Toaster} from "react-hot-toast";

export default function MyApp({ Component, pageProps }) {
    return (
        <>
            <Toaster />
            <Head>
                <link rel="icon" href="/favicon.svg" />
                <title>Shreyas Prasad</title>
            </Head>
            <Component {...pageProps} />
        </>
    );
}