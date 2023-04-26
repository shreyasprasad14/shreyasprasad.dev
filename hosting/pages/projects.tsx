import Navigation from "../components/Navbar";
import Link from "next/link";


export default function Projects() {
    return (
        <div>
            <Navigation />
            <div className="h-full">
                <h1 className="text-center mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                    Projects
                </h1>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            Active Directory Administrator Management Web App
                        </h2>

                        <h3 className="mb-4 text-lg font-light tracking-tight leading-none text-gray-500 md:text-xl lg:text-2xl dark:text-white">
                            .NET Core | C# | Angular | TypeScript | SQL Server | Azure Pipelines
                        </h3>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            As a part of an internship at Cohen & Steers, I develop an internal web application to manage Active Directory administrators.
                            I corresponded with the IT and Development teams to gather requirements, and designed the application architecture and database schema.
                        </p>
                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            The application allows developers to temporarily elevate their privileges to perform administrative tasks, and automatically reverts the changes after a specified time.
                            The application also allows IT administrators to view and manage all elevated privileges, with logging and auditing capabilities.
                        </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            2D Tileset Generator
                        </h2>

                        <h3 className="mb-4 text-lg font-light tracking-tight leading-none text-gray-500 md:text-xl lg:text-2xl dark:text-white">
                            React.js | Tailwind | Node.js | Express | Socket.io | MongoDB | AWS
                        </h3>

                            <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                                As a part of CSE 416: Software Engineering,
                                I worked with a team of 4 to develop a <Link href={"https://github.com/Lawnmower-416/Lawnmower"} className="text-blue-400 hover:text-blue-600">
                                      2D Tileset Generator
                                </Link>.
                                The application allows users to collaborate in real-time to create tilesets & maps for 2D games by either uploading an image or drawing their own.
                            </p>
                            <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                                I developed the tileset and map editor, featuring real-time collaboration using Socket.io and web workers for fast image processing.
                                I also set up the AWS EC2 instance to host the application, and the CI/CD pipeline using GitHub Actions, and AWS CodeDeploy.
                            </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            QR Code Sign-In System
                        </h2>

                        <h3 className="mb-4 text-lg font-light tracking-tight leading-none text-gray-500 md:text-xl lg:text-2xl dark:text-white">
                            Python | OpenCV2 | Selenium | MongoDB
                        </h3>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                           In order to speed up the online sign-in process for students at Mathnasium, I developed a <Link href={"https://github.com/shreyasprasad14/QR-Sign-in-System"} className="text-blue-400 hover:text-blue-600">
                                QR Code Sign-In System
                            </Link>.
                            The system uses OpenCV2 to detect QR codes from a webcam, and Selenium to automate the sign-in process on the Mathnasium website.
                        </p>
                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">

                        The system also stores the sign-in data in a MongoDB database, which can be used to generate reports.
                            In order to make the program faster, I used multi-threading to run the QR code detection and sign-in automation in parallel.
                        </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            Personal Website
                        </h2>

                        <h3 className="mb-4 text-lg font-light tracking-tight leading-none text-gray-500 md:text-xl lg:text-2xl dark:text-white">
                            Next.js |  TypeScript | Tailwind | Firebase
                        </h3>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            <Link href={"https://github.com/shreyasprasad14/shreyasprasad.dev"} className="text-blue-400 hover:text-blue-600">
                                This website
                            </Link> was developed for CSE 300: Technical Communications.
                            The repository is hosted on GitHub and uses GitHub Actions to run Google Cloud Functions to deploy onto Firebase.
                        </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            Press Release
                        </h2>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            For CSE 300: Technical Communications, I wrote a <Link href={"https://docs.google.com/document/d/1HsCKmJYY86Ray23L0bvFwXP-bao3g3EId4ptGVQ8F9I/edit?usp=sharing"} className="text-blue-400 hover:text-blue-600">
                                mock press release
                            </Link> describing the release of Bing's new AI chatbot.
                        </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            User Instructions
                        </h2>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            For CSE 300: Technical Communications, I wrote  <Link href={"https://docs.google.com/document/d/1efIckkH7AdYOsPwaGKZejA5c3i41wxE6jr3vhQ2Gcao/edit?usp=sharing"} className="text-blue-400 hover:text-blue-600">
                            user instructions
                        </Link> to guide users through the process of writing a Python program to read a QR Code from the webcam.
                        </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            User Instructions
                        </h2>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            For CSE 300: Technical Communications, I worked with a team of 4 to present a proposal
                            for Stony Brook University's Computer Science program to <Link href={"https://docs.google.com/presentation/d/1kYLztXk8pgfXR_PQkbyobNv9vdMBtgl014iY4bq2QHo/edit?usp=sharing"} className="text-blue-400 hover:text-blue-600">
                            better prepare students for the workforce
                        </Link>.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    )
}