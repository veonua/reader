import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { getSubtitles } from "youtube-captions-scraper";
import kv from "@vercel/kv";

class Chunk {
    text: string;
    start: number;
    dur: number;
}

function getChunks(textContent:Array<any>, max_length=1000, max_duration=120.) : Array<Chunk>
{
    let chunks = Array<Chunk>();
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
            const len = chunks.push({
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

export class ExtractResult {
    kind: string;
    content: Chunk[];
    textContent: string;
    title: string;
    byline: string;
    length: number;
    excerpt: string;
    siteName: string;
    
    language: string;
    constructor(kind:string, data:any) {
      this.kind = kind;
  
      if (kind === 'youtube') {
        this.content = data;
      } else if (kind === 'article') {
        this.textContent = data.textContent;
        this.title = data.title;
        this.byline = data.byline;
        this.length = data.length;
        this.excerpt = data.excerpt;
        this.siteName = data.siteName;
        this.language = data.language;
      } else {
        throw new Error('Invalid kind provided');
      }
    }
  }
  

export async function extract(uri:string, max_length:number, max_duration:number, no_cache:boolean = false) : Promise<ExtractResult> {
    var data = await kv.get<ExtractResult>("d:"+uri);
    if (data != null && !no_cache) {
        return data;
    }

    console.log("extracting from " + uri);
    // if uri is youtube video, get the video subtitles
    if (uri.includes("youtube")) {
        let id = uri.split("v=")[1];

        var captions = await getSubtitles({
            videoID: uri.split("v=")[1],
          })
        
        const res = new ExtractResult("youtube", getChunks( captions ));
        kv.set("d:"+uri, JSON.stringify(res));

        return res;

    } else {
        const response = await fetch(uri);
        const html = await response.text();
        const doc = new JSDOM(html);
        const reader = new Readability(doc.window.document);
        var article = reader.parse();
        
        if (article == null) {
            throw new Error("Article not found");
        }

        const res = new ExtractResult("article", {
            textContent: article.textContent,
            title: article.title,
            byline: article.byline,
            length: article.length,
            excerpt: article.excerpt,
            siteName: article.siteName,
            language: article.lang, 
            });
        kv.set("d:"+uri, JSON.stringify(res));
        return res;
    }
}
