const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { getSubtitles } = require('youtube-captions-scraper');

const express = require('express');
const app = express();

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

async function extract(uri, max_length, max_duration) {
    var article = null;
    // if uri is youtube video, get the video subtitles
    if (uri.includes("youtube")) {
        var max_length = req.query.max_length || 1000;
        var max_duration = req.query.max_duration || 20;
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

app.get('/api', async (req, res) => {
    const uri = req.query.uri;
    const max_length = req.query.max_length || 1000;
    const max_duration = req.query.max_duration || 20;

    res.json(await extract(uri, max_length, max_duration));    
});


app.listen(3000, () => console.log('Listening on port 3000'));
// Export the Express API
module.exports = app;
