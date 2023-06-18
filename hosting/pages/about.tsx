import Navigation from "../components/Navbar";
import Image from "next/image";
import profilePic from "../public/self.png";
import Link from "next/link";
import {DocumentTextIcon, EnvelopeIcon} from "@heroicons/react/20/solid";

export default function AboutPage() {
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
                        <Image src={profilePic} alt="Profile Picture" width={200} height={200} className="rounded-full hidden lg:block" />
                        <div>
                            <p className="text-lg font-normal text-gray-500 pl-4 lg:text-xl sm:pr-4 lg:pr-12 dark:text-gray-400">
                                I'm a senior at Stony Brook University studying Computer Science & Applied Mathematics and Statistics.
                                Following my graduation in May 2023, I will be working as a Federal Hybrid Cloud Transformation Developer at IBM's Washington D.C. office,
                                where I will be working with clients from the federal government to help them solve real world issues with cloud applications.
                            </p>
                            <hr className="h-px my-6 bg-gray-300 border-none dark:bg-gray-700" />
                            <p className="text-lg font-normal text-gray-500 pl-4 lg:text-xl sm:pr-4 lg:pr-12 dark:text-gray-400">
                                Outside of school, I enjoy teaching math and computer science to students of all ages through my work as a Teaching Assistant,
                                private tutor, and robotics mentor. I also enjoy weightlifting, playing video games, and cooking.
                            </p>
                        </div>
                    </span>
                    <div
                        className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
                        <Link href="mailto: contact@shreyasprasad.dev"
                              className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900">
                            <EnvelopeIcon className="w-5 h-5 -ml-1 mr-3" aria-hidden="true"/>
                            contact@shreyasprasad.dev
                        </Link>
                        <Link href="https://drive.google.com/file/d/1PyuAKISjIdg39Mt6hQpkuE64eVMlt5A4/view?usp=sharing"
                              className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900">
                            <DocumentTextIcon className="w-5 h-5 -ml-1 mr-3" aria-hidden="true"/>
                            Resume
                        </Link>
                    </div>

                </div>
            </section>

            <section className="bg-white dark:bg-gray-900">
                <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                    <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                        Education
                    </h1>

                    <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                        B.S. Computer Science, Applied Mathematics and Statistics | Stony Brook University | 2020 - 2023
                    </p>
                </div>
            </section>

            <section className="bg-white dark:bg-gray-900">
                <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                    <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                        Experience
                    </h1>

                    <ul>
                        <li className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                            <span className="font-bold">Software Mentor</span> | FRC Team #263 | Jan 2021 - June 2023
                            <p className="text-base font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                                <Link href={"https://www.first263.org/"} className="text-blue-400 hover:text-blue-600">FIRST Robotics Competition </Link>
                                is an international high school robotics competition.
                                As a mentor, I help students learn how to program responsive and autonomous robots using Java, C++, and Python.
                            </p>
                        </li>

                        <li className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                            <span className="font-bold">Math Instructor</span> | Mathnasium of Sayville | Jan 2021 - June 2023
                            <p className="text-base font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                                As an instructor, I teach students of all ages how to solve math problems using the Mathnasium Method.
                                I've taught students from elementary school through the college level classes such as Linear Algebra and Statistics.
                            </p>
                        </li>

                        <li className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                            <span className="font-bold">Developer Summer Associate</span> | Cohen & Steers | Jun 2022 - Aug 2022
                            <p className="text-base font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                                <Link href={"https://www.cohenandsteers.com/"} className="text-blue-400 hover:text-blue-600">Cohen & Steers </Link>
                                is a investment manager, specializing in real assets and alternative income. As a summer associate,
                                I spearheaded the design and development of a new web application to manage the company's Active Directory administrator accounts.
                            </p>
                        </li>

                        <li className="hidden mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                            <span className="font-bold">Software Engineer Intern</span> | North Atlantic Industries | Jan 2022 - May 2022
                            <p className="text-base font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
                                <Link href={"https://www.naii.com/"} className="text-blue-400 hover:text-blue-600">North Atlantic Industries </Link>
                                 is a supplier of COTS embedded I/O boards. As an intern, I explored the use of a new processor for future products.
                                I developed a proof of concept Windows application in C# to send and receive data from the processor's flash memory.
                            </p>
                        </li>
                    </ul>
                </div>
            </section>

            <section className="bg-white dark:bg-gray-900">
                <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                    <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                        Skills
                    </h1>

                    <div className="flex flex-wrap justify-center">
                        <div className="flex flex-col items-center justify-center w-1/2 p-2">
                            <h1 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                                Programming Languages
                            </h1>

                            <ul>
                                <SkillItem name="Java" />
                                <SkillItem name="C & C++" />
                                <SkillItem name="Python" />
                                <SkillItem name="C#" />
                                <SkillItem name="TypeScript & JavaScript" />
                            </ul>

                            <h1 className="mb-4 mt-8 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                                Frameworks / Libraries
                            </h1>

                            <ul>
                                <SkillItem name=".NET" />
                                <SkillItem name="Angular" />
                                <SkillItem name="React" />
                                <SkillItem name="Next.js" />
                                <SkillItem name="Tailwind CSS" />
                                <SkillItem name="Node.js" />
                                <SkillItem name="Express" />
                            </ul>

                            <h1 className="mb-4 mt-8 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                                Tools & Databases
                            </h1>

                            <ul>
                                <SkillItem name="Git" />
                                <SkillItem name="Linux" />
                                <SkillItem name="AWS" />
                                <SkillItem name="SQL Server" />
                                <SkillItem name="MongoDB" />
                                <SkillItem name="MySQL" />
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
  )
}

function SkillItem({ name }) {
    return (
        <li className="mb-4 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
            {name}
        </li>
    );
}
