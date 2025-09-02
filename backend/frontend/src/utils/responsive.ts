import { useEffect, useState } from "react";

export function useIsNarrow(maxWidth = 420) {
    const [narrow, setNarrow] = useState<boolean>(() => window.innerWidth <= maxWidth);
    useEffect(() => {
        const onResize = () => setNarrow(window.innerWidth <= maxWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [maxWidth]);
    return narrow;
}
