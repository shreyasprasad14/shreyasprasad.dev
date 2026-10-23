import {existsSync} from "node:fs";

export const site = {
  name: "Shreyas Prasad",
  description: "Senior Software Engineer at IBM, building distributed systems where infrastructure meets AI.",
  email: "contact@shreyasprasad.dev",
  github: "https://github.com/shreyasprasad14",
  linkedin: "https://www.linkedin.com/in/shreyprasad/",
};

// Link the self-hosted PDF once public/resume.pdf exists; until then, the copy the old site linked to.
export const resumeHref = existsSync("public/resume.pdf")
  ? "/resume.pdf"
  : "https://drive.google.com/file/d/1kk1EVpVUMF1AJAxnaqnouh_AnC6JCOq6/view?usp=sharing";
