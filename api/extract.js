import { extract } from "../utils/extract"

export default async function handler(req, res) {
    const { uri, max_length, max_duration } = req.body;

    res.json(await extract(uri, max_length, max_duration));    
  }

