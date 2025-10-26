from fastapi import FastAPI
from pydantic import BaseModel
from law_rag import get_rag_answer as get_law_answer
from rag_llm_recent import get_rag_answer as get_manual_answer
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Runpod LLM RAG Server")

# CORS 정책 때문에 응답 못 받는 거 해결용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 출처 허용 (테스트용)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Query(BaseModel):
    text: str
    mode: str = "manual"  # 기본값: 매뉴얼 모드

# 포트연결 정상 적동 되었는지 확인용
@app.get("/health")
def health_check():
    return {"status": "ok"}


# 요청받는 endpoint 
@app.post("/rag")
def rag_chat(req: Query):
    if req.mode == "manual":
        answer = get_manual_answer(req.text, persist_dir="vector_store_q_only")
    else:
        answer = get_law_answer(req.text)
    return {"mode": req.mode, "answer": answer}
