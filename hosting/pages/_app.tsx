import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
    return (
        <>
            <Head>
                <link rel="icon" href="/favicon.svg" />
                <title>Shreyas Prasad</title>
            </Head>
            <Component {...pageProps} />
        </>
    );
}