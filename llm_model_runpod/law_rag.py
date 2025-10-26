import json, os, re
import torch
import chromadb
from huggingface_hub import login
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModel, StoppingCriteria, StoppingCriteriaList
from peft import PeftModel

from dotenv import load_dotenv
load_dotenv()
login(token=os.getenv('HF_TOKEN'))

# LoRA 어댑터가 올라간 Hugging Face repo
peft_model_id = "poketmon/hyperclovax_lora_3B"

# Base model 먼저 로드
base_model = AutoModelForCausalLM.from_pretrained(
    "naver-hyperclovax/HyperCLOVAX-SEED-Vision-Instruct-3B",
    device_map="auto",
    torch_dtype="auto",
    trust_remote_code=True,  # HyperCLOVA-X 모델은 custom code 필요
)

# Tokenizer는 LoRA repo에서 불러오기
tokenizer = AutoTokenizer.from_pretrained(peft_model_id)

# Base model에 LoRA 어댑터 로드
model = PeftModel.from_pretrained(base_model, peft_model_id)

# KURE-v1 로드
embedding_tokenizer = AutoTokenizer.from_pretrained("nlpai-lab/KURE-v1")
embedding_model = AutoModel.from_pretrained("nlpai-lab/KURE-v1")

def get_embedding(text: str):
    inputs = embedding_tokenizer(text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        outputs = embedding_model(**inputs)
    
    embeddings = outputs.last_hidden_state.mean(dim=1)

    return embeddings[0].tolist()

chroma_client = chromadb.PersistentClient(path="./law_db")

collection = chroma_client.get_or_create_collection(name="laws")

class StopOnTokens(StoppingCriteria):
    def __init__(self, stop_token_ids):
        self.stop_token_ids = stop_token_ids

    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor, **kwargs) -> bool:
        for stop_id in self.stop_token_ids:
            if stop_id in input_ids[0]:
                return True
        return False

def hybrid_search(query_text, top_k=2, title_weight=0.7, content_weight=0.3):
    query_embedding = get_embedding(query_text)
    
    # title 검색
    title_results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["metadatas", "documents", "distances"],
        where={"source_type":"title"}
    )

    # content 검색
    content_results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["metadatas", "documents", "distances"],
        where={"source_type":"law"}
    )

    combined_scores = {}
    combined_docs = {}

    # score 계산 및 title/content 합산
    for results, weight in [(title_results, title_weight), (content_results, content_weight)]:
        docs = results["documents"][0]
        dists = results["distances"][0]
        metas = results["metadatas"][0]
        ids = results["ids"][0]

        for doc, dist, meta, vid in zip(docs, dists, metas, ids):
            similarity = 1 - dist / 2  # cosine distance → similarity
            score = similarity * weight

            if meta.get("source_type") == "title":
                vid = vid.replace('title_', '')
                content_id = meta.get("link_to")
                if content_id:
                    doc_data = collection.get(ids=[content_id])
                    if doc_data["documents"]:
                        doc = doc_data["documents"][0]
            else:
                vid = vid.replace('content_', '')

            combined_scores[vid] = combined_scores.get(vid, 0) + score
            combined_docs[vid] = doc

    # min–max 정규화 (0~1)
    scores = list(combined_scores.values())
    min_s, max_s = min(scores), max(scores)
    for vid in combined_scores:
        combined_scores[vid] = (combined_scores[vid] - min_s) / (max_s - min_s + 1e-8)

    # 정렬
    sorted_results = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
    results = [{"Article_no": vid, "Score": combined_scores[vid], "Content": combined_docs[vid]} 
               for vid, _ in sorted_results[:top_k]]
    return results
    
# 키워드를 추출하는 함수
def extract_keywords(question):
    # 프롬프트 정의
    prompt = "다음 질문에서 법령 키워드만 JSON 배열 형태로 출력하라. 추가 설명 없이 키워드만:\n"
    
    # 프롬프트와 질문 결합
    full_prompt = prompt + question
    
    # 토큰화
    inputs = tokenizer(full_prompt, return_tensors="pt").to(model.device)
    
    stop_ids = tokenizer.encode("")  
    stopping_criteria = StoppingCriteriaList([StopOnTokens(stop_ids)])
    
    # 모델에 입력하여 출력 생성
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=50,
            temperature=0.0,
            do_sample=False,
            stopping_criteria=stopping_criteria,
        )

    raw_result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    cleaned_result = re.sub(rf"^{re.escape(full_prompt)}", "", raw_result).strip()
    keywords = re.findall(r"[가-힣]+", cleaned_result)
    return list(dict.fromkeys(keywords))

# 벡터 검색 후 관련 문서를 추출하는 함수
def retrieve_relevant_documents(keywords):
    documents = []
    seen = set()
    for k in keywords:
        results = hybrid_search(k)
        for r in results:
            doc_str = f"{r['Article_no']}: {r['Content']}"
            if doc_str not in seen:
                documents.append(doc_str)
                seen.add(doc_str)
    return documents

def generate_answer_with_retrieved_docs(question):
    Content_list = retrieve_relevant_documents(extract_keywords(question))
    # 문서들을 하나의 문맥으로 결합
    context = "\n".join([f"문서: {content}" for i, content in enumerate(Content_list)])
    print(context)
    # 프롬프트 작성 (문서 내용을 포함하되 출력에는 포함되지 않게 함)
    prompt = f"""다음 질문에 대해 관련 법령을 참고하여 100자 이내로 답변을 생성하라 법령은 제n조_n항_n~n호 로 구성되어 있다:\n{context}\n질문: {question}\n답변:"""

    # 토큰화
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    # 답변 생성
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=150,  # 필요에 맞게 조정
            temperature=0.7,
            do_sample=False,
            eos_token_id=tokenizer.eos_token_id
        )
    
    # 결과 디코딩
    answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    return answer.split('답변: ')[-1]

if __name__ == "__main__":
    while True:
        answer = generate_answer_with_retrieved_docs(input('질문: '))
        print("="*100)
        print(answer)
        print()