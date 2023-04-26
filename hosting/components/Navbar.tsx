import { Roboto } from 'next/font/google'

import { Navbar } from "flowbite-react";
import 'tailwindcss/tailwind.css'
import {useRouter} from "next/router";

import logo from '../public/favicon.svg'
import Image from "next/image";


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
                      <Image src={logo} alt="Shreyas Prasad" width={50} height={50} />
                    </span>
                </Navbar.Brand>
                <Navbar.Toggle />
                <Navbar.Collapse>
                    <Navbar.Link
                        href="/"
                        active={route === "/"}
                        className="md:text-xl"
                    >
                        Home
                    </Navbar.Link>
                    <Navbar.Link
                        href="/about"
                        active={route === "/about"}
                        className="md:text-xl"
                    >
                        About
                    </Navbar.Link>
                    <Navbar.Link
                        href="/projects"
                        active={route === "/projects"}
                        className="md:text-xl"
                    >
                        Projects
                    </Navbar.Link>
                </Navbar.Collapse>
            </Navbar>
        </>
    )
}