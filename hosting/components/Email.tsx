import {useEffect, useState} from "react";

const address = "contact@shreyasprasad.dev";

export default function Email() {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(timer);
    }, [copied]);

    return (
        <span className="inline-flex items-baseline gap-3">
            <a href={`mailto:${address}`} className="link">{address}</a>
            <button
                type="button"
                onClick={() => {
                    navigator.clipboard.writeText(address);
                    setCopied(true);
                }}
                className="font-mono text-xs text-muted hover:text-accent transition-colors"
            >
                <span aria-live="polite">{copied ? "copied" : "copy"}</span>
            </button>
        </span>
    );
}
