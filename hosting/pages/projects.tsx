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
                            MapReduce
                        </h2>

                        <h3 className="mb-4 text-lg font-light tracking-tight leading-none text-gray-500 md:text-xl lg:text-2xl dark:text-white">
                            C++, CMake
                        </h3>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            As a part of CS 6210: Advanced Operating Systems at Georgia Tech, I implemented a generalized MapReduce framework in C++.
                            The framework allows users to specify a map and reduce function, and a list of input files.
                            The framework then distributes the map and reduce tasks to multiple processes, and aggregates the results.
                        </p>
                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            The master node maintains the status of worker nodes, and distributes the map and reduce tasks to the available workers.
                            The workers execute the map and reduce functions, and send the results back to the master node.
                            The master node aggregates the results, and writes them to the output files.

                            I designed the framework to be fault-tolerant. The master node is also responsible for moving tasks from failing/slow workers to healthy ones,
                            and redistributing the tasks to the workers.
                        </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            Active Directory Administrator Management Web App
                        </h2>

                        <h3 className="mb-4 text-lg font-light tracking-tight leading-none text-gray-500 md:text-xl lg:text-2xl dark:text-white">
                            .NET Core | C# | Angular | TypeScript | SQL Server | Azure Pipelines
                        </h3>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            As a part of an internship at Cohen & Steers, I developed an internal web application to
                            manage Active Directory administrators.
                            I corresponded with the IT and Development teams to gather requirements, and designed the
                            application architecture and database schema.
                        </p>
                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            The application allows developers to temporarily elevate their privileges to perform
                            administrative tasks, and automatically reverts the changes after a specified time.
                            The application also allows IT administrators to view and manage all elevated privileges,
                            with logging and auditing capabilities.
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
                            I worked with a team of 4 to develop a <Link
                            href={"https://github.com/Lawnmower-416/Lawnmower"}
                            className="text-blue-400 hover:text-blue-600">
                            2D Tileset Generator
                        </Link>.
                            The application allows users to collaborate in real-time to create tilesets & maps for 2D
                            games by either uploading an image or drawing their own.
                        </p>
                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            I developed the tileset and map editor, featuring real-time collaboration using Socket.io
                            and web workers for fast image processing.
                            I also set up the AWS EC2 instance to host the application, and the CI/CD pipeline using
                            GitHub Actions, and AWS CodeDeploy.
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
                            In order to speed up the online sign-in process for students at Mathnasium, I developed
                            a <Link href={"https://github.com/shreyasprasad14/QR-Sign-in-System"}
                                    className="text-blue-400 hover:text-blue-600">
                            QR Code Sign-In System
                        </Link>.
                            The system uses OpenCV2 to detect QR codes from a webcam, and Selenium to automate the
                            sign-in process on the Mathnasium website.
                        </p>
                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">

                            The system also stores the sign-in data in a MongoDB database, which can be used to generate
                            reports.
                            In order to make the program faster, I used multi-threading to run the QR code detection and
                            sign-in automation in parallel.
                        </p>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-900">
                    <div className="py-4 px-4 mx-auto max-w-screen-xl text-center lg:py-8">
                        <h2 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
                            Personal Website
                        </h2>

                        <h3 className="mb-4 text-lg font-light tracking-tight leading-none text-gray-500 md:text-xl lg:text-2xl dark:text-white">
                            Next.js | TypeScript | Tailwind | Firebase
                        </h3>

                        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-8 lg:px-24 dark:text-gray-400">
                            <Link href={"https://github.com/shreyasprasad14/shreyasprasad.dev"}
                                  className="text-blue-400 hover:text-blue-600">
                                This website
                            </Link> was developed to introduce myself to Next.js, is hosted on GitHub and uses GitHub
                            Actions to run Google Cloud Functions to deploy onto Firebase.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    )
}