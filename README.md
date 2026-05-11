# RAG-DocScraper

> A powerful document scraping and indexing pipeline built for Retrieval-Augmented Generation (RAG) workflows.

RAG-DocScraper automates the collection, parsing, chunking, and embedding of documents from web sources and local files — giving your LLM applications a rich, up-to-date knowledge base to query against.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Supported Sources](#supported-sources)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Multi-source scraping** — Crawl websites, parse PDFs, Word docs, Markdown files, and plain text
- **Intelligent chunking** — Configurable strategies (fixed-size, sentence-aware, semantic) to split documents optimally for retrieval
- **Embedding pipeline** — Plug in any embedding model (OpenAI, HuggingFace, Ollama, etc.)
- **Vector store integration** — Store and query embeddings via Chroma, Pinecone, Weaviate, or FAISS
- **Incremental updates** — Track document changes and only re-index what's new or modified
- **Metadata preservation** — Retains source URL, title, timestamps, and custom tags alongside chunks
- **CLI & Python API** — Use as a command-line tool or import directly into your RAG application

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      RAG-DocScraper                     │
│                                                         │
│  Sources          Pipeline              Storage         │
│  ┌──────────┐    ┌──────────────────┐  ┌────────────┐  │
│  │ Web URLs │───▶│ Scraper / Parser │  │            │  │
│  ├──────────┤    ├──────────────────┤  │   Vector   │  │
│  │  PDFs    │───▶│    Chunker       │─▶│   Store    │  │
│  ├──────────┤    ├──────────────────┤  │            │  │
│  │  Docs    │───▶│  Embedder        │  │ (Chroma /  │  │
│  ├──────────┤    └──────────────────┘  │  Pinecone /│  │
│  │Markdown  │                          │  FAISS)    │  │
│  └──────────┘                          └────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Python 3.9+
- `pip` or `uv`
- An embedding model API key (OpenAI) **or** a locally running model (Ollama)
- A supported vector store (Chroma runs locally with no extra setup)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/RAG-DocScraper.git
cd RAG-DocScraper

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

For optional extras:

```bash
# Pinecone support
pip install -e ".[pinecone]"

# Weaviate support
pip install -e ".[weaviate]"

# All extras
pip install -e ".[all]"
```

---

## Configuration

Copy the example config and fill in your values:

```bash
cp config.example.yaml config.yaml
```

```yaml
# config.yaml

scraper:
  max_depth: 3              # How deep to follow links
  delay_ms: 500             # Polite crawl delay between requests
  user_agent: "RAG-DocScraper/1.0"
  exclude_patterns:
    - "*/login*"
    - "*/admin*"

chunker:
  strategy: "sentence"      # Options: fixed, sentence, semantic
  chunk_size: 512           # Tokens per chunk
  chunk_overlap: 64         # Overlap between consecutive chunks

embedder:
  provider: "openai"        # Options: openai, huggingface, ollama
  model: "text-embedding-3-small"
  api_key: "${OPENAI_API_KEY}"

vector_store:
  provider: "chroma"        # Options: chroma, pinecone, weaviate, faiss
  collection: "my_docs"
  persist_directory: "./chroma_db"
```

Environment variables (`.env` is supported):

```bash
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENV=us-east-1
```

---

## Usage

### CLI

**Scrape a website and index it:**

```bash
python -m rag_docscraper scrape --url https://docs.example.com --depth 2
```

**Index local files:**

```bash
python -m rag_docscraper index --path ./my-documents --glob "**/*.pdf"
```

**Query your indexed knowledge base:**

```bash
python -m rag_docscraper query "How do I configure authentication?"
```

**Run a full pipeline from a config file:**

```bash
python -m rag_docscraper run --config config.yaml
```

---

### Python API

```python
from rag_docscraper import DocScraper, Chunker, Embedder, VectorStore

# Initialize components
scraper = DocScraper(max_depth=2, delay_ms=300)
chunker = Chunker(strategy="sentence", chunk_size=512, overlap=64)
embedder = Embedder(provider="openai", model="text-embedding-3-small")
store = VectorStore(provider="chroma", collection="my_docs")

# Run the pipeline
docs = scraper.scrape("https://docs.example.com")
chunks = chunker.chunk(docs)
embeddings = embedder.embed(chunks)
store.upsert(embeddings)

# Query
results = store.query("How do I reset my password?", top_k=5)
for r in results:
    print(r.text, r.metadata)
```

---

## Project Structure

```
RAG-DocScraper/
├── rag_docscraper/
│   ├── __init__.py
│   ├── cli.py              # CLI entry points
│   ├── scraper/
│   │   ├── web.py          # Web crawler (BeautifulSoup / Playwright)
│   │   ├── pdf.py          # PDF parser (pypdf / pdfplumber)
│   │   └── local.py        # Local file reader
│   ├── chunker/
│   │   ├── fixed.py        # Fixed-size chunking
│   │   ├── sentence.py     # Sentence-boundary chunking
│   │   └── semantic.py     # Semantic similarity chunking
│   ├── embedder/
│   │   ├── openai.py
│   │   ├── huggingface.py
│   │   └── ollama.py
│   └── store/
│       ├── chroma.py
│       ├── pinecone.py
│       ├── weaviate.py
│       └── faiss.py
├── tests/
│   ├── test_scraper.py
│   ├── test_chunker.py
│   └── test_embedder.py
├── config.example.yaml
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## Supported Sources

| Source Type     | Extension / Protocol       | Notes                          |
|-----------------|----------------------------|--------------------------------|
| Websites        | `http://`, `https://`      | Respects `robots.txt`          |
| PDFs            | `.pdf`                     | Text extraction + OCR fallback |
| Word Documents  | `.docx`                    | Tables and headings preserved  |
| Markdown        | `.md`, `.mdx`              | Front-matter metadata captured |
| Plain Text      | `.txt`, `.rst`             |                                |
| HTML Files      | `.html`, `.htm`            | Local files supported          |

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push to your fork: `git push origin feat/my-feature`
5. Open a Pull Request

Please make sure all tests pass before submitting:

```bash
pytest tests/ -v
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

> Built with ❤️ to make RAG pipelines easier to build and maintain.
