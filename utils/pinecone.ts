import { PineconeClient } from "@pinecone-database/pinecone";
import { VectorOperationsApi, UpsertRequest, QueryResponse } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch";

const pinecone = new PineconeClient();
// await is only valid in async functions and the top level bodies of modules

let _index: VectorOperationsApi;

async function getIndex(): Promise<VectorOperationsApi> {
  if (!_index) {
    _index = await initialize();
  }
  return _index;
}

async function initialize(): Promise<VectorOperationsApi> {
  try {
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY || "",
      environment: process.env.PINECONE_ENVIRONMENT || "us-west1-gcp",
    });

    /*
    if process.env.INDEX_NAME not in pinecone.list_indexes():
    pinecone.create_index('openai', dimension=len(embeds[0]))
    */

    let index_name = process.env.INDEX_NAME || "";
    let index = pinecone.Index(index_name);
    if (index === undefined) {
      console.log(`Index not found, creating '${index_name}'`);
      throw new Error("Index not found");
    }
    
    return index;
  } catch (e) {
    console.log("failed", e);
  }
}

// const index = async (): Promise<VectorOperationsApi> => {
//   if (_index === undefined) {
//     try {
//       await pinecone.init({
//         apiKey: process.env.PINECONE_API_KEY || "",
//         environment: process.env.PINECONE_ENVIRONMENT || "us-west1-gcp",
//       });

//       /*
//       if process.env.INDEX_NAME not in pinecone.list_indexes():
//       pinecone.create_index('openai', dimension=len(embeds[0]))
//       */

//       _index = pinecone.Index(process.env.INDEX_NAME || "");
//       if (_index === undefined) {
//         console.log("Index not found, creating...");
//         throw new Error("Index not found");
//       } else {
//         console.log("Index found");
//       }
//     } catch (e) {
//       console.log("failed", e);
//     }
//   }
  
//   return _index;
// };

export class Metadata {
  uri: string;
  textContent: string;
}

export class Record {
  id: string;
  text: string;
  embedding: Array<number>;
}

const saveEmbeddings = async ( 
  id: string,
  records: Array<Record>,
  metadata?: object,
  namespace?: string
  ): Promise<boolean> => {
    const ind = await getIndex();

    const upsertRequest : UpsertRequest = {
      vectors: records.map((r) => ({ 
        id: id + "#" + r.id,
        values: r.embedding,
        metadata: {
          uri: id,
          textContent: r.text, 
        } })),
      namespace,
    };

    try {
      const response = await ind.upsert( {upsertRequest} );
      return response?.upsertedCount > 0;
    } catch (e) {
      console.log("failed", e);
    }
    return false;
};

const queryEmbedding = async ( 
  uri: string,
  vector: Array<number>,
  topK: number = 5,
  ) : Promise<QueryResponse> => {
  const ind = await getIndex();
  const queryRequest = {
    topK: topK,
    vector: vector,
    includeMetadata: true,
    filter: {
      uri: {"$eq": uri},
    }
  };
  return await ind.query({ queryRequest });
  // try {
  //   const response = await ind.query({ queryRequest });
  //   const match = response.matches[0];
  //   const metadata = match?.metadata;
  //   const score = match?.score;
  //   return {
  //     label: "Unknown",
  //     confidence: score,
  //   };
  // } catch (e) {
  //   console.log("failed", e);
  // }
};
  
const health = async () => {
    try {
      const ind = await getIndex();

      if (ind === undefined) {
        console.log("Index not found, creating...");
      }
      const stats = "ok" // await ind.describeIndexStatsRaw();
      return stats !== undefined;
    } catch (e) {
      console.log("failed", e);
      return false;
    }
};

export { pinecone, health, saveEmbeddings, queryEmbedding };