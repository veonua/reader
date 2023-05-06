import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { getSubtitles } from "youtube-captions-scraper";

function getChunks(textContent, max_length=1000, max_duration=10.)
{
    let chunks = [];
    let mergedText = "";
    let totalDur = 0;
    let start = parseFloat(textContent[0].start);

    // Loop through each object in the textContent array
    for (let i = 0; i < textContent.length; i++) {
        // Add the text from each object to the mergedText variable
        let text = textContent[i].text.replace(/\n/g, " ").trim();
        mergedText += text + " ";
        
        // Add the duration of each object to the totalDur variable
        totalDur += parseFloat(textContent[i].dur);
        let isLast = i === textContent.length - 1;
        if (isLast || mergedText.length > max_length || totalDur > max_duration) {
            chunks.push({
                text: mergedText.trimEnd(),
                start: start,
                dur: totalDur
            });
            
            if (isLast) break;
            
            mergedText = "";
            totalDur = 0;
            start = parseFloat(textContent[i+1].start);
        }
    }
    return chunks;
}

export async function extract(uri, max_length, max_duration) {
    var article = null;
    // if uri is youtube video, get the video subtitles
    if (uri.includes("youtube")) {
        let id = uri.split("v=")[1];

        console.log("youtube video '" + uri + "' id: " + id);

        var captions = await getSubtitles({
            videoID: uri.split("v=")[1],
          })
        return { textContent: getChunks( captions, max_length, max_duration ) };

    } else {
        const response = await fetch(uri);
        const html = await response.text();
        const doc = new JSDOM(html);
        const reader = new Readability(doc.window.document);
        article = reader.parse();

        return { textContent: article.textContent,
               title: article.title,
               byline: article.byline,
               length: article.length,
               excerpt: article.excerpt,
               siteName: article.siteName,
               wordCount: article.wordCount,
               dir: article.dir,
               language: article.lang, 
               };
    }
}