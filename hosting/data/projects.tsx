export type Project = {
    id: string,
    title: string,
    context: string,
    stack: string[],
    body: React.ReactNode,
};

export const projects: Project[] = [
    {
        id: "mapreduce",
        title: "MapReduce",
        context: "Georgia Tech, CS 6210",
        stack: ["C++", "CMake"],
        body: <>
            <p>
                As a part of CS 6210: Advanced Operating Systems at Georgia Tech, I implemented a generalized MapReduce framework in C++.
                The framework allows users to specify a map and reduce function, and a list of input files.
                The framework then distributes the map and reduce tasks to multiple processes, and aggregates the results.
            </p>
            <p>
                The master node maintains the status of worker nodes, and distributes the map and reduce tasks to the available workers.
                The workers execute the map and reduce functions, and send the results back to the master node.
                The master node aggregates the results, and writes them to the output files.
            </p>
            <p>
                I designed the framework to be fault-tolerant. The master node is also responsible for moving tasks from failing/slow workers to healthy ones,
                and redistributing the tasks to the workers.
            </p>
        </>,
    },
    {
        id: "ad-admin",
        title: "Active Directory Administrator Management",
        context: "Cohen & Steers",
        stack: [".NET Core", "C#", "Angular", "TypeScript", "SQL Server", "Azure Pipelines"],
        body: <>
            <p>
                As a part of an internship at Cohen & Steers, I developed an internal web application to
                manage Active Directory administrators.
                I corresponded with the IT and Development teams to gather requirements, and designed the
                application architecture and database schema.
            </p>
            <p>
                The application allows developers to temporarily elevate their privileges to perform
                administrative tasks, and automatically reverts the changes after a specified time.
                The application also allows IT administrators to view and manage all elevated privileges,
                with logging and auditing capabilities.
            </p>
        </>,
    },
    {
        id: "tileset",
        title: "2D Tileset Generator",
        context: "Stony Brook, CSE 416",
        stack: ["React", "Tailwind", "Node.js", "Express", "Socket.io", "MongoDB", "AWS"],
        body: <>
            <p>
                As a part of CSE 416: Software Engineering,
                I worked with a team of 4 to develop a <a href="https://github.com/Lawnmower-416/Lawnmower" className="link">2D Tileset Generator</a>.
                The application allows users to collaborate in real-time to create tilesets & maps for 2D
                games by either uploading an image or drawing their own.
            </p>
            <p>
                I developed the tileset and map editor, featuring real-time collaboration using Socket.io
                and web workers for fast image processing.
                I also set up the AWS EC2 instance to host the application, and the CI/CD pipeline using
                GitHub Actions, and AWS CodeDeploy.
            </p>
        </>,
    },
    {
        id: "qr-sign-in",
        title: "QR Code Sign-In System",
        context: "Mathnasium",
        stack: ["Python", "OpenCV", "Selenium", "MongoDB"],
        body: <>
            <p>
                In order to speed up the online sign-in process for students at Mathnasium, I developed
                a <a href="https://github.com/shreyasprasad14/QR-Sign-in-System" className="link">QR Code Sign-In System</a>.
                The system uses OpenCV2 to detect QR codes from a webcam, and Selenium to automate the
                sign-in process on the Mathnasium website.
            </p>
            <p>
                The system also stores the sign-in data in a MongoDB database, which can be used to generate
                reports.
                In order to make the program faster, I used multi-threading to run the QR code detection and
                sign-in automation in parallel.
            </p>
        </>,
    },
    {
        id: "website",
        title: "Personal Website",
        context: "This site",
        stack: ["Next.js", "TypeScript", "Tailwind", "Cloudflare"],
        body: <>
            <p>
                <a href="https://github.com/shreyasprasad14/shreyasprasad.dev" className="link">This website</a> was
                developed to introduce myself to Next.js, is hosted on GitHub and uses GitHub
                Actions to deploy it as a static site onto Cloudflare.
            </p>
        </>,
    },
];
