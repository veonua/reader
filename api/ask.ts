import { extract } from "../utils/extract"
import { answerQuestion, createEmbeddings,  } from "../utils/openai"
import { getEmbeddings } from "../utils/embeddings"
import { Metadata, queryEmbedding } from "../utils/pinecone"
import { normalizeUrl } from "../utils/url"

interface RequestBody {
  uri: string;
  ask: string;
  max_length: number;
  max_duration: number;
  no_cache: boolean;
}

export default async function handler(req, res) {
    const { uri, ask, max_length, max_duration, no_cache } : RequestBody = req.body;


    // try to get response if no answers, try to request embeddings and ask again
    const ask_embedding = await createEmbeddings([ask]);
    let goodUrl;
    try {
      goodUrl = normalizeUrl(uri);
    } catch (e) {
      res.status(400).json({ error: e.message, type: e.name });
      return;
    }

    try {
      var resp = await queryEmbedding(goodUrl, ask_embedding[0]);
      if (resp.matches.length == 0) {
        console.log("no response found, trying to extract");
        const data = await extract(goodUrl, max_length, max_duration, no_cache);
        const embeddings = await getEmbeddings(goodUrl, data, no_cache);
        resp = await queryEmbedding(goodUrl, ask_embedding[0]);
      }

      let values = resp.matches.map((m) => ({
        timecode: m.id.split("#")[1],
        content: (m.metadata as Metadata).textContent
      }));

      // merge values to one string
      let value = values.map((v) => "<"+ v.timecode+"> " + v.content);
      let answer = await answerQuestion(ask, value);

      res.json({answer});
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e.message, type: e.name });
    }
}

