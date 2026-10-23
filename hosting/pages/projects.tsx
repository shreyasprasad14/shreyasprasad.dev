import Layout from "../components/Layout";
import {projects} from "../data/projects";

export default function Projects() {
    return (
        <Layout title="Projects">
            <h1 className="pt-8 font-serif text-[2.5rem] leading-tight tracking-[-0.015em] sm:pt-12">Projects</h1>
            <p className="mt-3 text-lg text-muted">Things I've built at school, at work, and on my own.</p>

            <div className="mt-14 space-y-14">
                {projects.map((project) => (
                    <article
                        key={project.id}
                        id={project.id}
                        className="grid scroll-mt-8 gap-1 border-t border-rule pt-8 sm:grid-cols-[10rem_1fr] sm:gap-6"
                    >
                        <p className="font-mono text-[13px] leading-6 text-muted sm:pt-1">{project.context}</p>
                        <div>
                            <h2 className="font-serif text-2xl leading-8 tracking-[-0.01em]">{project.title}</h2>
                            <p className="mt-1 font-mono text-[13px] text-muted">{project.stack.join(" · ")}</p>
                            <div className="prose-body mt-5 leading-relaxed text-ink/80">{project.body}</div>
                        </div>
                    </article>
                ))}
            </div>
        </Layout>
    );
}
