import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { getSubtitles } from "youtube-captions-scraper";
import kv from "@vercel/kv";
import axios from 'axios';

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
  

export async function extract(uri:URL, max_length:number, max_duration:number, no_cache:boolean = false, lang:string="en") : Promise<ExtractResult> {
    var data = await kv.get<ExtractResult>("d:"+uri);
    if (data != null && !no_cache) {
        console.log("using cache for " + uri);
        return data;
    }

    console.log("extracting from " + uri);
    // if uri is youtube video, get the video subtitles
    if (uri.hostname === "www.youtube.com") {
      let id = uri.searchParams.get("v");

      if (uri.pathname != "/watch" || id == null) {
        throw new Error("Invalid youtube url "+uri.toString() + " " + uri.pathname + " " + id);
      }
      
      let cleanUri = uri.origin + uri.pathname + "?v=" + id;

        try {
          var captions = await getSubtitles({
            videoID: id,
            lang: lang, // default: `en`
          })
        
          const res = new ExtractResult("youtube", getChunks( captions ));
          kv.set("d:"+cleanUri, JSON.stringify(res));
          return res;
        } catch (e) {
          console.log(e);
          throw new Error("Error extracting from youtube");
        }
    } else {
        const instance = axios.create({
          timeout: 10000,
        });
        const response = await instance.get(uri.toString()); // .then(res => res.data);

        console.log("got response:");
        console.log(response.status);
        const html = await response.data;
        const doc = new JSDOM(html);
        const reader = new Readability(doc.window.document);
        var article = reader.parse();
        
        if (article == null) {
            throw new Error("Article not found");
        }

        const res = new ExtractResult("article", {
            textContent: article.textContent?.trim(),
            title: article.title?.trim(),
            byline: article.byline?.trim(),
            length: article.length,
            excerpt: article.excerpt?.trim(),
            siteName: article.siteName?.trim(),
            language: article.lang?.trim(), 
            });
        kv.set("d:"+uri, JSON.stringify(res));
        return res;
    }
}
