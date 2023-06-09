
export function normalizeUrl(value: string): URL {
    if (!value.startsWith("http://") && !value.startsWith("https://")) {
        throw new URIError("Invalid url");
    }
    let url = new URL(value);
    let fullpath = url.origin + url.pathname;
    
    if (url.hostname === "www.youtube.com") {
        let id = url.searchParams.get("v");
        if (id == null) {
            throw new URIError(`Unsupported youtube url ${url.toString()}`);
        }

        return new URL(`${fullpath}?v=${id}`);
    }
    return url;
}