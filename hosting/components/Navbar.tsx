import { Roboto } from 'next/font/google'

import { Navbar } from "flowbite-react";
import 'tailwindcss/tailwind.css'
import {useRouter} from "next/router";


const roboto = Roboto({
    weight: "400",
    variable: "--font-roboto",
    subsets: ["latin"],
});

export default function Navigation() {
    const router = useRouter();
    const route = router.pathname;
    return (
        <>
            <style jsx global>
                {`
                  :root {
                    --font-roboto: ${roboto.style.fontFamily};
                  }
                `}
            </style>
            <Navbar
                fluid={true}
                rounded={true}
            >
                <Navbar.Brand href="/">
                    <span className="self-center whitespace-nowrap text-xl font-sans font-semibold dark:text-white">
                      Shreyas Prasad
                    </span>
                </Navbar.Brand>
                <Navbar.Toggle />
                <Navbar.Collapse>
                    <Navbar.Link
                        href="/"
                        active={route === "/"}
                    >
                        Home
                    </Navbar.Link>
                    <Navbar.Link
                        href="/about"
                        active={route === "/about"}
                    >
                        About
                    </Navbar.Link>
                    <Navbar.Link
                        href="/projects"
                        active={route === "/projects"}
                    >
                        Projects
                    </Navbar.Link>
                </Navbar.Collapse>
            </Navbar>
        </>
    )
}