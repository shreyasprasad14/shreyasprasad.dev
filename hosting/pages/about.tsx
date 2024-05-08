import Navigation from "../components/Navbar";
import Image from "next/image";
import profilePic from "../public/self.png";
import Link from "next/link";
import {DocumentTextIcon, EnvelopeIcon} from "@heroicons/react/20/solid";
import {useEffect, useState} from "react";
import ClipboardToast from "../components/ClipboardToast";

export default function AboutPage() {
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowToast(false);
        }, 750);

        return () => clearTimeout(timer);
    }, [showToast]);

    return (
        <div>
            <Navigation />
            <div className="h-full">
                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                            About Me
                        </h1>
                        <span className="flex justify-center">
                            <Image src={profilePic} alt="Profile Picture" width={200} height={200}
                                   className="rounded-full lg:block"/>
                            <div>
                                <p className="text-lg font-normal text-gray-500 pl-4 lg:text-xl sm:pr-4 lg:pr-12 dark:text-gray-400">
                                    I'm a Software Engineer at IBM Federal Consulting.
                                    I work with the USPS in optimizing postal trucking routes to both meet union requirements and minimize the employee headcount needed to run the postal trucking route for a city.
                                </p>
                                <p className="text-lg font-normal text-gray-500 pl-4 lg:text-xl sm:pr-4 lg:pr-12 dark:text-gray-400">
                                    I am also a graduate student at the Georgia Institute of Technology, working towards a masters degree in Computer Science.
                                </p>
                                <hr className="h-px my-6 bg-gray-300 border-none dark:bg-gray-700"/>
                                <p className="text-lg font-normal text-gray-500 pl-4 lg:text-xl sm:pr-4 lg:pr-12 dark:text-gray-400">
                                    Outside of school, I enjoy teaching math and computer science to students of all ages.
                                    I also enjoy weightlifting, playing video games, and cooking.
                                </p>
                            </div>
                        </span>

                        <div
                            className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
                            <div
                                className="inline-flex justify-center items-center py-3 px-5 cursor-pointer text-base font-medium text-center text-white rounded-lg bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900"
                                onClick={() => {
                                    setShowToast(true)
                                }}
                            >
                                <EnvelopeIcon className="w-5 h-5 -ml-1 mr-3" aria-hidden="true"/>
                                contact@shreyasprasad.dev
                            </div>
                            <Link
                                href="https://drive.google.com/file/d/1kk1EVpVUMF1AJAxnaqnouh_AnC6JCOq6/view?usp=sharing"
                                className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900">
                                <DocumentTextIcon className="w-5 h-5 -ml-1 mr-3" aria-hidden="true"/>
                                Resume
                            </Link>
                        </div>

                        <ClipboardToast show={showToast}/>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                            Education
                        </h1>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                            M.S. Computer Science | Georgia Institute of Technology | 2024 - Expected Spring 2025
                        </p>
                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                            B.S. Computer Science, Applied Mathematics and Statistics | Stony Brook University | 2020 -
                            2023
                        </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                            Professional Experience
                        </h1>

                        <ul>
                            <ExperienceItem
                                title={<>
                                    <span className="font-bold">Software Engineer</span> | IBM Consulting | Aug 2023 - Present
                                </>}
                                description={<>
                                    As a Federal Consultant for the USPS, I develop Python scripts using libraries
                                    such as pandas to automate generating reports and optimize truck schedules,
                                    minimizing the required employee headcount while maintaining union requirements
                                    in scheduling.
                                </>}
                            />

                            <ExperienceItem
                                title={<>
                                    <span className="font-bold">Developer Summer Associate</span> | Cohen & Steers | Jun 2022 - Aug 2022
                                </>}
                                description={<>
                                    <Link href={"https://www.cohenandsteers.com/"}
                                          className="text-blue-400 hover:text-blue-600">Cohen & Steers </Link>
                                    is a investment manager, specializing in real assets and alternative income. As a
                                    summer associate,
                                    I spearheaded the design and development of a new web application to manage the
                                    company's Active Directory administrator accounts.
                                </>}
                            />
                        </ul>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                            Volunteer Experience
                        </h1>

                        <ul>
                            <ExperienceItem
                                title={<>
                                    <span className="font-bold">Software & Control Systems Mentor</span> | FRC Team #263 | Jan 2021 - June 2023
                                </>}
                                description={<>
                                    <Link href={"https://www.sbpli-lifirst.org/"} className="text-blue-400 hover:text-blue-600">
                                        SPBLI
                                    </Link> is an international high school robotics competition event hosted at Hofstra University.
                                    As a Control Systems Advisor, I assist teams in solving software, electrical, and pneumatic problems on their robot
                                    to prepare them to compete while ensuring safety. As a Robot Inspector, I ensure robots are in accordance with game rules
                                    and safety regulations to maintain a competitive and safe competition.
                                </>}
                            />

                            <ExperienceItem
                                title={<>
                                    <span className="font-bold">Control Systems Advisor / Robot Inspector</span> | FIRST Long Island | March 2022, March 2023
                                </>}
                                description={<>
                                    <Link href={"https://www.sbpli-lifirst.org/"} className="text-blue-400 hover:text-blue-600">
                                        SPBLI
                                    </Link> is an international high school robotics competition event hosted at Hofstra University.
                                    As a Control Systems Advisor, I assist teams in solving software, electrical, and pneumatic problems on their robot
                                    to prepare them to compete while ensuring safety. As a Robot Inspector, I ensure robots are in accordance with game rules
                                    and safety regulations to maintain a competitive and safe competition.
                                </>}
                            />
                        </ul>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                            Skills
                        </h1>

                        <div className="flex flex-wrap justify-center">
                            <div className="grid grid-cols-2">
                                <SkillSection
                                    title="Languages"
                                    items={[
                                        "Python",
                                        "C",
                                        "C++",
                                        "C#",
                                        "Java",
                                        "TypeScript",
                                        "JavaScript"
                                    ]}
                                />

                                <SkillSection
                                    title="Systems Frameworks / Libraries"
                                    items={[
                                        "Cuda",
                                        "OpenMP",
                                        "OpenMPI",
                                        "gRPC",
                                    ]}
                                />

                                <SkillSection
                                    title="Web Frameworks / Libraries"
                                    items={[
                                        ".NET",
                                        "Angular",
                                        "React",
                                        "Next.js",
                                        "Tailwind CSS",
                                        "Node.js",
                                        "Express",
                                    ]}
                                />

                                <SkillSection
                                    title="Tools & Databases"
                                    items={[
                                        "Git",
                                        "Linux",
                                        "AWS",
                                        "SQL Server",
                                        "MongoDB",
                                        "MySQL",
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

function ExperienceItem({ title, description }) {
    return (
        <li className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-24 dark:text-gray-400">
            {title}
            <p className="text-base font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-32 dark:text-gray-400">
                {description}
            </p>
        </li>
    )
}

function SkillSection({ title, items }) {
    return (
        <div>
            <h1 className="mb-4 mt-8 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                {title}
            </h1>

            <ul className="grid grid-cols-2">
                {items.map((item, index) => (
                    <SkillItem key={index} name={item} />
                ))}
            </ul>
        </div>
    )
}

function SkillItem({ name }: { name: string }) {
    return (
        <li className="mb-4 text-lg font-normal text-gray-500 lg:text-xl  dark:text-gray-400">
            {name}
        </li>
    );
}
