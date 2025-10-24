import torch
import re
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline, StoppingCriteria, StoppingCriteriaList
#from langchain.prompts import PromptTemplate
from langchain_core.prompts import PromptTemplate
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFacePipeline, HuggingFaceEmbeddings
from langchain_core.output_parsers import BaseOutputParser
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from dotenv import load_dotenv
from huggingface_hub import login
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # 벡터DB 경로 설정용

load_dotenv()
login(token=os.getenv('HF_TOKEN'))
#token = os.getenv("HF_TOKEN")
#model_name = "naver-hyperclovax/HyperCLOVAX-SEED-Text-Instruct-0.5B"
model_name = "naver-hyperclovax/HyperCLOVAX-SEED-Text-Instruct-1.5B"

"""
pip3 install torch torchvision
pip install torch transformers langchain-core langchain-community chromadb langchain-chroma sentence-transformers langchain-huggingface
"""

# 1. 디바이스 설정
if torch.backends.mps.is_available():
    device_str = "mps"
elif torch.cuda.is_available():
    device_str = "cuda"
else:
    device_str = "cpu"
#print(f"[Device] Using: {device_str}")


# 2. sLLM 로드 (HyperCLOVAX)
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name).to(device_str)

class StopOnTokens(StoppingCriteria):
    def __init__(self, stop_token_ids):
        self.stop_token_ids = stop_token_ids
    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor, **kwargs) -> bool:
        for stop_id in self.stop_token_ids:
            if stop_id in input_ids[0]:
                return True
        return False

stop_tokens = [tokenizer.eos_token_id]
stopping_criteria_list = StoppingCriteriaList([StopOnTokens(stop_tokens)])

generator = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    device=device_str,
    max_new_tokens=512,  
    temperature=0.8,      
    return_full_text=False,
    stopping_criteria=stopping_criteria_list
)

llm = HuggingFacePipeline(pipeline=generator)


# 3. Vector DB 불러오기
def load_vectordb(persist_dir="vector_store_q_only"):
    db_path = os.path.join(BASE_DIR, persist_dir)
    embedding_model = HuggingFaceEmbeddings(model_name="nlpai-lab/KURE-v1")
    return Chroma(persist_directory=db_path, embedding_function=embedding_model)


def get_retriever(db, mode="similarity", k=1):
    if mode == "similarity":
        return db.as_retriever(search_type="similarity", search_kwargs={"k": k})
    elif mode == "mmr":
        return db.as_retriever(search_type="mmr", search_kwargs={"k": k, "lambda_mult": 0.5})
    elif mode == "threshold":
        return db.as_retriever(search_type="similarity_score_threshold", search_kwargs={"score_threshold": 0.7, "k": k})
    else:
        raise ValueError(f"지원하지 않는 검색 모드: {mode}")


# 후처리 파서 (불필요한 단어 제거)
""" 
class CleanOutputParser(BaseOutputParser[str]):
    def parse(self, text: str) -> str:
        match = re.search(r"답변\s*[:：]\s*(.*)", text, re.DOTALL)
        if match:
            text = match.group(1)

        text = re.sub(r"(운전자:|고라니:|정답:).*", "", text)
        text = re.sub(r"---.*", "", text)
        text = text.strip()

        # 문장 4줄 이상이면 앞부분만 남김
        lines = text.split("\n")
        if len(lines) > 4:
            text = "\n".join(lines[:4])

        return text.strip() if text else "답변을 찾을 수 없습니다."
"""




# 4. 프롬프트
prompt_template = """
너는 초보 운전자를 돕는 챗봇이야.  
[질문]을 읽고, 상황 파악을 한 뒤,
[참고문서]를 기반으로 운전자에게 가장 필요한 내용만을 취합해 정확하게 대답해.

<출력 규칙> 
- 반드시 번호 순서로 단계별 제시.  
- [참고 문서에] "(출처: ~)"가 있다면 그 부분은 말하지마.
- [참고 문서]에 없는 내용이면 "안전운전을 하세요"라고 답변.

[질문]  
{question}

[참고 문서]  
{context}  
---  
최종 답변:
"""


PROMPT = PromptTemplate(
    template=prompt_template,
    input_variables=["question", "context"]
)


def get_rag_answer(query: str, persist_dir="vector_store_q_only", k=3, search_mode="similarity"):
    db = load_vectordb(persist_dir)
    print("문서 검색중...")
    retriever = get_retriever(db, mode=search_mode, k=k)
    #retrieved_docs = retriever.get_relevant_documents(query) # 옛날 방식
    retrieved_docs = retriever.invoke(query)
    print("문서 검색 완료\n")
    
    # 참고한 문서 출력
    
    print("📄 **참고한 사례 문서들:**")
    for i, doc in enumerate(retrieved_docs, 1):
        # 문서 내용의 첫 100자만 표시
        preview = doc.page_content[:100].replace("\n", " ")
        print(f"{i}. {preview}...")
        if hasattr(doc, 'metadata') and doc.metadata:
            print(f"   출처: {doc.metadata}")
    print("-" * 50)
    

    def format_docs(docs):
        formatted = []
        context = []
        for i, doc in enumerate(docs):
            question = doc.page_content.strip()
            answer = doc.metadata.get("answer", "").strip() if doc.metadata else ""
            formatted.append(f"[상황]: {question}, [매뉴얼]: {answer}")
            #print(f"[상황]: {question}, [매뉴얼]: {answer}\n")
            context.append(f"[매뉴얼 {i+1}]: {answer}")
        
        return "\n".join(context)
    
    #print(format_docs(retrieved_docs)) # 테스트

    rag_chain = (
        {"context": RunnableLambda(lambda x: format_docs(retrieved_docs)), "question": RunnablePassthrough()}
        | PROMPT
        | llm
        #| CleanOutputParser()
    )

    print()
    #print("응답 생성중...\n")
    output = rag_chain.invoke(query)
    return output


# 6. 테스트 실행
"""
if __name__ == "__main__":
    while True:
        q = input("질문: ")
        ans = get_rag_answer(q, persist_dir="vector_store_q_only", search_mode="similarity", k=3)
        print("최종 답변:")
        print(ans)
        print()
        print()
        print("-" * 100)

"""
