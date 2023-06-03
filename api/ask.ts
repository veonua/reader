import { extract } from "../utils/extract"
import { answerQuestion, createEmbeddings,  } from "../utils/openai"
import { getEmbeddings } from "../utils/embeddings"
import { Metadata, queryEmbedding } from "../utils/pinecone"

interface RequestBody {
  uri: string;
  ask: string;
  max_length: number;
  max_duration: number;
  no_cache: boolean;
}

export default async function handler(req, res) {
    const uri = req.body.uri as string;
    const ask = req.body.ask as string;
    const max_length = req.body.max_length as number;
    const max_duration = req.body.max_duration as number;
    const no_cache = req.body.no_cache as boolean;
    //const { uri, ask, max_length, max_duration, no_cache } : RequestBody = req.body;

    // try to get response if no answers, try to request embeddings and ask again
    const ask_embedding = await createEmbeddings([ask]);


    var resp = await queryEmbedding(uri, ask_embedding[0]);
    if (resp.matches.length == 0) {
      console.log("no response found, trying to extract");
      const data = await extract(uri, max_length, max_duration, no_cache);
      const embeddings = await getEmbeddings(uri, data, no_cache);
      resp = await queryEmbedding(uri, ask_embedding[0]);
    }

    let values = resp.matches.map((m) => ({
      timecode: m.id.split("#")[1],
      content: (m.metadata as Metadata).textContent
    }));

    // merge values to one string
    let value = values.map((v) => "["+ v.timecode+"]: " + v.content).join("\n");

    let answer = await answerQuestion(ask, value);

    res.json({answer});
  }

