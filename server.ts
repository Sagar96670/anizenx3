import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = 'https://anime-api-new.antideploy.app';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // API Proxy routes to https://anime-api-new.antideploy.app
  app.use('/api', async (req, res) => {
    try {
      const targetUrl = `${API_BASE}/api${req.url}`;
      const headers: Record<string, string> = {};
      if (req.headers['content-type']) {
        headers['content-type'] = req.headers['content-type'] as string;
      }
      if (req.headers['accept']) {
        headers['accept'] = req.headers['accept'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const apiRes = await fetch(targetUrl, fetchOptions);
      const data = await apiRes.text();

      res.status(apiRes.status);
      const contentType = apiRes.headers.get('content-type');
      if (contentType) {
        res.setHeader('content-type', contentType);
      }
      res.send(data);
    } catch (error) {
      console.error('API Proxy Error:', error);
      res.status(500).json({ status: false, error: 'Proxy failed to reach Anime API' });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
