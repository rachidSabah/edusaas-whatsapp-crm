// Puter.js Integration for Serverless AI and Cloud Services
// This module provides access to Puter.js AI capabilities without API keys

declare global {
  interface Window {
    puter: {
      ai: {
        chat: (message: string, options?: { model?: string; stream?: boolean }) => Promise<any>;
        txt2img: (prompt: string, returnImage?: boolean) => Promise<any>;
      };
      fs: {
        write: (path: string, content: string | Blob) => Promise<any>;
        read: (path: string) => Promise<any>;
        mkdir: (path: string) => Promise<any>;
        readdir: (path: string) => Promise<any>;
        delete: (path: string) => Promise<any>;
        upload: (file: File) => Promise<any>;
      };
      kv: {
        set: (key: string, value: any) => Promise<void>;
        get: (key: string) => Promise<any>;
        del: (key: string) => Promise<void>;
        list: (options?: { prefix?: string }) => Promise<any[]>;
      };
      auth: {
        signIn: () => Promise<any>;
        signOut: () => Promise<void>;
        getUser: () => Promise<any>;
        isSignedIn: () => boolean;
      };
      net: {
        fetch: (url: string, options?: RequestInit) => Promise<Response>;
      };
    };
  }
}

// Available AI models on Puter
export const AI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'Google' },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', provider: 'Meta' },
  { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', provider: 'Mistral' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'DeepSeek' },
];

// Default model for general use
export const DEFAULT_MODEL = 'gpt-4o-mini';

// Check if Puter.js is loaded
export function isPuterLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.puter !== 'undefined';
}

// Initialize Puter.js
export function initPuter(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isPuterLoaded()) {
      resolve(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://js.puter.com/v2/"]');
    if (existingScript) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (isPuterLoaded()) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 10000);
      return;
    }

    // Load Puter.js script
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    
    script.onload = () => {
      // Give it a moment to initialize
      setTimeout(() => {
        resolve(isPuterLoaded());
      }, 500);
    };
    
    script.onerror = () => {
      console.error('Failed to load Puter.js');
      resolve(false);
    };
    
    document.head.appendChild(script);
  });
}

// AI Chat with Puter
export async function aiChat(
  message: string, 
  options: { 
    model?: string; 
    stream?: boolean;
    systemPrompt?: string;
  } = {}
): Promise<string> {
  if (!isPuterLoaded()) {
    await initPuter();
  }
  
  if (!isPuterLoaded()) {
    throw new Error('Puter.js not loaded');
  }

  const fullMessage = options.systemPrompt 
    ? `${options.systemPrompt}\n\nUser: ${message}`
    : message;

  try {
    if (options.stream) {
      const response = await window.puter.ai.chat(fullMessage, {
        model: options.model || DEFAULT_MODEL,
        stream: true,
      });
      
      let fullText = '';
      for await (const part of response) {
        if (part?.text) {
          fullText += part.text;
        }
      }
      return fullText;
    } else {
      const response = await window.puter.ai.chat(fullMessage, {
        model: options.model || DEFAULT_MODEL,
      });
      return response?.message?.content || response?.text || String(response);
    }
  } catch (error) {
    console.error('AI Chat error:', error);
    throw error;
  }
}

// Generate image with AI
export async function generateImage(prompt: string): Promise<string> {
  if (!isPuterLoaded()) {
    await initPuter();
  }
  
  if (!isPuterLoaded()) {
    throw new Error('Puter.js not loaded');
  }

  try {
    const image = await window.puter.ai.txt2img(prompt, true);
    return image?.src || image?.url || String(image);
  } catch (error) {
    console.error('Image generation error:', error);
    throw error;
  }
}

// Save to cloud storage
export async function saveToCloud(path: string, content: string | Blob): Promise<any> {
  if (!isPuterLoaded()) {
    await initPuter();
  }
  
  if (!isPuterLoaded()) {
    throw new Error('Puter.js not loaded');
  }

  return window.puter.fs.write(path, content);
}

// Read from cloud storage
export async function readFromCloud(path: string): Promise<any> {
  if (!isPuterLoaded()) {
    await initPuter();
  }
  
  if (!isPuterLoaded()) {
    throw new Error('Puter.js not loaded');
  }

  return window.puter.fs.read(path);
}

// Key-Value storage
export async function setKV(key: string, value: any): Promise<void> {
  if (!isPuterLoaded()) {
    await initPuter();
  }
  
  if (!isPuterLoaded()) {
    throw new Error('Puter.js not loaded');
  }

  return window.puter.kv.set(key, JSON.stringify(value));
}

export async function getKV<T = any>(key: string): Promise<T | null> {
  if (!isPuterLoaded()) {
    await initPuter();
  }
  
  if (!isPuterLoaded()) {
    throw new Error('Puter.js not loaded');
  }

  const value = await window.puter.kv.get(key);
  if (value === null || value === undefined) return null;
  
  try {
    return JSON.parse(value);
  } catch {
    return value as T;
  }
}

// Authentication
export async function signInWithPuter(): Promise<any> {
  if (!isPuterLoaded()) {
    await initPuter();
  }
  
  if (!isPuterLoaded()) {
    throw new Error('Puter.js not loaded');
  }

  return window.puter.auth.signIn();
}

export async function getPuterUser(): Promise<any> {
  if (!isPuterLoaded()) {
    await initPuter();
  }
  
  if (!isPuterLoaded()) {
    return null;
  }

  return window.puter.auth.getUser();
}

// Knowledge Base AI Response
export async function getAIResponseForKnowledge(
  question: string,
  knowledgeEntries: Array<{ question: string; answer: string; keywords?: string }>,
  model: string = DEFAULT_MODEL
): Promise<string> {
  // Build context from knowledge entries
  const knowledgeContext = knowledgeEntries
    .map(entry => `Q: ${entry.question}\nR: ${entry.answer}`)
    .join('\n\n');

  const systemPrompt = `Tu es un assistant IA pour une école de langues au Maroc. 
Tu réponds aux questions des parents et étudiants en français de manière professionnelle et amicale.

Voici la base de connaissances de l'école:
${knowledgeContext}

Instructions:
- Réponds toujours en français
- Sois professionnel mais amical
- Si tu ne connais pas la réponse, dis-le poliment et propose de contacter l'administration
- Utilise les informations de la base de connaissances quand c'est pertinent
- Sois concis mais complet`;

  return aiChat(question, { model, systemPrompt });
}
