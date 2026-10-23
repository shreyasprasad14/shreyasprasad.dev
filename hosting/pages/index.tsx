import Link from "next/link";
import Layout, {Section} from "../components/Layout";
import Email from "../components/Email";
import {projects} from "../data/projects";

const elsewhere = [
    { label: "GitHub", href: "https://github.com/shreyasprasad14", text: "shreyasprasad14" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/shreyprasad/", text: "in/shreyprasad" },
    { label: "Resume", href: "https://drive.google.com/file/d/1kk1EVpVUMF1AJAxnaqnouh_AnC6JCOq6/view?usp=sharing", text: "PDF" },
];

export default function IndexPage() {
    return (
        <Layout>
            <section className="pt-8 sm:pt-16">
                <h1 className="max-w-[28ch] font-serif text-[2rem] leading-[1.15] tracking-[-0.015em] [text-wrap:balance] sm:text-[2.625rem]">
                    Software engineer at IBM Federal Consulting and computer science master's student at Georgia Tech.
                </h1>
                <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">
                    At IBM I work with the USPS on optimizing postal trucking routes.
                    Outside of work, I enjoy teaching math and computer science to students of all ages.{" "}
                    <Link href="/about" className="link text-ink">More about me</Link>
                </p>

                <dl className="mt-12 grid grid-cols-[6rem_1fr] gap-y-2.5 text-[15px]">
                    <div className="contents">
                        <dt className="text-muted">Email</dt>
                        <dd><Email /></dd>
                    </div>
                    {elsewhere.map(({ label, href, text }) => (
                        <div key={label} className="contents">
                            <dt className="text-muted">{label}</dt>
                            <dd><a href={href} className="link">{text}</a></dd>
                        </div>
                    ))}
                </dl>
            </section>

            <Section title="Selected work">
                <ul className="border-t border-rule">
                    {projects.map((project) => (
                        <li key={project.id} className="border-b border-rule">
                            <Link
                                href={`/projects#${project.id}`}
                                className="group flex items-baseline justify-between gap-6 py-3.5"
                            >
                                <span className="transition-colors group-hover:text-accent">{project.title}</span>
                                <span className="shrink-0 font-mono text-[13px] text-muted">{project.context}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </Section>
        </Layout>
    );
}
