import { extract } from '../utils/extract';
import { normalizeUrl } from '../utils/url';
import axios from 'axios';

interface ExtractParams {
  url: string;
  max_length: number;
  max_duration: number;
  no_cache: boolean;
}

export default async function handler(
  req: any,
  res: any
): Promise<void> {
  const { url, max_length, max_duration, no_cache }: ExtractParams = req.body;

  try {
    let goodUrl = normalizeUrl(url);
  
    const data = await extract(goodUrl, max_length, max_duration, no_cache);
    res.json(data);
  }  catch (e) {

    if (e instanceof URIError) {
      res.status(400).json({ error: e.message });
      return;
    }

    const code = e.code;
    if (code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Timeout' });
      return;
    }

    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      res.status(status).json({ error: e.message });
      return;
    }

    res.status(500).json({ error: e });
  }
}
