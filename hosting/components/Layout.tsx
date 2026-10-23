import Head from "next/head";
import Link from "next/link";
import {useRouter} from "next/router";

const navItems = [
    { href: "/about", label: "About" },
    { href: "/projects", label: "Projects" },
];

export default function Layout({ title, children }: { title?: string, children: React.ReactNode }) {
    const route = useRouter().pathname;

    return (
        <>
            <Head>
                <title>{title ? `${title} · Shreyas Prasad` : "Shreyas Prasad"}</title>
            </Head>
            <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 sm:px-8">
                <header className="flex items-baseline justify-between py-8 sm:py-10">
                    <Link href="/" className="font-serif text-xl tracking-[-0.01em] hover:text-accent transition-colors">
                        Shreyas Prasad
                    </Link>
                    <nav>
                        <ul className="flex gap-6 text-[15px]">
                            {navItems.map(({ href, label }) => (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        aria-current={route === href ? "page" : undefined}
                                        className={route === href
                                            ? "text-ink underline decoration-accent decoration-[1.5px] underline-offset-[6px]"
                                            : "text-muted hover:text-ink transition-colors"}
                                    >
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </header>

                <main className="flex-1 pb-24">{children}</main>

                <footer className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-rule py-8 text-sm text-muted">
                    <span>Shreyas Prasad</span>
                    <span className="flex gap-5">
                        <a href="https://github.com/shreyasprasad14" className="hover:text-ink transition-colors">GitHub</a>
                        <a href="https://www.linkedin.com/in/shreyprasad/" className="hover:text-ink transition-colors">LinkedIn</a>
                    </span>
                </footer>
            </div>
        </>
    );
}

export function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <section className="mt-20">
            <h2 className="mb-8 font-serif text-2xl tracking-[-0.01em]">{title}</h2>
            {children}
        </section>
    );
}

// A CV-style row: small metadata (dates, context) in a left column, content on the right.
export function Entry({ meta, title, subtitle, children }: {
    meta: React.ReactNode,
    title: React.ReactNode,
    subtitle?: React.ReactNode,
    children?: React.ReactNode,
}) {
    return (
        <li className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-6">
            <div className="font-mono text-[13px] leading-6 text-muted sm:pt-px">{meta}</div>
            <div>
                <h3 className="font-medium leading-6">{title}</h3>
                {subtitle && <p className="leading-6 text-muted">{subtitle}</p>}
                {children && <div className="mt-2 leading-relaxed text-ink/80">{children}</div>}
            </div>
        </li>
    );
}
