import Image from "next/image";
import profilePic from "../public/self.png";
import Layout, {Entry, Section} from "../components/Layout";
import Email from "../components/Email";

const skills = [
    { label: "Languages", items: ["Python", "C", "C++", "C#", "Java", "TypeScript", "JavaScript"] },
    { label: "Systems", items: ["CUDA", "OpenMP", "Open MPI", "gRPC"] },
    { label: "Web", items: [".NET", "Angular", "React", "Next.js", "Tailwind CSS", "Node.js", "Express"] },
    { label: "Tools & databases", items: ["Git", "Linux", "AWS", "SQL Server", "MongoDB", "MySQL"] },
];

export default function AboutPage() {
    return (
        <Layout title="About">
            <div className="grid gap-8 pt-8 sm:grid-cols-[1fr_11rem] sm:gap-12 sm:pt-12">
                <div>
                    <h1 className="font-serif text-[2.5rem] leading-tight tracking-[-0.015em]">About</h1>
                    <div className="prose-body mt-6 text-[17px] leading-relaxed text-ink/85">
                        <p>
                            I'm a Software Engineer at IBM Federal Consulting.
                            I work with the USPS in optimizing postal trucking routes to both meet union requirements and minimize the employee headcount needed to run the postal trucking route for a city.
                        </p>
                        <p>
                            I am also a graduate student at the Georgia Institute of Technology, working towards a master's degree in Computer Science.
                        </p>
                        <p>
                            Outside of school, I enjoy teaching math and computer science to students of all ages.
                            I also enjoy weightlifting, playing video games, and cooking.
                        </p>
                    </div>
                    <p className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-[15px]">
                        <Email />
                        <a href="https://drive.google.com/file/d/1kk1EVpVUMF1AJAxnaqnouh_AnC6JCOq6/view?usp=sharing" className="link">
                            Resume
                        </a>
                    </p>
                </div>
                <div className="order-first aspect-[4/5] w-36 overflow-hidden rounded-sm sm:order-none sm:mt-3 sm:w-full">
                    {/* The source photo is wide; zoom in so the face fills the frame. */}
                    <Image
                        src={profilePic}
                        alt="Shreyas Prasad"
                        sizes="(min-width: 640px) 300px, 250px"
                        priority
                        className="h-full w-full origin-[49%_40%] scale-[1.7] object-cover"
                    />
                </div>
            </div>

            <Section title="Experience">
                <ul className="space-y-10">
                    <Entry meta="Aug 2023 – Present" title="Software Engineer" subtitle="IBM Consulting">
                        As a Federal Consultant for the USPS, I develop Python scripts using libraries
                        such as pandas to automate generating reports and optimize truck schedules,
                        minimizing the required employee headcount while maintaining union requirements
                        in scheduling.
                    </Entry>
                    <Entry meta="Jun – Aug 2022" title="Developer Summer Associate" subtitle="Cohen & Steers">
                        <a href="https://www.cohenandsteers.com/" className="link">Cohen & Steers</a> is
                        an investment manager, specializing in real assets and alternative income. As a
                        summer associate, I spearheaded the design and development of a new web application to manage the
                        company's Active Directory administrator accounts.
                    </Entry>
                </ul>
            </Section>

            <Section title="Education">
                <ul className="space-y-6">
                    <Entry
                        meta="2024 – 2025"
                        title="M.S. Computer Science"
                        subtitle="Georgia Institute of Technology · Expected Spring 2025"
                    />
                    <Entry
                        meta="2020 – 2023"
                        title="B.S. Computer Science, Applied Mathematics and Statistics"
                        subtitle="Stony Brook University"
                    />
                </ul>
            </Section>

            <Section title="Volunteering">
                <ul className="space-y-10">
                    <Entry
                        meta="Jan 2021 – Jun 2023"
                        title="Software & Control Systems Mentor"
                        subtitle="FRC Team #263"
                    />
                    <Entry
                        meta="Mar 2022, Mar 2023"
                        title="Control Systems Advisor / Robot Inspector"
                        subtitle="FIRST Long Island"
                    >
                        <a href="https://www.sbpli-lifirst.org/" className="link">SBPLI</a> is an international high school robotics competition event hosted at Hofstra University.
                        As a Control Systems Advisor, I assist teams in solving software, electrical, and pneumatic problems on their robot
                        to prepare them to compete while ensuring safety. As a Robot Inspector, I ensure robots are in accordance with game rules
                        and safety regulations to maintain a competitive and safe competition.
                    </Entry>
                </ul>
            </Section>

            <Section title="Skills">
                <dl className="space-y-3">
                    {skills.map(({ label, items }) => (
                        <div key={label} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-6">
                            <dt className="font-mono text-[13px] leading-6 text-muted sm:pt-px">{label}</dt>
                            <dd className="leading-6">{items.join(", ")}</dd>
                        </div>
                    ))}
                </dl>
            </Section>
        </Layout>
    );
}
