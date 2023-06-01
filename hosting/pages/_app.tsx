import Head from 'next/head';
import {LocalToastProvider} from "react-local-toast";

export default function MyApp({ Component, pageProps }) {
    return (
        <LocalToastProvider>
            <Head>
                <link rel="icon" href="/favicon.svg" />
                <title>Shreyas Prasad</title>
            </Head>
            <Component {...pageProps} />
        </LocalToastProvider>
    );
}